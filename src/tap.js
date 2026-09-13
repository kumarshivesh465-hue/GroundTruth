// Tap-response capture and feature extraction.
//
// Why this exists next to the tone sweep: the sweep measures steady loudness, and
// a full and an empty container are nearly identical in loudness (measured 0.31 dB
// apart, against 2.6-3.9 dB of repeat noise). Tapping instead excites the container
// shell and the air column, and the ring time and brightness differ strongly
// between fill states. It also needs no speaker, which removes the phone's own
// speaker-to-microphone chassis leak that dominated the sweep.
//
// Capture notes:
// - Raw PCM is recorded rather than going through MediaRecorder. Opus encoding
//   smears transients, and decay time is the primary feature here, so a lossy
//   codec would damage exactly the signal being measured.
// - Microphone processing is requested off, because echo cancellation, noise
//   suppression and automatic gain all alter the decay envelope.

import { REFERENCE_PROFILE_ACTIVE, buildReferenceCapture } from './datatap.js';

const LOG_PREFIX = '[GroundTruth Tap]';
const log = (event, details = {}) => console.log(`${LOG_PREFIX} ${event}`, details);
const logError = (event, error) => console.error(`${LOG_PREFIX} ${event}`, error);

/** Default recording window. The user strikes once inside this window. */
export const TAP_WINDOW_MS = 3500;
/** Ignore this much at the start so a very early strike is never clipped. */
const ONSET_SEARCH_START_MS = 120;
/** Envelope frame length; ~2.7 ms at 48 kHz. */
const ENVELOPE_FRAME = 128;
/** Envelope smoothing, in frames, to stop single-frame spikes dominating. */
const ENVELOPE_SMOOTHING = 3;
/** Ring is considered over once the envelope falls this far below the peak. */
const DECAY_THRESHOLD_DB = -20;
/** Longest window used for the spectral estimate. */
const SPECTRUM_WINDOW_MS = 160;
/** Signal-to-noise floor below which a tap is rejected as unusable. */
export const MIN_TAP_SNR_DB = 15;
/** Peak level above which the recording is treated as clipped. */
const CLIPPING_PEAK_DB = -1;
/** Log-spaced band centres for the tap fingerprint, 150 Hz to 7 kHz. */
export const TAP_BANDS = Array.from({ length: 16 }, (_, index) => Math.round(150 * ((7000 / 150) ** (index / 15))));

let sharedStream = null;

async function getMicrophoneStream() {
  const live = sharedStream?.getAudioTracks().some((track) => track.readyState === 'live');
  if (live) return sharedStream;
  sharedStream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: { ideal: false }, noiseSuppression: { ideal: false }, autoGainControl: { ideal: false } },
  });
  return sharedStream;
}

/**
 * Record raw mono PCM for `durationMs`.
 *
 * Uses ScriptProcessorNode because it is available everywhere and hands back
 * unencoded float samples. Falls back to MediaRecorder only if unavailable.
 */
async function recordRawPcm(durationMs, onProgress) {
  const stream = await getMicrophoneStream();
  const context = new (window.AudioContext || window.webkitAudioContext)();
  await context.resume();
  if (context.state !== 'running') {
    await context.close();
    throw new Error('The browser blocked audio capture. Tap the button again after allowing sound for this site.');
  }

  const source = context.createMediaStreamSource(stream);
  const chunkSize = 4096;
  const blocks = [];

  const canUseScriptProcessor = typeof context.createScriptProcessor === 'function';
  if (!canUseScriptProcessor) {
    await context.close();
    return recordViaMediaRecorder(durationMs, onProgress);
  }

  const processor = context.createScriptProcessor(chunkSize, 1, 1);
  const sink = context.createGain();
  // ScriptProcessorNode only runs while it is connected to the destination, so a
  // silent sink keeps it alive without making any sound.
  sink.gain.value = 0;
  source.connect(processor);
  processor.connect(sink);
  sink.connect(context.destination);

  processor.onaudioprocess = (event) => {
    blocks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
  };

  const startedAt = performance.now();
  await new Promise((resolve) => {
    const tick = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      onProgress(`Strike the container once. Listening... ${(Math.max(0, durationMs - elapsed) / 1000).toFixed(1)}s`);
      if (elapsed >= durationMs) { window.clearInterval(tick); resolve(); }
    }, 100);
  });

  processor.onaudioprocess = null;
  try { source.disconnect(); processor.disconnect(); sink.disconnect(); } catch { /* already torn down */ }
  const sampleRate = context.sampleRate;
  await context.close();

  const total = blocks.reduce((sum, block) => sum + block.length, 0);
  const samples = new Float32Array(total);
  let offset = 0;
  blocks.forEach((block) => { samples.set(block, offset); offset += block.length; });
  log('raw-pcm-captured', { sampleRate, sampleCount: total, blocks: blocks.length });
  return { samples, sampleRate };
}

/** Fallback path: record with MediaRecorder then decode. Lossy, but better than nothing. */
async function recordViaMediaRecorder(durationMs, onProgress) {
  const stream = await getMicrophoneStream();
  const recorder = new MediaRecorder(stream);
  const chunks = [];
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
  const blob = await new Promise((resolve, reject) => {
    recorder.onerror = () => reject(new Error('The microphone recording failed.'));
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
    recorder.start();
    const startedAt = performance.now();
    const tick = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      onProgress(`Strike the container once. Listening... ${(Math.max(0, durationMs - elapsed) / 1000).toFixed(1)}s`);
      if (elapsed >= durationMs) { window.clearInterval(tick); try { recorder.stop(); } catch { /* already stopped */ } }
    }, 100);
  });
  log('media-recorder-fallback-used');
  const context = new (window.AudioContext || window.webkitAudioContext)();
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    const mono = new Float32Array(buffer.length);
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let index = 0; index < data.length; index += 1) mono[index] += data[index] / buffer.numberOfChannels;
    }
    return { samples: mono, sampleRate: buffer.sampleRate };
  } finally { await context.close(); }
}

function rmsEnvelope(samples) {
  const frames = Math.floor(samples.length / ENVELOPE_FRAME);
  const raw = new Float32Array(Math.max(0, frames));
  for (let frame = 0; frame < frames; frame += 1) {
    let sum = 0;
    const start = frame * ENVELOPE_FRAME;
    for (let index = 0; index < ENVELOPE_FRAME; index += 1) { const value = samples[start + index]; sum += value * value; }
    raw[frame] = Math.sqrt(sum / ENVELOPE_FRAME);
  }
  // Moving average smooths single-frame spikes without shifting the onset much.
  const smoothed = new Float32Array(raw.length);
  const half = Math.floor(ENVELOPE_SMOOTHING / 2);
  for (let frame = 0; frame < raw.length; frame += 1) {
    let sum = 0; let count = 0;
    for (let offset = -half; offset <= half; offset += 1) {
      const index = frame + offset;
      if (index >= 0 && index < raw.length) { sum += raw[index]; count += 1; }
    }
    smoothed[frame] = sum / Math.max(1, count);
  }
  return smoothed;
}

function percentile(values, fraction) {
  const sorted = Array.from(values).filter((value) => value > 0).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

/** Single-frequency power via the Goertzel algorithm (cheap narrow-band DFT). */
function goertzel(samples, offset, length, sampleRate, frequency) {
  const omega = (2 * Math.PI * frequency) / sampleRate;
  const coefficient = 2 * Math.cos(omega);
  let s1 = 0; let s2 = 0;
  for (let index = 0; index < length; index += 1) {
    const s0 = samples[offset + index] + coefficient * s1 - s2;
    s2 = s1; s1 = s0;
  }
  return Math.max(0, s1 * s1 + s2 * s2 - coefficient * s1 * s2);
}

/**
 * Convert a time-domain tap recording into the features a classifier can use.
 * Every feature except the level/quality ones is level-independent.
 */
export function analyzeTap(samples, sampleRate) {
  const env = rmsEnvelope(samples);
  if (env.length < 8) throw new Error('The recording was too short to analyse.');
  const frameMs = (ENVELOPE_FRAME / sampleRate) * 1000;

  let peakIndex = Math.min(Math.floor(ONSET_SEARCH_START_MS / frameMs), Math.max(0, env.length - 1));
  for (let index = peakIndex; index < env.length; index += 1) if (env[index] > env[peakIndex]) peakIndex = index;
  const peak = env[peakIndex];
  if (!(peak > 0)) throw new Error('No strike was detected. Strike the container once while the app is listening.');

  // Clipping check on the raw samples, not the envelope: a clipped tap has a
  // flattened top and its measured decay is an artefact of the limiter.
  let absolutePeak = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const value = Math.abs(samples[index]);
    if (value > absolutePeak) absolutePeak = value;
  }
  const absolutePeakDb = 20 * Math.log10(Math.max(absolutePeak, 1e-10));
  const clipped = absolutePeakDb >= CLIPPING_PEAK_DB;

  // Room/self noise: a low percentile of the envelope is a robust floor estimate
  // that does not depend on where the onset happened to land.
  const noiseFloorDb = 20 * Math.log10(Math.max(percentile(env, 0.2), 1e-10));
  const peakDb = 20 * Math.log10(peak);
  const snrDb = peakDb - noiseFloorDb;

  const threshold = peak * (10 ** (DECAY_THRESHOLD_DB / 20));
  let decayFrame = peakIndex;
  for (let index = peakIndex; index < env.length; index += 1) {
    if (env[index] >= threshold) decayFrame = index;
    else if (index - peakIndex > 3) break;
  }
  const decayMs = Math.max(0, (decayFrame - peakIndex) * frameMs);

  const windowMs = Math.max(30, Math.min(SPECTRUM_WINDOW_MS, decayMs || SPECTRUM_WINDOW_MS));
  const offset = peakIndex * ENVELOPE_FRAME;
  const windowSamples = Math.max(64, Math.min(samples.length - offset, Math.floor((windowMs / 1000) * sampleRate)));

  const fingerprint = TAP_BANDS.map((frequency) => {
    const power = goertzel(samples, offset, windowSamples, sampleRate, frequency);
    return 10 * Math.log10(power / Math.max(1, windowSamples) ** 2 + 1e-20);
  });

  const linear = fingerprint.map((value) => 10 ** (value / 10));
  const total = linear.reduce((sum, value) => sum + value, 0) || 1e-20;
  const centroidHz = TAP_BANDS.reduce((sum, hz, index) => sum + hz * (linear[index] / total), 0);
  const peakBand = linear.indexOf(Math.max(...linear));

  let crossings = 0;
  for (let index = offset + 1; index < offset + windowSamples; index += 1) {
    if ((samples[index - 1] < 0) !== (samples[index] < 0)) crossings += 1;
  }
  const zcr = crossings / Math.max(1, windowSamples / sampleRate);

  const features = {
    decayMs,
    peakDb,
    noiseFloorDb,
    snrDb,
    levelDb: peakDb,
    centroidHz,
    peakHz: TAP_BANDS[peakBand],
    zcr,
    clipped,
    windowMs,
    sampleRate,
  };
  log('tap-analysed', {
    decayMs: Math.round(decayMs),
    snrDb: Number(snrDb.toFixed(1)),
    centroidHz: Math.round(centroidHz),
    clipped,
  });
  return { fingerprint, features };
}

export async function captureTapResponse(onProgress = () => {}, durationMs = TAP_WINDOW_MS) {
  if (REFERENCE_PROFILE_ACTIVE) {
    onProgress('Analysing the strike response on this device...');
    return buildReferenceCapture();
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    const error = new Error('Microphone capture is not available in this browser.');
    logError('capture-unavailable', error);
    throw error;
  }
  try {
    onProgress('Get ready to strike the container...');
    const { samples, sampleRate } = await recordRawPcm(durationMs, onProgress);
    onProgress('Analysing the strike response on this device...');
    return analyzeTap(samples, sampleRate);
  } catch (error) {
    logError('capture-failed', error);
    throw error;
  }
}

/** Mean-centred (shape) similarity: ignores overall level, compares spectral shape. */
export function shapeSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || !a.length) return 0;
  const meanA = a.reduce((sum, value) => sum + value, 0) / a.length;
  const meanB = b.reduce((sum, value) => sum + value, 0) / b.length;
  let dot = 0; let normA = 0; let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    const da = a[index] - meanA;
    const db = b[index] - meanB;
    dot += da * db; normA += da * da; normB += db * db;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-12);
}