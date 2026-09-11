// Active acoustic sensing: emit a known sweep, collect the microphone's
// frequency response, and keep only a small normalized profile. The profile
// intentionally contains no recorded audio and can be stored locally.
const FFT_SIZE = 2048;
const PROFILE_BINS = 32;
const SWEEP_START_HZ = 120;
const SWEEP_END_HZ = 2400;
const SWEEP_DURATION_SECONDS = 1.2;

function profileFromSpectrum(spectrum, sampleRate) {
  const profile = Array(PROFILE_BINS).fill(0);
  const binWidth = sampleRate / FFT_SIZE;
  const startBin = Math.max(1, Math.floor(SWEEP_START_HZ / binWidth));
  const endBin = Math.min(spectrum.length - 1, Math.ceil(SWEEP_END_HZ / binWidth));
  const span = Math.max(1, endBin - startBin + 1);
  for (let bucket = 0; bucket < PROFILE_BINS; bucket += 1) {
    const from = startBin + Math.floor((bucket * span) / PROFILE_BINS);
    const to = Math.max(from + 1, startBin + Math.floor(((bucket + 1) * span) / PROFILE_BINS));
    let sum = 0;
    for (let bin = from; bin < to && bin <= endBin; bin += 1) sum += spectrum[bin];
    profile[bucket] = sum / Math.max(1, to - from);
  }
  const norm = Math.sqrt(profile.reduce((sum, value) => sum + value * value, 0));
  return norm ? profile.map((value) => Number((value / norm).toFixed(6))) : profile;
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
    analyser.smoothingTimeConstant = 0.25;
    source.connect(analyser);
    oscillator = context.createOscillator();
    gain = context.createGain();
    const start = context.currentTime + 0.04;
    // Kept below typical media playback level, but high enough for the
    // operator to hear the short calibration sweep on a phone speaker.
    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.linearRampToValueAtTime(0.28, start + 0.03);
    gain.gain.linearRampToValueAtTime(0.001, start + SWEEP_DURATION_SECONDS);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.frequency.setValueAtTime(SWEEP_START_HZ, start);
    oscillator.frequency.exponentialRampToValueAtTime(SWEEP_END_HZ, start + SWEEP_DURATION_SECONDS);
    onProgress('Playing a short sweep and recording the acoustic response…');
    oscillator.start(start);
    const spectrum = new Uint8Array(analyser.frequencyBinCount);
    const accumulated = Array(PROFILE_BINS).fill(0);
    let samples = 0; let totalEnergy = 0;
    await new Promise((resolve) => {
      const stopAt = performance.now() + (SWEEP_DURATION_SECONDS * 1000) + 170;
      const sample = () => {
        analyser.getByteFrequencyData(spectrum);
        const profile = profileFromSpectrum(spectrum, context.sampleRate);
        profile.forEach((value, index) => { accumulated[index] += value; });
        totalEnergy += spectrum.reduce((sum, value) => sum + value, 0) / spectrum.length;
        samples += 1;
        if (performance.now() < stopAt) requestAnimationFrame(sample); else resolve();
      };
      requestAnimationFrame(sample);
    });
    const fingerprint = accumulated.map((value) => value / Math.max(samples, 1));
    const norm = Math.sqrt(fingerprint.reduce((sum, value) => sum + value * value, 0));
    return {
      status: 'recorded',
      fingerprint: norm ? fingerprint.map((value) => Number((value / norm).toFixed(6))) : fingerprint,
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
