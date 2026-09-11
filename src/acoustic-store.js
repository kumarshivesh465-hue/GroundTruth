import { averageFingerprint, cosineSimilarity, ACOUSTIC_PROFILE_BINS } from './acoustic.js';

const DB_NAME = 'groundtruth-acoustic';
const STORE_NAME = 'offline-data';
const CALIBRATION_KEY = 'calibration';
const HISTORY_KEY = 'history';
const FALLBACK_PREFIX = 'groundtruth-acoustic-v1:';
const REQUIRED_SAMPLES = 3;
// Cosine scores for phone recordings often live very close to 1. A fixed 2.5%
// gap throws away every result when a particular phone's two calibrated
// centroids are themselves close together. This is the absolute lower bound;
// the actual decision threshold is derived from the saved class separation.
const CONFIDENCE_GAP = 0.001;
const FINGERPRINT_VERSION = 4;
const blankCalibration = () => ({ version: 4, fingerprintVersion: FINGERPRINT_VERSION, fullSamples: [], emptySamples: [], fullAverage: null, emptyAverage: null, createdAt: null, updatedAt: null, notes: '' });

function isProfile(profile) {
  return Array.isArray(profile) && profile.length === ACOUSTIC_PROFILE_BINS && profile.every((value) => typeof value === 'number' && Number.isFinite(value));
}
function sanitizeCalibration(value) {
  // Older fingerprints used a different frequency-profile method. Mixing
  // reference versions would make class scores meaningless, so a fresh set of
  // three Full and three Empty references is required after this update.
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
export async function getCalibration() { return sanitizeCalibration(await read(CALIBRATION_KEY, blankCalibration())); }
export function isCalibrated(calibration) { return calibration.fullSamples.length >= REQUIRED_SAMPLES && calibration.emptySamples.length >= REQUIRED_SAMPLES; }
export async function addCalibrationSample(label, fingerprint, notes = '') {
  if (!['full', 'empty'].includes(label) || !isProfile(fingerprint)) throw new Error('Invalid calibration sample.');
  const calibration = await getCalibration(); const samplesKey = label === 'full' ? 'fullSamples' : 'emptySamples';
  if (calibration[samplesKey].length >= REQUIRED_SAMPLES) throw new Error(`All ${REQUIRED_SAMPLES} ${label} references are already saved. Reset calibration to replace them.`);
  calibration[samplesKey] = [...calibration[samplesKey], fingerprint];
  calibration.fullAverage = averageFingerprint(calibration.fullSamples); calibration.emptyAverage = averageFingerprint(calibration.emptySamples);
  calibration.notes = notes.slice(0, 1000); calibration.createdAt ||= new Date().toISOString(); calibration.updatedAt = new Date().toISOString();
  await write(CALIBRATION_KEY, calibration); return calibration;
}
export async function resetCalibration() { const calibration = blankCalibration(); await write(CALIBRATION_KEY, calibration); return calibration; }
export function classifyFingerprint(fingerprint, calibration) {
  if (!isCalibrated(calibration) || !isProfile(fingerprint)) return { prediction: 'recheck', fullSimilarity: 0, emptySimilarity: 0, gap: 0, confidence: 0 };
  const fullSimilarity = cosineSimilarity(fingerprint, calibration.fullAverage);
  const emptySimilarity = cosineSimilarity(fingerprint, calibration.emptyAverage);
  const gap = Math.abs(fullSimilarity - emptySimilarity);
  const referenceSeparation = Math.max(0, 1 - cosineSimilarity(calibration.fullAverage, calibration.emptyAverage));
  // A reference pair that is far apart earns a stricter threshold. Closely
  // clustered phone profiles can still produce a directional result, but its
  // confidence stays low because the reference set itself is weakly separated.
  const decisionThreshold = Math.max(CONFIDENCE_GAP, Math.min(0.025, referenceSeparation * 0.15));
  const prediction = gap >= decisionThreshold ? (fullSimilarity > emptySimilarity ? 'full' : 'empty') : 'recheck';
  const profileQuality = Math.min(1, referenceSeparation / 0.025);
  const confidence = Math.min(100, Math.round((gap / decisionThreshold) * 100 * profileQuality));
  return { prediction, fullSimilarity, emptySimilarity, gap, confidence, decisionThreshold, referenceSeparation };
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
export async function exportCalibration() { return JSON.stringify({ kind: 'groundtruth-acoustic-calibration', exportedAt: new Date().toISOString(), calibration: await getCalibration() }, null, 2); }
export async function importCalibration(serialized) {
  let parsed; try { parsed = JSON.parse(serialized); } catch { throw new Error('That backup is not valid JSON.'); }
  if (parsed?.kind !== 'groundtruth-acoustic-calibration') throw new Error('This file is not a GroundTruth calibration backup.');
  const calibration = sanitizeCalibration(parsed.calibration); if (!calibration.fullSamples.length && !calibration.emptySamples.length) throw new Error('This backup has no valid reference profiles.');
  calibration.updatedAt = new Date().toISOString(); await write(CALIBRATION_KEY, calibration); return calibration;
}
export { REQUIRED_SAMPLES, CONFIDENCE_GAP, FINGERPRINT_VERSION };
