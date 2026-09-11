// Active acoustic sensing: emit a known sweep, collect the microphone's
// frequency response, and keep only a small normalized profile. The profile
// intentionally contains no recorded audio and can be stored locally.
const FFT_SIZE = 4096;
const PROFILE_BINS = 36;
const SWEEP_START_HZ = 180;
const SWEEP_END_HZ = 6000;
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

function frequencyAt(elapsedSeconds) {
  return SWEEP_START_HZ * Math.pow(SWEEP_END_HZ / SWEEP_START_HZ, elapsedSeconds / SWEEP_DURATION_SECONDS);
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
    oscillator = context.createOscillator();
    gain = context.createGain();
    const start = context.currentTime + 0.04;
    // An intentionally audible, three-second chirp. Device volume still
    // controls final loudness; the app does not exceed a safe Web Audio gain.
    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.linearRampToValueAtTime(0.55, start + 0.08);
    gain.gain.linearRampToValueAtTime(0.001, start + SWEEP_DURATION_SECONDS);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.frequency.setValueAtTime(SWEEP_START_HZ, start);
    oscillator.frequency.exponentialRampToValueAtTime(SWEEP_END_HZ, start + SWEEP_DURATION_SECONDS);
    onProgress('Playing a 3.4-second high-frequency sweep and recording the response…');
    oscillator.start(start);
    const spectrum = new Uint8Array(analyser.frequencyBinCount);
    const accumulated = Array(PROFILE_BINS).fill(0);
    const samplesPerBand = Array(PROFILE_BINS).fill(0);
    let samples = 0; let totalEnergy = 0;
    await new Promise((resolve) => {
      // An FFT represents audio that arrived during its preceding analysis
      // window. Compensating that half-window delay is essential: without it,
      // a fast chirp is sampled at the wrong frequency (most visibly above
      // 3 kHz), weakening or reversing full/empty separation.
      const analysisDelaySeconds = analyser.fftSize / context.sampleRate / 2;
      const stopAt = performance.now() + (SWEEP_DURATION_SECONDS * 1000) + (analysisDelaySeconds * 1000) + 220;
      const sample = () => {
        analyser.getByteFrequencyData(spectrum);
        const elapsed = context.currentTime - start - analysisDelaySeconds;
        if (elapsed >= 0 && elapsed <= SWEEP_DURATION_SECONDS) {
          const band = Math.min(PROFILE_BINS - 1, Math.floor((elapsed / SWEEP_DURATION_SECONDS) * PROFILE_BINS));
          const expectedBin = Math.round(frequencyAt(elapsed) / (context.sampleRate / FFT_SIZE));
          let localEnergy = 0;
          let binCount = 0;
          for (let bin = Math.max(1, expectedBin - 2); bin <= Math.min(spectrum.length - 1, expectedBin + 2); bin += 1) {
            localEnergy += spectrum[bin];
            binCount += 1;
          }
          accumulated[band] += localEnergy / Math.max(binCount, 1);
          samplesPerBand[band] += 1;
        }
        totalEnergy += spectrum.reduce((sum, value) => sum + value, 0) / spectrum.length;
        samples += 1;
        if (performance.now() < stopAt) requestAnimationFrame(sample); else resolve();
      };
      requestAnimationFrame(sample);
    });
    const fingerprint = accumulated.map((value, index) => value / Math.max(samplesPerBand[index], 1));
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
