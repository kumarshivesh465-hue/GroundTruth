// Capture a compact transfer-response profile from controlled speaker tones.
// Calibration stores numeric response values rather than microphone audio.
const FFT_SIZE = 2048;
const TEST_FREQUENCIES = [
  300, 370, 460, 570, 710, 880, 1090, 1350, 1670, 2070, 2570, 3190,
  3960, 4910, 6090, 7550,
];
const PROFILE_BINS = TEST_FREQUENCIES.length;
const TONE_SETTLE_MS = 90;
const TONE_SAMPLE_MS = 120;
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
  if (!hasLiveTrack) {
    // Voice-call processing removes exactly the small resonance differences we
    // need. These are ideals: browsers may ignore an unsupported constraint.
    sharedMicrophoneStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: { ideal: false },
        noiseSuppression: { ideal: false },
        autoGainControl: { ideal: false },
      },
    });
  }
  return sharedMicrophoneStream;
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function readToneLevel(analyser, data, frequency, sampleRate) {
  analyser.getFloatFrequencyData(data);
  const hzPerBin = sampleRate / analyser.fftSize;
  const center = Math.max(1, Math.min(data.length - 2, Math.round(frequency / hzPerBin)));
  // Taking the local peak avoids a one-bin FFT alignment error changing the
  // result when a phone's sample rate differs from the calibration phone.
  return Math.max(data[center - 1], data[center], data[center + 1]);
}

export async function captureAcousticResponse(onProgress = () => {}) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone capture is not available in this browser.');
  // Reuse the audio session during consecutive calibration captures. Some
  // mobile browsers can lose speaker output when the microphone is reopened.
  const context = getAudioContext();
  const resumePromise = context.resume();
  const stream = await getMicrophoneStream();
  let source; let analyser; let gain;
  try {
    await resumePromise;
    if (context.state !== 'running') await context.resume();
    if (context.state !== 'running') throw new Error('The phone blocked speaker playback. Tap Record reference again after allowing sound for this site.');
    source = context.createMediaStreamSource(stream);
    analyser = context.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0;
    analyser.minDecibels = -110;
    analyser.maxDecibels = -10;
    source.connect(analyser);
    const spectrum = new Float32Array(analyser.frequencyBinCount);
    gain = context.createGain();
    gain.gain.setValueAtTime(0.45, context.currentTime);
    gain.connect(context.destination);
    onProgress('Measuring 16 controlled tones from 300–7550 Hz. Keep the phone still…');
    const fingerprint = [];
    let totalEnergy = 0;
    let sampleCount = 0;
    for (let index = 0; index < TEST_FREQUENCIES.length; index += 1) {
      const frequency = TEST_FREQUENCIES[index];
      onProgress(`Measuring tone ${index + 1}/${TEST_FREQUENCIES.length} (${frequency} Hz). Keep the phone still…`);
      const oscillator = context.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, context.currentTime);
      oscillator.connect(gain);
      oscillator.start();
      await wait(TONE_SETTLE_MS);
      const readings = [];
      const stopAt = performance.now() + TONE_SAMPLE_MS;
      while (performance.now() < stopAt) {
        const level = readToneLevel(analyser, spectrum, frequency, context.sampleRate);
        readings.push(level);
        totalEnergy += level;
        sampleCount += 1;
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      oscillator.stop();
      oscillator.disconnect();
      fingerprint.push(readings.reduce((sum, level) => sum + level, 0) / Math.max(readings.length, 1));
    }
    return {
      status: 'recorded',
      fingerprint,
      averageEnergy: Math.round(totalEnergy / Math.max(sampleCount, 1)),
      sampleCount,
      sweep: { frequencies: TEST_FREQUENCIES, durationSeconds: ((TONE_SETTLE_MS + TONE_SAMPLE_MS) * TEST_FREQUENCIES.length) / 1000 },
    };
  } finally {
    gain?.disconnect(); source?.disconnect();
    // Keep the stream available for the next reference capture on this page.
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
