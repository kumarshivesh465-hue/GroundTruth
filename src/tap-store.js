// Tap-response calibration store.
//
// Unlike the tone-sweep calibration (which is fixed to two anchors, Full and
// Empty), this supports any number of labelled levels, because the tap test can
// plausibly separate intermediate fill states such as 50% and 80%. Each label
// carries a nominal fill percentage so results can be reported as a nearest
// calibrated level rather than an invented precise number.

import { MIN_TAP_SNR_DB, TAP_BANDS, shapeSimilarity } from './tap.js';
import {
  REFERENCE_PROFILE_ACTIVE,
  buildReferenceCalibration,
  buildReferenceHistory,
} from './datatap.js';

const DB_NAME = 'groundtruth-tap';
const STORE_NAME = 'offline-data';
const CALIBRATION_KEY = 'calibration';
const HISTORY_KEY = 'history';
const FALLBACK_PREFIX = 'groundtruth-tap-v1:';
const FINGERPRINT_VERSION = 1;
const REQUIRED_SAMPLES = 3;

const LOG_PREFIX = '[GroundTruth Tap]';
const log = (event, details = {}) => console.log(`${LOG_PREFIX} ${event}`, details);
const warn = (event, details = {}) => console.warn(`${LOG_PREFIX} ${event}`, details);

export const DEFAULT_LEVELS = [
  { id: 'empty', name: 'Empty', fillPercent: 0 },
  { id: 'half', name: 'Half', fillPercent: 50 },
  { id: 'high', name: 'Mostly full', fillPercent: 80 },
  { id: 'full', name: 'Full', fillPercent: 100 },
];

/**
 * How the container is struck. This matters more than any software setting:
 * the impact IS the excitation signal, so an uncontrolled strike (a fingernail,
 * a bare hand, a varying distance) injects more variance than the fill level does.
 * A repeatable striker removes that whole class of error.
 */
export const STRIKER_OPTIONS = [
  {
    id: 'hand-fixed',
    name: 'Hand, fixed grip',
    reproducible: false,
    note: 'Convenient but the least repeatable. Only valid if you strike the same spot with the same force every time.',
  },
  {
    id: 'metal-rod',
    name: 'Small metal rod or bolt',
    reproducible: true,
    note: 'Mass-produced striker with consistent mass and hardness. Cheap, and far more repeatable than a hand.',
  },
  {
    id: 'actuator',
    name: 'Solenoid / weighted-pendulum striker',
    reproducible: true,
    note: 'Fixed mass released from a fixed height. This is what makes the reading comparable across sites and operators.',
  },
];

/**
 * What the operator is being asked to verify. The app never claims to measure
 * fill level: it screens for a likely discrepancy and hands off to a human.
 */
export const SCREENING_INTENTS = [
  { id: 'gauge-crosscheck', name: 'Cross-check an installed gauge', note: 'Flag whether a reading is worth trusting, without opening the vessel.' },
  { id: 'manifold-bank', name: 'Manifold bank cylinder', note: 'For cylinders that cannot be weighed without shutting the line down.' },
  { id: 'uninstrumented', name: 'Vessel with no gauge', note: 'Portable or small bulk vessels with no installed instrumentation.' },
  { id: 'asset-health', name: 'Asset health / damage screen', note: 'Look for an unexpected change in how a vessel rings.' },
];

const blankCalibration = () => ({ version: 1, fingerprintVersion: FINGERPRINT_VERSION, levels: {}, notes: '', createdAt: null, updatedAt: null });

function isFeatureSet(value) {
  return Boolean(value)
    && Array.isArray(value.fingerprint) && value.fingerprint.length === TAP_BANDS.length
    && value.fingerprint.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
    && typeof value.features?.decayMs === 'number' && Number.isFinite(value.features.decayMs)
    && typeof value.features?.centroidHz === 'number' && Number.isFinite(value.features.centroidHz);
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
  return new Promise((resolve) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result ?? fallback);
    request.onerror = () => resolve(fallback);
  });
}

async function write(key, value) {
  const database = await openDatabase();
  if (!database) { window.localStorage.setItem(FALLBACK_PREFIX + key, JSON.stringify(value)); return; }
  await new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function sanitize(value) {
  if (!value || typeof value !== 'object' || value.fingerprintVersion !== FINGERPRINT_VERSION) return blankCalibration();
  const levels = {};
  Object.entries(value.levels || {}).forEach(([id, entry]) => {
    const samples = Array.isArray(entry?.samples) ? entry.samples.filter(isFeatureSet) : [];
    if (!samples.length) return;
    levels[id] = {
      id,
      name: typeof entry.name === 'string' ? entry.name.slice(0, 40) : id,
      fillPercent: Number.isFinite(entry.fillPercent) ? Math.max(0, Math.min(100, Math.round(entry.fillPercent))) : null,
      samples,
      average: averageFeatureSet(samples),
    };
  });
  return { ...blankCalibration(), levels, notes: typeof value.notes === 'string' ? value.notes.slice(0, 1000) : '', createdAt: value.createdAt || null, updatedAt: value.updatedAt || null };
}

function mean(values) { return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length); }

/** Average several tap captures into one reference centroid. */
export function averageFeatureSet(samples) {
  if (!samples.length) return null;
  const bins = TAP_BANDS.length;
  const fingerprint = Array(bins).fill(0);
  samples.forEach((sample) => sample.fingerprint.forEach((value, index) => { fingerprint[index] += value / samples.length; }));
  return {
    fingerprint,
    decayMs: mean(samples.map((sample) => sample.features.decayMs)),
    centroidHz: mean(samples.map((sample) => sample.features.centroidHz)),
    zcr: mean(samples.map((sample) => sample.features.zcr)),
    peakDb: mean(samples.map((sample) => sample.features.peakDb)),
  };
}

export async function getTapCalibration() {
  if (REFERENCE_PROFILE_ACTIVE) return sanitize(buildReferenceCalibration());
  const calibration = sanitize(await read(CALIBRATION_KEY, blankCalibration()));
  log('tap-calibration-loaded', { levels: Object.keys(calibration.levels), sampleCounts: Object.fromEntries(Object.entries(calibration.levels).map(([id, entry]) => [id, entry.samples.length])) });
  return calibration;
}

export function hasRequiredTapSamples(calibration, levelId) {
  return (calibration?.levels?.[levelId]?.samples?.length || 0) >= REQUIRED_SAMPLES;
}

export function calibratedLevelIds(calibration) {
  return Object.values(calibration?.levels || {}).filter((entry) => entry.samples.length >= REQUIRED_SAMPLES).map((entry) => entry.id);
}

/**
 * Strike quality, reported the same way everywhere. The operator needs to know
 * a strike was bad at capture time, not after saving three of them and finding
 * the level will not separate.
 */
export function tapQuality(featureSet) {
  const { snrDb, clipped, decayMs, peakDb } = featureSet?.features || {};
  if (clipped) return { ok: false, grade: 'bad', message: 'Clipped - move the phone further back or strike more gently.' };
  if (!Number.isFinite(snrDb) || snrDb < MIN_TAP_SNR_DB) {
    return { ok: false, grade: 'bad', message: `Too quiet above the room noise${Number.isFinite(snrDb) ? ` (${snrDb.toFixed(0)} dB, need ${MIN_TAP_SNR_DB})` : ''}. Strike firmer or move closer.` };
  }
  if (Number.isFinite(decayMs) && decayMs >= 1200) {
    return { ok: false, grade: 'warn', message: `Very long ring (${Math.round(decayMs)} ms) - check the strike hit the container and not a table or hand.` };
  }
  if (Number.isFinite(decayMs) && decayMs < 12) {
    return { ok: false, grade: 'warn', message: `Very short ring (${Math.round(decayMs)} ms) - the strike may have been muffled.` };
  }
  if (snrDb < MIN_TAP_SNR_DB + 8) return { ok: true, grade: 'marginal', message: `Usable, but a firmer strike would be cleaner (${snrDb.toFixed(0)} dB above noise).` };
  return { ok: true, grade: 'good', message: `Clean strike (${snrDb.toFixed(0)} dB above noise, ${Number.isFinite(peakDb) ? peakDb.toFixed(0) : '?'} dB peak).` };
}

export function isTapCalibrated(calibration) {
  // Two distinct levels is the minimum for any comparison to mean anything.
  return calibratedLevelIds(calibration).length >= 2;
}

export async function addTapSample(level, featureSet, notes = '') {
  if (REFERENCE_PROFILE_ACTIVE) return getTapCalibration();
  if (!level?.id) throw new Error('Choose which known level you are recording.');
  if (!isFeatureSet(featureSet)) throw new Error('That tap capture was not usable and was not saved.');
  const calibration = await getTapCalibration();

  // Mixing strikers inside one level would silently blend two different excitation
  // signals. Refuse rather than produce a reference average that means nothing.
  const striker = featureSet.features?.strikerId || null;
  const existingStriker = calibration.levels[level.id]?.strikerId || null;
  if (existingStriker && striker && existingStriker !== striker) {
    throw new Error(`This level was calibrated with "${existingStriker}". Keep one striker per level, or reset that level and recapture.`);
  }

  const existing = calibration.levels[level.id] || { id: level.id, name: level.name, fillPercent: level.fillPercent, samples: [] };
  if (existing.samples.length >= REQUIRED_SAMPLES) {
    throw new Error(`All ${REQUIRED_SAMPLES} ${existing.name} tap references are already saved. Reset to replace them.`);
  }
  const samples = [...existing.samples, featureSet];
  calibration.levels = {
    ...calibration.levels,
    [level.id]: { ...existing, name: level.name ?? existing.name, fillPercent: level.fillPercent ?? existing.fillPercent, strikerId: striker || existingStriker, samples, average: averageFeatureSet(samples) },
  };
  calibration.notes = String(notes || '').slice(0, 1000);
  calibration.createdAt ||= new Date().toISOString();
  calibration.updatedAt = new Date().toISOString();
  await write(CALIBRATION_KEY, calibration);
  log('tap-sample-saved', { level: level.id, count: samples.length, requiredSamples: REQUIRED_SAMPLES });
  return calibration;
}

export async function resetTapCalibration() {
  if (REFERENCE_PROFILE_ACTIVE) return getTapCalibration();
  const calibration = blankCalibration();
  await write(CALIBRATION_KEY, calibration);
  warn('tap-calibration-reset');
  return calibration;
}

export async function removeTapLevel(calibration, levelId) {
  const next = sanitize({ ...calibration });
  delete next.levels[levelId];
  next.updatedAt = new Date().toISOString();
  await write(CALIBRATION_KEY, next);
  return next;
}

/** Relative importance of each feature when scoring a match. */
const WEIGHTS = { decay: 1.0, centroid: 0.7, shape: 1.2 };

function scoreAgainst(reference, sample) {
  const decayDelta = Math.abs(reference.decayMs - sample.features.decayMs) / Math.max(40, reference.decayMs);
  const centroidDelta = Math.abs(reference.centroidHz - sample.features.centroidHz) / Math.max(200, reference.centroidHz);
  const shapeScore = shapeSimilarity(sample.fingerprint, reference.fingerprint);
  // Lower distance is better; shape similarity is inverted into a distance.
  const distance = (WEIGHTS.decay * decayDelta) + (WEIGHTS.centroid * centroidDelta) + (WEIGHTS.shape * (1 - shapeScore));
  return { distance, decayDelta, centroidDelta, shapeScore };
}

/**
 * Classify a tap against every calibrated level.
 *
 * Reports the nearest calibrated level plus a graded estimate, and refuses to
 * decide when the two closest levels are too near each other to separate.
 */
export function classifyTap(featureSet, calibration) {
  const levels = Object.values(calibration?.levels || {}).filter((entry) => entry.samples.length >= REQUIRED_SAMPLES && entry.average);
  if (!isFeatureSet(featureSet) || levels.length < 2) {
    const message = levels.length < 2
      ? 'Save at least two different levels with three tap references each before checking.'
      : 'That tap capture was not usable. Tap the container again, a little firmer.';
    warn('tap-classification-recheck', { usableLevels: levels.length });
    return { prediction: 'recheck', nearestLevelId: null, estimatePercent: null, scores: [], margin: 0, message };
  }

  const scores = levels
    .map((entry) => ({ id: entry.id, name: entry.name, fillPercent: entry.fillPercent, ...scoreAgainst(entry.average, featureSet) }))
    .sort((a, b) => a.distance - b.distance);
  const best = scores[0];
  const runnerUp = scores[1];
  const margin = runnerUp.distance - best.distance;

  // Quality gates. SNR is the right measure here, not absolute level: it compares
  // the strike against this room's own noise floor, so a quiet phone in a quiet
  // room is not penalised while a weak strike in a noisy one is.
  const { snrDb, clipped, levelDb, peakDb } = featureSet.features;
  if (clipped) {
    return { prediction: 'recheck', nearestLevelId: null, estimatePercent: null, scores, margin, message: 'That strike clipped the microphone, so its decay is an artefact of the limiter. Move the phone further back or strike more gently.' };
  }
  if (Number.isFinite(snrDb) && snrDb < MIN_TAP_SNR_DB) {
    return { prediction: 'recheck', nearestLevelId: null, estimatePercent: null, scores, margin, message: `That strike was only ${snrDb.toFixed(0)} dB above this room's noise floor (need ${MIN_TAP_SNR_DB} dB). Strike firmer, move the phone closer, or find a quieter spot.` };
  }
  const level = Number.isFinite(levelDb) ? levelDb : peakDb;
  if (!Number.isFinite(level) || level < -60) {
    return { prediction: 'recheck', nearestLevelId: null, estimatePercent: null, scores, margin, message: 'The strike was too quiet to analyse. Strike a little firmer and closer to the phone.' };
  }

  // Require a clear winner relative to the runner-up. A fixed distance threshold
  // would be scale-dependent, so the margin is expressed as a ratio: the winner
  // must be meaningfully closer than the second-placed level.
  const runnerUpDistance = Math.max(1e-6, runnerUp.distance);
  const marginRatio = margin / runnerUpDistance;
  const ambiguous = marginRatio < 0.15 || margin < 0.05;
  if (ambiguous) {
    return {
      prediction: 'recheck',
      nearestLevelId: best.id,
      nearestLevelName: best.name,
      estimatePercent: null,
      scores,
      margin,
      marginRatio,
      message: `This tap sits between "${best.name}" and "${runnerUp.name}" and cannot be placed reliably. Tap again, or add a calibrated level between them.`,
    };
  }

  return {
    prediction: 'level',
    nearestLevelId: best.id,
    nearestLevelName: best.name || best.id,
    estimatePercent: Number.isFinite(best.fillPercent) ? best.fillPercent : null,
    scores,
    margin,
    marginRatio,
    message: `Closest to the calibrated "${best.name || best.id}" reference.`,
  };
}

export async function getTapHistory() {
  if (REFERENCE_PROFILE_ACTIVE) return buildReferenceHistory();
  const history = await read(HISTORY_KEY, []);
  return Array.isArray(history) ? history.filter((entry) => entry && typeof entry === 'object') : [];
}


/**
 * Reshape saved tap results into the plain {createdAt, percent} series the
 * consumption module consumes. Only confident level predictions carry a usable
 * percentage; a "recheck" result has no number and must never become a data
 * point, or a bad capture would silently bend the trend.
 */
export function tapHistoryAsReadings(history, vesselId = null) {
  return (Array.isArray(history) ? history : [])
    .filter((entry) => entry
      && entry.prediction === 'level'
      && Number.isFinite(entry.estimatePercent)
      && entry.createdAt
      && (!vesselId || (entry.vesselId || null) === vesselId))
    .map((entry) => ({
      id: entry.id,
      createdAt: entry.createdAt,
      percent: Math.max(0, Math.min(100, entry.estimatePercent)),
      levelId: entry.nearestLevelId || null,
    }))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

/**
 * Contamination / damage screen.
 *
 * A clean vessel rings the same way every time. A shape (mean-centred spectral
 * fingerprint) that drifts away from that vessel's own earliest readings, while
 * the fill level is comparable, points to changed contents or a changed shell
 * condition: water, oil, rust, or particulate in the liquid. This compares a
 * vessel against its own history, never against another vessel, because two
 * different cylinders legitimately ring differently.
 */
export function detectShapeDrift(history, vesselId = null, threshold = 0.6) {
  const series = (Array.isArray(history) ? history : [])
    .filter((entry) => entry
      && entry.fingerprint
      && entry.createdAt
      && entry.prediction === 'level'
      && entry.nearestLevelId
      && (!vesselId || (entry.vesselId || null) === vesselId))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  if (series.length < 4) {
    return { status: 'baseline-pending', reason: 'At least four same-vessel captures at a known level are needed before a shape baseline exists.', compared: series.length };
  }

  // The ring legitimately changes with fill level, so a draining vessel would
  // look like drift if the newest reading were compared against the oldest at a
  // different level. Each reading is therefore compared only against earlier
  // readings recorded at the SAME nearest level, which is what makes a genuine
  // contents or shell change visible.
  const latest = series[series.length - 1];
  const peers = series.slice(0, series.length - 1).filter((entry) => entry.nearestLevelId === latest.nearestLevelId);
  if (peers.length < 2) {
    return {
      status: 'baseline-pending',
      reason: `No comparable-level baseline yet: this is the first or second "${latest.nearestLevelName || latest.nearestLevelId}" capture for this vessel. Recur at the same level before a shape comparison means anything.`,
      compared: peers.length,
    };
  }

  // Use the closest peers in time: a sound vessel drifts slowly at most, so the
  // nearest-in-time same-level captures are the honest comparison.
  const nearestPeers = peers.slice(-3);
  const similarities = nearestPeers.map((entry) => shapeSimilarity(latest.fingerprint, entry.fingerprint));
  const best = Math.max(...similarities);
  if (best < threshold) {
    warn('tap-shape-drift-flagged', { similarity: Number(best.toFixed(3)), compared: similarities.length, level: latest.nearestLevelId });
    return {
      status: 'drift',
      similarity: best,
      threshold,
      compared: similarities.length,
      level: latest.nearestLevelId,
      reason: `At the same level ("${latest.nearestLevelName || latest.nearestLevelId}"), this vessel rings differently from its own earlier captures (shape similarity ${best.toFixed(2)} against a ${threshold} threshold). That can indicate a change in contents or shell condition. Flag for a human check; it is not proof.`,
    };
  }
  return {
    status: 'stable',
    similarity: best,
    threshold,
    compared: similarities.length,
    level: latest.nearestLevelId,
    reason: `The ring shape still matches this vessel's own earlier captures at the same level ("${latest.nearestLevelName || latest.nearestLevelId}").`,
  };
}

export async function saveTapTest(result) {
  if (REFERENCE_PROFILE_ACTIVE) {
    return { ...result, id: `reference-${Date.now()}`, createdAt: new Date().toISOString(), actualLabel: null };
  }
  const history = await getTapHistory();
  const entry = { id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, createdAt: new Date().toISOString(), actualLabel: null, ...result };
  await write(HISTORY_KEY, [entry, ...history].slice(0, 100));
  return entry;
}

export async function setTapActualLabel(id, actualLabel) {
  if (!actualLabel) throw new Error('Choose the actual known level.');
  const history = await getTapHistory();
  const next = history.map((entry) => (entry.id === id ? { ...entry, actualLabel } : entry));
  await write(HISTORY_KEY, next);
  return next.find((entry) => entry.id === id);
}

export function tapValidationSummary(history) {
  const labelled = history.filter((entry) => entry.actualLabel && entry.prediction === 'level');
  const correct = labelled.filter((entry) => entry.nearestLevelId === entry.actualLabel).length;
  return { labelled: labelled.length, correct, accuracy: labelled.length ? Math.round((correct / labelled.length) * 100) : null };
}

export function exportTapCalibration(calibration) {
  return JSON.stringify({ kind: 'groundtruth-tap-calibration', exportedAt: new Date().toISOString(), fingerprintVersion: FINGERPRINT_VERSION, calibration }, null, 2);
}

export async function importTapCalibration(serialized) {
  if (REFERENCE_PROFILE_ACTIVE) return getTapCalibration();
  let parsed;
  try { parsed = JSON.parse(serialized); } catch { throw new Error('That backup is not valid JSON.'); }
  if (parsed?.kind !== 'groundtruth-tap-calibration') throw new Error('This file is not a GroundTruth tap calibration backup.');
  const calibration = sanitize(parsed.calibration);
  if (!Object.keys(calibration.levels).length) throw new Error('This backup has no valid tap references.');
  calibration.updatedAt = new Date().toISOString();
  await write(CALIBRATION_KEY, calibration);
  return calibration;
}

export { REQUIRED_SAMPLES, FINGERPRINT_VERSION };
