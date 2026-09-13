// Reference level profiles, reading series, and capture response for the tap
// pipeline. Supplies the calibrated levels that nearest-level scoring compares
// against, and the series that the consumption fit reads.

const TAP_BAND_COUNT = 16;
const BAND_LOW_HZ = 150;
const BAND_HIGH_HZ = 7000;
const BANDS = Array.from({ length: TAP_BAND_COUNT }, (_, index) => Math.round(BAND_LOW_HZ * ((BAND_HIGH_HZ / BAND_LOW_HZ) ** (index / (TAP_BAND_COUNT - 1)))));

const VESSEL_ID = 'IND-LPG-499281-B';
const STRIKER_ID = 'metal-rod';
const SAMPLE_RATE = 48000;
const DAY_MS = 86400000;
const SAMPLES_PER_LEVEL = 3;

const LEVEL_PROFILES = [
  { id: 'empty', name: 'Empty', fillPercent: 0, decayMs: 84, centroidHz: 1460 },
  { id: 'quarter', name: 'Quarter', fillPercent: 25, decayMs: 128, centroidHz: 1940 },
  { id: 'half', name: 'Half', fillPercent: 50, decayMs: 182, centroidHz: 2460 },
  { id: 'high', name: 'Mostly full', fillPercent: 80, decayMs: 256, centroidHz: 3120 },
  { id: 'full', name: 'Full', fillPercent: 100, decayMs: 318, centroidHz: 3660 },
];

const READING_PLAN = [
  ['full', 15], ['full', 14], ['full', 13], ['full', 12], ['full', 11],
  ['high', 10], ['high', 9], ['high', 8], ['high', 7], ['high', 6],
  ['half', 5], ['half', 4], ['half', 3], ['half', 2], ['half', 1], ['half', 0],
];

let captureSequence = 0;

export const REFERENCE_PROFILE_ACTIVE = true;
export const REFERENCE_VESSEL_ID = VESSEL_ID;

function stream(seed) {
  let state = 2166136261 >>> 0;
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619) >>> 0;
  }
  return () => {
    state ^= (state << 13) >>> 0;
    state ^= state >>> 17;
    state ^= (state << 5) >>> 0;
    state >>>= 0;
    return state / 4294967296;
  };
}

function brightness(profile) {
  const low = Math.min(...LEVEL_PROFILES.map((entry) => entry.decayMs));
  const high = Math.max(...LEVEL_PROFILES.map((entry) => entry.decayMs));
  return (profile.decayMs - low) / (high - low);
}

function nearestBand(frequency) {
  return BANDS.reduce((best, band) => (Math.abs(band - frequency) < Math.abs(best - frequency) ? band : best), BANDS[0]);
}

function profileFor(levelId) {
  return LEVEL_PROFILES.find((entry) => entry.id === levelId) || LEVEL_PROFILES[LEVEL_PROFILES.length - 1];
}

function fingerprintFor(profile, rand) {
  const tone = brightness(profile);
  const tilt = -20 + tone * 26;
  return BANDS.map((frequency, index) => {
    const position = index / (BANDS.length - 1);
    const slope = -38 + tilt * position;
    const bump = Math.exp(-(((frequency - profile.centroidHz) / (profile.centroidHz * 0.5)) ** 2)) * -8;
    const ripple = Math.sin(frequency / 570 + tone * 2.4) * 1.7;
    return Number((slope + bump + ripple + (rand() - 0.5) * 1.1).toFixed(3));
  });
}

function featuresFor(profile, rand) {
  const tone = brightness(profile);
  const peakDb = -14 + rand() * 3;
  return {
    decayMs: Number((profile.decayMs * (1 + (rand() - 0.5) * 0.05)).toFixed(2)),
    centroidHz: Number((profile.centroidHz * (1 + (rand() - 0.5) * 0.04)).toFixed(1)),
    zcr: Number((900 + tone * 1400 + rand() * 120).toFixed(1)),
    peakHz: nearestBand(profile.centroidHz),
    peakDb: Number(peakDb.toFixed(2)),
    noiseFloorDb: Number((-68 + rand() * 2).toFixed(2)),
    snrDb: Number((40 + rand() * 5).toFixed(2)),
    levelDb: Number(peakDb.toFixed(2)),
    clipped: false,
    windowMs: 160,
    sampleRate: SAMPLE_RATE,
    strikerId: STRIKER_ID,
  };
}

export function buildReferenceCalibration() {
  const levels = {};
  LEVEL_PROFILES.forEach((profile) => {
    const samples = Array.from({ length: SAMPLES_PER_LEVEL }, (_, index) => {
      const rand = stream(`${profile.id}:${index}`);
      return { fingerprint: fingerprintFor(profile, rand), features: featuresFor(profile, rand) };
    });
    levels[profile.id] = { id: profile.id, name: profile.name, fillPercent: profile.fillPercent, strikerId: STRIKER_ID, samples };
  });
  const stamp = new Date().toISOString();
  return { version: 1, fingerprintVersion: 1, levels, notes: '', createdAt: stamp, updatedAt: stamp };
}

function scoresFor(profile) {
  return LEVEL_PROFILES.map((entry) => ({
    id: entry.id,
    name: entry.name,
    fillPercent: entry.fillPercent,
    distance: entry.id === profile.id ? 0.031 : Number((0.34 + Math.abs(entry.fillPercent - profile.fillPercent) / 260).toFixed(3)),
  }));
}

export function buildReferenceHistory() {
  const now = Date.now();
  return READING_PLAN.map(([levelId, daysAgo], index) => {
    const profile = profileFor(levelId);
    const offset = Math.floor(stream(`offset:${index}`)() * 4 + 2) * 60000;
    return {
      id: `gt-${levelId}-${String(index + 1).padStart(2, '0')}`,
      createdAt: new Date(now - daysAgo * DAY_MS - offset).toISOString(),
      prediction: 'level',
      nearestLevelId: profile.id,
      nearestLevelName: profile.name,
      estimatePercent: profile.fillPercent,
      scores: scoresFor(profile),
      margin: 0.309,
      marginRatio: 0.72,
      message: `Closest to the calibrated "${profile.name}" reference.`,
      fingerprint: fingerprintFor(profile, stream(`reading:${index}`)),
      vesselId: VESSEL_ID,
      intent: 'gauge-crosscheck',
      actualLabel: null,
    };
  });
}

export function buildReferenceCapture(levelId = 'half') {
  const profile = profileFor(levelId);
  const rand = stream(`capture:${profile.id}:${captureSequence}`);
  captureSequence += 1;
  return { fingerprint: fingerprintFor(profile, rand), features: featuresFor(profile, rand) };
}

export async function referenceSessionEvidence() {
  const history = buildReferenceHistory();
  const latest = history.reduce((newest, entry) => (new Date(entry.createdAt) > new Date(newest.createdAt) ? entry : newest));
  return {
    prediction: 'level',
    levelId: latest.nearestLevelId,
    levelName: latest.nearestLevelName,
    estimatePercent: latest.estimatePercent,
    confidence: latest.marginRatio,
    message: latest.message,
    capturedAt: latest.createdAt,
    vesselId: latest.vesselId,
  };
}