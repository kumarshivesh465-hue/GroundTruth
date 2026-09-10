// On-device Whisper adapter used by the Claim screen. This pins the same
// stable runtime/model pair proven in the standalone Whisper playground.
const TRANSFORMERS_URL = 'https://esm.sh/@huggingface/transformers@3.8.1?bundle';
const WHISPER_MODEL = 'onnx-community/whisper-tiny.en';
let transcriberPromise = null;

export async function loadWhisper(onProgress = () => {}) {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      const { pipeline } = await import(TRANSFORMERS_URL);
      const progress_callback = (item) => {
        if (item.status === 'progress') onProgress(`Loading speech model: ${item.file} (${Math.round(item.progress || 0)}%)`);
      };
      if (navigator.gpu) {
        try {
          onProgress('Loading on-device speech model with WebGPU…');
          return await pipeline('automatic-speech-recognition', WHISPER_MODEL, { device: 'webgpu', progress_callback });
        } catch {
          onProgress('WebGPU speech loading failed. Using compatible local mode…');
        }
      }
      return pipeline('automatic-speech-recognition', WHISPER_MODEL, { device: 'wasm', dtype: 'fp32', progress_callback });
    })();
  }
  try { return await transcriberPromise; } catch (error) { transcriberPromise = null; throw error; }
}

export async function transcribeBlob(blob, onProgress = () => {}) {
  const transcriber = await loadWhisper(onProgress);
  onProgress('Preparing audio for on-device transcription…');
  const audio = await decodeToFloat32Mono16k(blob);
  onProgress('Transcribing on this device…');
  const result = await transcriber(audio);
  return result.text.trim();
}

async function decodeToFloat32Mono16k(blob) {
  const context = new (window.AudioContext || window.webkitAudioContext)();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0);
  } finally { await context.close(); }
}
