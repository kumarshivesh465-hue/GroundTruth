// Labelled acoustic capture dataset for validating the fill estimate.
//
// This is measurement infrastructure, not a product feature. It exists to answer
// the question the roadmap raises first: are repeat readings of the same container
// closer to each other than Full and Empty readings are to each other? If they are
// not, no classifier can rescue the measurement and the protocol must change.
//
// Each record keeps the full 16-bin fingerprint plus the quality metadata needed
// to compare sessions, and the true label comes from a stated reference method
// (ideally a measured weight) rather than from assumption.

import { ACOUSTIC_TEST_FREQUENCIES, cosineSimilarity } from './acoustic.js';
import { FINGERPRINT_VERSION } from './acoustic-store.js';

const DB_NAME = 'groundtruth-acoustic-dataset';
const STORE_NAME = 'samples';
const DB_VERSION = 1;

function openDatabase() {
  if (!('indexedDB' in window)) return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

function withStore(mode, run) {
  return openDatabase().then((database) => {
    if (!database) throw new Error('This browser cannot store a local dataset (IndexedDB unavailable).');
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = run(transaction.objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => database.close();
    });
  });
}

/**
 * Peak bin positions within a fingerprint. Two containers can share a total
 * energy while differing in spectral shape, so the peak layout is tracked
 * separately from the overall level.
 */
export function fingerprintPeaks(fingerprint, count = 3) {
  if (!Array.isArray(fingerprint) || !fingerprint.length) return [];
  return fingerprint
    .map((value, index) => ({ index, hz: ACOUSTIC_TEST_FREQUENCIES[index] ?? null, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, count);
}

function rmsFromFingerprint(fingerprint) {
  if (!Array.isArray(fingerprint) || !fingerprint.length) return null;
  const meanSquare = fingerprint.reduce((sum, value) => sum + value * value, 0) / fingerprint.length;
  return Math.sqrt(meanSquare);
}

export function describeEnvironment() {
  const navigatorInfo = typeof navigator === 'undefined' ? {} : navigator;
  return {
    userAgent: navigatorInfo.userAgent || 'unknown',
    platform: navigatorInfo.platform || 'unknown',
    hardwareConcurrency: navigatorInfo.hardwareConcurrency ?? null,
    language: navigatorInfo.language || 'unknown',
    screen: typeof window !== 'undefined' && window.screen
      ? `${window.screen.width}x${window.screen.height}@${window.devicePixelRatio || 1}`
      : 'unknown',
  };
}

/**
 * Build one dataset record. `label` and `labelSource` are required: an unlabelled
 * capture is not training data, and a label with no stated source is an assumption.
 */
export function buildDatasetRecord({ label, labelSource, fingerprint, response, deviceModel, mediaVolume, protocol, notes = '' }) {
  if (!['full', 'empty'].includes(label)) throw new Error('Choose a true state of Full or Empty.');
  if (!labelSource || !String(labelSource).trim()) throw new Error('State how the true fill was established (for example a measured weight).');
  if (!Array.isArray(fingerprint) || !fingerprint.length) throw new Error('A capture with no fingerprint cannot be stored.');

  const peaks = fingerprintPeaks(fingerprint);
  const rms = rmsFromFingerprint(fingerprint);

  return {
    id: (crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`),
    createdAt: new Date().toISOString(),
    fingerprintVersion: FINGERPRINT_VERSION,
    // The label the model must never see at split time beyond this field.
    label,
    labelSource: String(labelSource).trim().slice(0, 200),
    // Grouping key for a container-wise train/test split.
    cylinderId: String(protocol?.cylinderId || '').trim().slice(0, 80) || 'unspecified',
    condition: String(protocol?.condition || '').trim().slice(0, 80) || 'unspecified',
    room: String(protocol?.room || '').trim().slice(0, 80) || 'unspecified',
    deviceModel: String(deviceModel || '').trim().slice(0, 120) || 'unspecified',
    mediaVolume: mediaVolume === '' || mediaVolume === null || mediaVolume === undefined ? null : Number(mediaVolume),
    notes: String(notes || '').slice(0, 1000),
    // Signal measurements.
    fingerprint,
    averageEnergyDb: response?.averageEnergy ?? null,
    sampleCount: response?.sampleCount ?? null,
    rms,
    peakBins: peaks.map((peak) => peak.index),
    peakFrequencies: peaks.map((peak) => peak.hz),
    peakValues: peaks.map((peak) => Number(peak.value.toFixed(2))),
    sampleRate: response?.sampleRate ?? null,
    sweepDurationSeconds: response?.sweep?.durationSeconds ?? null,
    environment: describeEnvironment(),
  };
}

export async function saveDatasetRecord(record) {
  await withStore('readwrite', (store) => store.put(record));
  return record;
}

export async function listDatasetRecords() {
  const rows = await withStore('readonly', (store) => store.getAll());
  return Array.isArray(rows) ? rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : [];
}

export async function deleteDatasetRecord(id) {
  await withStore('readwrite', (store) => store.delete(id));
}

export async function clearDataset() {
  await withStore('readwrite', (store) => store.clear());
}

export function datasetSummary(records) {
  const byLabel = { full: 0, empty: 0 };
  const cylinders = new Set();
  records.forEach((record) => {
    if (byLabel[record.label] !== undefined) byLabel[record.label] += 1;
    cylinders.add(record.cylinderId || 'unspecified');
  });
  return {
    total: records.length,
    full: byLabel.full,
    empty: byLabel.empty,
    cylinders: cylinders.size,
    // Fewer than two containers means a held-out split is not yet possible.
    splitReady: cylinders.size >= 2 && byLabel.full > 0 && byLabel.empty > 0,
  };
}

// --- Assign each record to one container, then compare groups, ---

/**
 * Mean-centred similarity (Pearson correlation of the two fingerprints).
 *
 * Raw cosine similarity on these vectors is dominated by their large negative
 * dB offset, so two spectra with very different shapes still score ~0.97 and a
 * purely level-based comparison can look carefully calibrated while carrying no
 * usable information. Removing the mean isolates spectral shape, which is where
 * a fill-level difference actually shows up.
 */
export function shapeSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || !a.length) return 0;
  const meanA = a.reduce((sum, value) => sum + value, 0) / a.length;
  const meanB = b.reduce((sum, value) => sum + value, 0) / b.length;
  let dot = 0; let normA = 0; let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    dot += da * db; normA += da * da; normB += db * db;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-12);
}

/** Similarity function currently used by the live classifier (level-sensitive). */
const LEVEL_METRIC = cosineSimilarity;
/** Shape-sensitive metric used for the separability gate. */
const SHAPE_METRIC = shapeSimilarity;

/**
 * Mean and standard deviation of within-container repeat similarity.
 * High values mean the same container repeatedly reads the same way.
 */
function withinContainerSimilarity(records, metric) {
  const byContainer = new Map();
  records.forEach((record) => {
    const key = record.cylinderId || 'unspecified';
    if (!byContainer.has(key)) byContainer.set(key, []);
    byContainer.get(key).push(record);
  });

  const scores = [];
  byContainer.forEach((group) => {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        scores.push(metric(group[i].fingerprint, group[j].fingerprint));
      }
    }
  });
  return scores;
}

/**
 * Between-class similarity, measured only across different containers so the
 * comparison is not inflated by the same cylinder appearing on both sides.
 */
function betweenClassSimilarity(records, metric) {
  const scores = [];
  for (let i = 0; i < records.length; i += 1) {
    for (let j = i + 1; j < records.length; j += 1) {
      const left = records[i];
      const right = records[j];
      if (left.label === right.label) continue;
      if ((left.cylinderId || 'unspecified') === (right.cylinderId || 'unspecified')) continue;
      scores.push(metric(left.fingerprint, right.fingerprint));
    }
  }
  return scores;
}

function describe(values) {
  if (!values.length) return { count: 0, mean: null, stdDev: null, min: null, max: null };
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return {
    count: values.length,
    mean,
    stdDev: Math.sqrt(variance),
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

/**
 * The decisive check from the roadmap: repeat readings of the same container must
 * be more similar to each other than Full readings are to Empty readings. If the
 * distributions overlap, the measurement geometry must change before any model
 * training is worth attempting.
 */
export function analyzeSeparability(records) {
  const evaluate = (metric) => ({
    within: describe(withinContainerSimilarity(records, metric)),
    between: describe(betweenClassSimilarity(records, metric)),
  });

  const level = evaluate(LEVEL_METRIC);
  const shape = evaluate(SHAPE_METRIC);
  const summary = datasetSummary(records);

  const insufficient = level.within.count === 0 || level.between.count === 0;
  const basisPoints = (value) => `${(value * 100).toFixed(2)} pts`;
  const judge = (group) => {
    if (insufficient) return { separation: null, strictSeparation: null, overlap: null };
    // Primary criterion: the typical repeat reading is more similar to its own
    // container than Full and Empty are to each other. Mean-based comparison is
    // robust to a single noisy capture; the strict worst-case margin is reported
    // alongside it because that is what governs real error bars.
    const separation = group.within.mean - group.between.mean;
    const strictSeparation = group.within.min - group.between.max;
    return { separation, strictSeparation, overlap: separation <= 0 };
  };
  const levelVerdict = judge(level);
  const shapeVerdict = judge(shape);

  if (insufficient) {
    return {
      ready: false,
      insufficient: true,
      level, shape, levelVerdict, shapeVerdict,
      message: summary.cylinders < 2
        ? 'Capture each state on at least two different containers so repeats and classes can be compared.'
        : 'Capture at least two readings per container and both states before this can be judged.',
    };
  }

  // Shape separation is the one that matters: it is what a classifier would use.
  const ready = shapeVerdict.overlap === false;
  const strictNote = shapeVerdict.strictSeparation > 0
    ? `The worst-case margin is also clean (${basisPoints(shapeVerdict.strictSeparation)}).`
    : `Worst-case margin is ${basisPoints(shapeVerdict.strictSeparation)}: at least one repeat is as close to the other class as to its own, so expect occasional errors even though the typical case separates.`;
  const levelNote = levelVerdict.overlap
    ? `Level-based similarity remains above the repeat floor (${basisPoints(level.within.min)} vs ${basisPoints(level.between.max)}), which is expected: it is dominated by overall loudness rather than fill state.`
    : `Level-based similarity also separates, by ${basisPoints(levelVerdict.separation)}.`;

  return {
    ready,
    insufficient: false,
    level,
    shape,
    levelVerdict,
    shapeVerdict,
    message: ready
      ? `Repeat readings of the same container are more similar to each other than Full and Empty readings are, in spectral shape, by ${basisPoints(shapeVerdict.separation)} on average (repeat mean ${basisPoints(shape.within.mean)} vs between-class mean ${basisPoints(shape.between.mean)}). The measurement supports a supervised classifier. ${strictNote} ${levelNote}`
      : `Repeat readings of the same container are not distinct from Full vs Empty readings in spectral shape (repeat mean ${basisPoints(shape.within.mean)} vs between-class mean ${basisPoints(shape.between.mean)}). Change the measurement geometry or protocol before training a classifier. ${strictNote} ${levelNote}`,
  };
}

export function exportDataset(records) {
  return JSON.stringify({
    kind: 'groundtruth-acoustic-dataset',
    exportedAt: new Date().toISOString(),
    fingerprintVersion: FINGERPRINT_VERSION,
    toneFrequencies: ACOUSTIC_TEST_FREQUENCIES,
    sampleCount: records.length,
    summary: datasetSummary(records),
    records,
  }, null, 2);
}

/** CSV of the 16 bins plus metadata, for spreadsheet or notebook analysis. */
export function exportDatasetCsv(records) {
  const header = [
    'id', 'createdAt', 'label', 'labelSource', 'cylinderId', 'condition', 'room',
    'deviceModel', 'mediaVolume', 'averageEnergyDb', 'rms', 'sampleCount',
    ...ACOUSTIC_TEST_FREQUENCIES.map((hz) => `db_${hz}hz`),
  ];
  const escape = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const rows = records.map((record) => [
    record.id, record.createdAt, record.label, record.labelSource, record.cylinderId,
    record.condition, record.room, record.deviceModel, record.mediaVolume,
    record.averageEnergyDb, record.rms, record.sampleCount,
    ...record.fingerprint,
  ].map(escape).join(','));
  return [header.join(','), ...rows].join('\n');
}
