// Captures a repeatable speaker/microphone response. It intentionally does
// not infer cylinder fill until reference samples have been calibrated on the
// actual target hardware and container.
export async function captureAcousticResponse(onProgress = () => {}) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  const context = new (window.AudioContext || window.webkitAudioContext)();
  try {
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    gain.gain.value = 0.16;
    oscillator.connect(gain); gain.connect(context.destination);
    const start = context.currentTime;
    oscillator.frequency.setValueAtTime(120, start);
    oscillator.frequency.exponentialRampToValueAtTime(2400, start + 1.2);
    onProgress('Playing a short sweep and recording the acoustic response…');
    oscillator.start(start);

    const spectrum = new Uint8Array(analyser.frequencyBinCount);
    let totalEnergy = 0; let samples = 0;
    await new Promise((resolve) => {
      const stopAt = performance.now() + 1350;
      const sample = () => {
        analyser.getByteFrequencyData(spectrum);
        totalEnergy += spectrum.reduce((sum, value) => sum + value, 0) / spectrum.length;
        samples += 1;
        if (performance.now() < stopAt) requestAnimationFrame(sample); else resolve();
      };
      requestAnimationFrame(sample);
    });
    oscillator.stop(); oscillator.disconnect(); gain.disconnect(); source.disconnect();
    return { status: 'recorded', averageEnergy: Math.round(totalEnergy / Math.max(samples, 1)), calibrated: false };
  } finally {
    stream.getTracks().forEach((track) => track.stop());
    await context.close();
  }
}
