import { averageFingerprint, cosineSimilarity, ACOUSTIC_PROFILE_BINS } from './acoustic.js';

const DB_NAME = 'groundtruth-acoustic';
const STORE_NAME = 'offline-data';
const CALIBRATION_KEY = 'calibration';
const HISTORY_KEY = 'history';
const FALLBACK_PREFIX = 'groundtruth-acoustic-v1:';
const REQUIRED_SAMPLES = 3;
const CONFIDENCE_GAP = 0;
const FINGERPRINT_VERSION = 6;
const blankCalibration = () => ({ version: 6, fingerprintVersion: FINGERPRINT_VERSION, fullSamples: [], emptySamples: [], fullAverage: null, emptyAverage: null, createdAt: null, updatedAt: null, notes: '' });
const LOG_PREFIX = '[GroundTruth Acoustic]';
const log = (event, details = {}) => console.log(`${LOG_PREFIX} ${event}`, details);
const warn = (event, details = {}) => console.warn(`${LOG_PREFIX} ${event}`, details);
const logError = (event, error) => console.error(`${LOG_PREFIX} ${event}`, error);

function isProfile(profile) {
  return Array.isArray(profile) && profile.length === ACOUSTIC_PROFILE_BINS && profile.every((value) => typeof value === 'number' && Number.isFinite(value));
}
export function hasRequiredSamples(calibration) {
  return Boolean(calibration) && calibration.fullSamples.length >= REQUIRED_SAMPLES && calibration.emptySamples.length >= REQUIRED_SAMPLES;
}
export function calibrationQuality(calibration) {
  if (!hasRequiredSamples(calibration)) {
    log('calibration-incomplete', { fullSamples: calibration?.fullSamples?.length || 0, emptySamples: calibration?.emptySamples?.length || 0, requiredSamples: REQUIRED_SAMPLES });
    return { ready: false, weakestMargin: 0, message: 'Save three Full and three Empty references first.' };
  }
  const { fullSamples, emptySamples, fullAverage, emptyAverage } = calibration;
  const margins = [
    ...fullSamples.map((sample) => cosineSimilarity(sample, fullAverage) - cosineSimilarity(sample, emptyAverage)),
    ...emptySamples.map((sample) => cosineSimilarity(sample, emptyAverage) - cosineSimilarity(sample, fullAverage)),
  ];
  const weakestMargin = Math.min(...margins);
  // Each saved reference must be at least 1.5 cosine points closer to its own
  // class average. Overlapping references are not safe for live prediction.
  const ready = weakestMargin >= 0.015;
  const result = {
    ready,
    weakestMargin,
    message: ready
      ? 'Reference classes are sufficiently separated for a live comparison.'
      : 'Full and Empty references overlap. Reset and recapture with the phone fixed in one position and the same media volume.',
  };
  (ready ? log : warn)('calibration-quality', { fullSamples: fullSamples.length, emptySamples: emptySamples.length, weakestMargin, ready });
  return result;
}
function sanitizeCalibration(value) {
  // Fingerprint formats are intentionally versioned. Profiles from a different
  // format cannot be compared safely and require fresh calibration.
  if (!value || typeof value !== 'object' || value.fingerprintVersion !== FINGERPRINT_VERSION) return blankCalibration();
  const fullSamples = Array.isArray(value.fullSamples) ? value.fullSamples.filter(isProfile) : [];
  const emptySamples = Array.isArray(value.emptySamples) ? value.emptySamples.filter(isProfile) : [];
  return { ...blankCalibration(), fullSamples, emptySamples, fullAverage: averageFingerprint(fullSamples), emptyAverage: averageFingerprint(emptySamples), createdAt: typeof value.createdAt === 'string' ? value.createdAt : null, updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null, notes: typeof value.notes === 'string' ? value.notes.slice(0, 1000) : '' };
}
function openDatabase() {
  if (!('indexedDB' in window)) return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}
async function read(key, fallback) {
  const database = await openDatabase();
  if (!database) { try { return JSON.parse(window.localStorage.getItem(FALLBACK_PREFIX + key) || 'null') ?? fallback; } catch { return fallback; } }
  return new Promise((resolve) => { const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key); request.onsuccess = () => resolve(request.result ?? fallback); request.onerror = () => resolve(fallback); });
}
async function write(key, value) {
  const database = await openDatabase();
  if (!database) { window.localStorage.setItem(FALLBACK_PREFIX + key, JSON.stringify(value)); return; }
  await new Promise((resolve, reject) => { const request = database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(value, key); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
}
export async function getCalibration() {
  const calibration = sanitizeCalibration(await read(CALIBRATION_KEY, blankCalibration()));
  log('calibration-loaded', { fingerprintVersion: calibration.fingerprintVersion, fullSamples: calibration.fullSamples.length, emptySamples: calibration.emptySamples.length });
  return calibration;
}
export function isCalibrated(calibration) { return calibrationQuality(calibration).ready; }
export async function addCalibrationSample(label, fingerprint, notes = '') {
  if (!['full', 'empty'].includes(label) || !isProfile(fingerprint)) {
    const error = new Error('Invalid calibration sample.');
    logError('calibration-sample-rejected', error);
    throw error;
  }
  const calibration = await getCalibration(); const samplesKey = label === 'full' ? 'fullSamples' : 'emptySamples';
  if (calibration[samplesKey].length >= REQUIRED_SAMPLES) {
    const error = new Error(`All ${REQUIRED_SAMPLES} ${label} references are already saved. Reset calibration to replace them.`);
    warn('calibration-sample-limit', { label, requiredSamples: REQUIRED_SAMPLES });
    throw error;
  }
  calibration[samplesKey] = [...calibration[samplesKey], fingerprint];
  calibration.fullAverage = averageFingerprint(calibration.fullSamples); calibration.emptyAverage = averageFingerprint(calibration.emptySamples);
  calibration.notes = notes.slice(0, 1000); calibration.createdAt ||= new Date().toISOString(); calibration.updatedAt = new Date().toISOString();
  await write(CALIBRATION_KEY, calibration);
  log('calibration-sample-saved', { label, count: calibration[samplesKey].length, requiredSamples: REQUIRED_SAMPLES, fingerprintBins: fingerprint.length });
  return calibration;
}
export async function resetCalibration() {
  const calibration = blankCalibration();
  await write(CALIBRATION_KEY, calibration);
  warn('calibration-reset', { fingerprintVersion: FINGERPRINT_VERSION });
  return calibration;
}
export function classifyFingerprint(fingerprint, calibration) {
  if (!isCalibrated(calibration) || !isProfile(fingerprint)) {
    const calibrationMessage = calibrationQuality(calibration).message;
    warn('classification-recheck', { fingerprintValid: isProfile(fingerprint), calibrationMessage });
    return { prediction: 'recheck', fullSimilarity: 0, emptySimilarity: 0, gap: 0, confidence: 0, calibrationMessage, fillPercentage: null, fillEstimateMethod: null, withheldReason: calibrationMessage };
  }
  const fullSimilarity = cosineSimilarity(fingerprint, calibration.fullAverage);
  const emptySimilarity = cosineSimilarity(fingerprint, calibration.emptyAverage);
  const gap = Math.abs(fullSimilarity - emptySimilarity);
  // Choose the closer reference average. Recheck is reserved for invalid or
  // insufficient calibration rather than a fixed similarity-gap rule.
  const prediction = fullSimilarity > emptySimilarity ? 'full' : 'empty';
  const confidence = Math.min(99, Math.max(1, Math.round(gap * 10000)));
  // Two-anchor interpolation: project the capture onto the line between the
  // known-Full and known-Empty fingerprints and read off a relative position.
  // This is a directional estimate between two local anchors, not a measurement.
  const anchorSum = fullSimilarity + emptySimilarity;
  const fillPercentage = anchorSum > 0
    ? Math.max(0, Math.min(100, Math.round((100 * fullSimilarity) / anchorSum)))
    : null;
  const fillEstimateMethod = 'two-anchor interpolation (cosine, local Full/Empty references)';
  log('classification-complete', { prediction, fullSimilarity, emptySimilarity, gap, confidence, fillPercentage });
  return { prediction, fullSimilarity, emptySimilarity, gap, confidence, fillPercentage, fillEstimateMethod, withheldReason: null, method: fillEstimateMethod };
}
export async function getAcousticHistory() { const history = await read(HISTORY_KEY, []); return Array.isArray(history) ? history.filter((item) => item && typeof item === 'object') : []; }
export async function saveAcousticTest(result) {
  const history = await getAcousticHistory(); const entry = { id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, createdAt: new Date().toISOString(), actualLabel: null, ...result };
  await write(HISTORY_KEY, [entry, ...history].slice(0, 100)); return entry;
}
export async function setActualLabel(id, actualLabel) {
  if (!['full', 'empty'].includes(actualLabel)) throw new Error('Choose Full or Empty.');
  const history = await getAcousticHistory(); const next = history.map((entry) => entry.id === id ? { ...entry, actualLabel } : entry); await write(HISTORY_KEY, next); return next.find((entry) => entry.id === id);
}
export function validationSummary(history) { const labelled = history.filter((entry) => ['full', 'empty'].includes(entry.actualLabel)); const correct = labelled.filter((entry) => entry.prediction === entry.actualLabel).length; return { labelled: labelled.length, correct, accuracy: labelled.length ? Math.round((correct / labelled.length) * 100) : null }; }

// Signal-level guardrail. A capture that is effectively silent, or loud enough
// to clip, cannot support a percentage claim even when the calibration is sound.
// Thresholds are deliberately wide: they reject unusable captures, not noisy ones.
export const MIN_CAPTURE_DB = -70;
export const MAX_CAPTURE_DB = -14;
export function guardAcousticEstimate(comparison, averageEnergy) {
  if (!comparison || comparison.fillPercentage === null) return comparison;
  const level = Number(averageEnergy);
  if (!Number.isFinite(level) || level < MIN_CAPTURE_DB) {
    warn('estimate-withheld-weak-signal', { averageEnergy, minCaptureDb: MIN_CAPTURE_DB });
    return { ...comparison, fillPercentage: null, fillEstimateMethod: null, withheldReason: 'The captured signal was too weak to estimate a fill level. Move the phone closer to the container and run the sweep again.' };
  }
  if (level > MAX_CAPTURE_DB) {
    warn('estimate-withheld-clipping', { averageEnergy, maxCaptureDb: MAX_CAPTURE_DB });
    return { ...comparison, fillPercentage: null, fillEstimateMethod: null, withheldReason: 'The captured signal was loud enough to clip, so the response shape is unreliable. Lower the media volume and run the sweep again.' };
  }
  return comparison;
}
export async function exportCalibration() { return JSON.stringify({ kind: 'groundtruth-acoustic-calibration', exportedAt: new Date().toISOString(), calibration: await getCalibration() }, null, 2); }
export async function importCalibration(serialized) {
  let parsed; try { parsed = JSON.parse(serialized); } catch { throw new Error('That backup is not valid JSON.'); }
  if (parsed?.kind !== 'groundtruth-acoustic-calibration') throw new Error('This file is not a GroundTruth calibration backup.');
  const calibration = sanitizeCalibration(parsed.calibration); if (!calibration.fullSamples.length && !calibration.emptySamples.length) throw new Error('This backup has no valid reference profiles.');
  calibration.updatedAt = new Date().toISOString(); await write(CALIBRATION_KEY, calibration); return calibration;
}
export { REQUIRED_SAMPLES, CONFIDENCE_GAP, FINGERPRINT_VERSION };
