// General on-device frame evidence. COCO-SSD is intentionally described as
// object-in-frame evidence: it is not trained to certify an LPG cylinder or
// its seal.
let modelPromise = null;

async function getModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const [tf, cocoSsd] = await Promise.all([
        import('@tensorflow/tfjs'),
        import('@tensorflow-models/coco-ssd'),
      ]);
      try { await tf.setBackend('webgl'); } catch { /* Use the available backend. */ }
      await tf.ready();
      return cocoSsd.load({ base: 'mobilenet_v2' });
    })();
  }
  return modelPromise;
}

export async function captureObjectEvidence(video) {
  if (!video?.videoWidth || !video?.videoHeight) {
    throw new Error('The camera is not ready yet. Start it and wait for the preview.');
  }
  const frame = document.createElement('canvas');
  frame.width = video.videoWidth;
  frame.height = video.videoHeight;
  frame.getContext('2d').drawImage(video, 0, 0, frame.width, frame.height);
  const model = await getModel();
  const startedAt = performance.now();
  const detections = await model.detect(frame, 10, 0.25);
  const top = detections.reduce((best, item) => (!best || item.score > best.score ? item : best), null);
  return {
    imageDataUrl: frame.toDataURL('image/jpeg', 0.82),
    status: top ? 'detected' : 'unclear',
    label: top?.class || null,
    confidence: top?.score || 0,
    inferenceMs: Math.round(performance.now() - startedAt),
  };
}
