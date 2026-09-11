// Active acoustic sensing: emit a known sweep, collect the microphone's
// frequency response, and keep only a small normalized profile. The profile
// intentionally contains no recorded audio and can be stored locally.
const FFT_SIZE = 2048;
const PROFILE_BINS = 32;
const SWEEP_START_HZ = 100;
const SWEEP_END_HZ = 8000;
const SWEEP_DURATION_SECONDS = 3.4;

function normalizeFingerprint(values) {
  // Centre the profile first: cosine similarity must compare the *shape* of
  // the frequency response, not the shared loudness of the phone speaker.
  const logged = values.map((value) => Math.log1p(value));
  const mean = logged.reduce((sum, value) => sum + value, 0) / logged.length;
  const centred = logged.map((value) => value - mean);
  const norm = Math.sqrt(centred.reduce((sum, value) => sum + value * value, 0));
  return norm ? centred.map((value) => Number((value / norm).toFixed(6))) : centred;
}

function downsampleSpectrum(spectrum, bins) {
  const profile = Array(bins).fill(0);
  const chunkSize = spectrum.length / bins;
  for (let index = 0; index < bins; index += 1) {
    const from = Math.floor(index * chunkSize);
    const to = Math.max(from + 1, Math.floor((index + 1) * chunkSize));
    let total = 0;
    for (let bin = from; bin < to; bin += 1) total += spectrum[bin];
    profile[index] = total / (to - from);
  }
  return profile;
}

function readSpectrum(analyser, spectrum) {
  analyser.getByteFrequencyData(spectrum);
  return downsampleSpectrum(spectrum, PROFILE_BINS);
}

async function captureAmbientProfile(analyser, spectrum, context) {
  // Measure the room/microphone floor before the speaker starts. Subtracting
  // it later makes the fingerprint respond to the sweep rather than to a fan,
  // people talking, or a permanently noisy microphone band.
  const total = Array(PROFILE_BINS).fill(0);
  let reads = 0;
  const stopAt = performance.now() + 320;
  await new Promise((resolve) => {
    const sample = () => {
      const values = readSpectrum(analyser, spectrum);
      values.forEach((value, index) => { total[index] += value; });
      reads += 1;
      if (performance.now() < stopAt && context.state === 'running') requestAnimationFrame(sample); else resolve();
    };
    requestAnimationFrame(sample);
  });
  return total.map((value) => value / Math.max(reads, 1));
}

export async function captureAcousticResponse(onProgress = () => {}) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone capture is not available in this browser.');
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  const context = new (window.AudioContext || window.webkitAudioContext)();
  let source; let analyser; let oscillator; let gain;
  try {
    await context.resume();
    source = context.createMediaStreamSource(stream);
    analyser = context.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0;
    source.connect(analyser);
    const spectrum = new Uint8Array(analyser.frequencyBinCount);
    onProgress('Measuring ambient sound before the sweep…');
    const ambientProfile = await captureAmbientProfile(analyser, spectrum, context);
    oscillator = context.createOscillator();
    gain = context.createGain();
    const start = context.currentTime + 0.04;
    // An intentionally audible, three-second chirp. Device volume still
    // controls final loudness; the app does not exceed a safe Web Audio gain.
    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.linearRampToValueAtTime(0.65, start + 0.08);
    gain.gain.linearRampToValueAtTime(0.001, start + SWEEP_DURATION_SECONDS);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.frequency.setValueAtTime(SWEEP_START_HZ, start);
    oscillator.frequency.exponentialRampToValueAtTime(SWEEP_END_HZ, start + SWEEP_DURATION_SECONDS);
    onProgress('Playing a 3.4-second high-frequency sweep and recording the response…');
    oscillator.start(start);
    // This deliberately returns to the broad 32-band response profile used by
    // the original successful playground. The previous implementation paired
    // every animation-frame FFT with a rapidly changing expected chirp bin.
    // On phone browsers, analyser latency and phone DSP made that narrow-band
    // pairing unstable, so a new live capture could look unlike both references.
    // Here we average the whole response spectrum across the known sweep and
    // subtract the short ambient baseline captured above.
    const accumulated = Array(PROFILE_BINS).fill(0);
    let samples = 0; let totalEnergy = 0;
    await new Promise((resolve) => {
      const stopAt = performance.now() + (SWEEP_DURATION_SECONDS * 1000) + 180;
      const sample = () => {
        const values = readSpectrum(analyser, spectrum);
        if (context.currentTime >= start) {
          values.forEach((value, index) => {
            accumulated[index] += Math.max(0, value - ambientProfile[index]);
          });
          samples += 1;
        }
        totalEnergy += spectrum.reduce((sum, value) => sum + value, 0) / spectrum.length;
        if (performance.now() < stopAt) requestAnimationFrame(sample); else resolve();
      };
      requestAnimationFrame(sample);
    });
    const fingerprint = accumulated.map((value) => value / Math.max(samples, 1));
    return {
      status: 'recorded',
      fingerprint: normalizeFingerprint(fingerprint),
      averageEnergy: Math.round(totalEnergy / Math.max(samples, 1)),
      sampleCount: samples,
      sweep: { startHz: SWEEP_START_HZ, endHz: SWEEP_END_HZ, durationSeconds: SWEEP_DURATION_SECONDS },
    };
  } finally {
    try { oscillator?.stop(); } catch { /* already stopped */ }
    oscillator?.disconnect(); gain?.disconnect(); source?.disconnect();
    stream.getTracks().forEach((track) => track.stop());
    await context.close();
  }
}

export function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || !a.length) return 0;
  let dot = 0; let normA = 0; let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i]; normA += a[i] * a[i]; normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-12);
}

export function averageFingerprint(samples) {
  if (!samples.length) return null;
  const average = Array(samples[0].length).fill(0);
  samples.forEach((sample) => sample.forEach((value, index) => { average[index] += value; }));
  const norm = Math.sqrt(average.reduce((sum, value) => sum + value * value, 0));
  return average.map((value) => Number((value / Math.max(norm, 1e-12)).toFixed(6)));
}

export const ACOUSTIC_PROFILE_BINS = PROFILE_BINS;
