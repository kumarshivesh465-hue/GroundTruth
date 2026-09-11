// Active acoustic sensing: this deliberately mirrors the acquisition method
// in the original acoustic-test.html playground that was tested on the demo
// phone. It keeps a compact spectrum profile, never a raw audio recording.
const FFT_SIZE = 2048;
const PROFILE_BINS = 32;
const SWEEP_START_HZ = 100;
const SWEEP_END_HZ = 8000;
const SWEEP_DURATION_SECONDS = 1.2;
let sharedAudioContext = null;
let sharedMicrophoneStream = null;

function getAudioContext() {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return sharedAudioContext;
}

async function getMicrophoneStream() {
  const hasLiveTrack = sharedMicrophoneStream?.getAudioTracks().some((track) => track.readyState === 'live');
  if (!hasLiveTrack) sharedMicrophoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return sharedMicrophoneStream;
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

export async function captureAcousticResponse(onProgress = () => {}) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone capture is not available in this browser.');
  // Keep both resources alive between 1/3, 2/3, and 3/3. Reopening an Android
  // microphone stream can move Web Audio into a voice-call mode that silences
  // the speaker output even though the microphone permission indicator remains.
  const context = getAudioContext();
  const resumePromise = context.resume();
  const stream = await getMicrophoneStream();
  let source; let analyser; let oscillator; let gain;
  try {
    await resumePromise;
    if (context.state !== 'running') await context.resume();
    if (context.state !== 'running') throw new Error('The phone blocked speaker playback. Tap Record reference again after allowing sound for this site.');
    source = context.createMediaStreamSource(stream);
    analyser = context.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    source.connect(analyser);
    const spectrum = new Uint8Array(analyser.frequencyBinCount);
    oscillator = context.createOscillator();
    gain = context.createGain();
    const start = context.currentTime;
    gain.gain.setValueAtTime(0.6, start);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.frequency.setValueAtTime(SWEEP_START_HZ, start);
    oscillator.frequency.exponentialRampToValueAtTime(SWEEP_END_HZ, start + SWEEP_DURATION_SECONDS);
    onProgress('Playing the original 1.2-second 100–8000 Hz sweep and recording the response…');
    oscillator.start(start);
    // Same broad-spectrum accumulation as acoustic-test.html: 32 chunks of
    // the complete FFT, averaged throughout the sweep plus a short tail.
    const accumulated = Array(PROFILE_BINS).fill(0);
    let samples = 0; let totalEnergy = 0;
    await new Promise((resolve) => {
      const stopAt = performance.now() + (SWEEP_DURATION_SECONDS * 1000) + 150;
      const sample = () => {
        analyser.getByteFrequencyData(spectrum);
        const values = downsampleSpectrum(spectrum, PROFILE_BINS);
        values.forEach((value, index) => { accumulated[index] += value; });
        samples += 1;
        totalEnergy += spectrum.reduce((sum, value) => sum + value, 0) / spectrum.length;
        if (performance.now() < stopAt) requestAnimationFrame(sample); else resolve();
      };
      requestAnimationFrame(sample);
    });
    const fingerprint = accumulated.map((value) => value / Math.max(samples, 1));
    return {
      status: 'recorded',
      fingerprint,
      averageEnergy: Math.round(totalEnergy / Math.max(samples, 1)),
      sampleCount: samples,
      sweep: { startHz: SWEEP_START_HZ, endHz: SWEEP_END_HZ, durationSeconds: SWEEP_DURATION_SECONDS },
    };
  } finally {
    try { oscillator?.stop(); } catch { /* already stopped */ }
    oscillator?.disconnect(); gain?.disconnect(); source?.disconnect();
    // The stream is intentionally kept until the page closes. This matches the
    // original tested playground and prevents Android from dropping speaker
    // output between consecutive calibration captures.
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
  return average.map((value) => value / samples.length);
}

export const ACOUSTIC_PROFILE_BINS = PROFILE_BINS;
