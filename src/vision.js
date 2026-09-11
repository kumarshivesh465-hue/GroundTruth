// Reference-based visual seal check for the live demo. The supplied can-lid
// examples are bundled with the app and stay on-device. MobileNet provides a
// compact visual embedding; we compare each live frame with the average
// sealed and unsealed reference embeddings using cosine similarity.
const SEALED_REFERENCES = Array.from(
  { length: 7 },
  (_, index) => `/can-seal-references/sealed/sealed-${String(index + 1).padStart(2, '0')}.png`,
);
const UNSEALED_REFERENCES = Array.from(
  { length: 6 },
  (_, index) => `/can-seal-references/unsealed/unsealed-${String(index + 1).padStart(2, '0')}.png`,
);

let classifierPromise = null;

function cosineSimilarity(left, right) {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }
  return dot / ((Math.sqrt(leftNorm) * Math.sqrt(rightNorm)) + 1e-12);
}

function averageEmbedding(embeddings) {
  const average = Array(embeddings[0].length).fill(0);
  embeddings.forEach((embedding) => embedding.forEach((value, index) => { average[index] += value / embeddings.length; }));
  return average;
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load visual reference ${source}.`));
    image.src = source;
  });
}

async function createClassifier() {
  const [tf, mobilenet] = await Promise.all([
    import('@tensorflow/tfjs'),
    import('@tensorflow-models/mobilenet'),
  ]);
  try { await tf.setBackend('webgl'); } catch { /* CPU remains a valid local fallback. */ }
  await tf.ready();
  const model = await mobilenet.load({ version: 2, alpha: 0.5 });

  const getEmbedding = async (image) => {
    const tensor = model.infer(image, true);
    const values = Array.from(await tensor.data());
    tensor.dispose();
    return values;
  };
  const [sealedImages, unsealedImages] = await Promise.all([
    Promise.all(SEALED_REFERENCES.map(loadImage)),
    Promise.all(UNSEALED_REFERENCES.map(loadImage)),
  ]);
  const [sealedEmbeddings, unsealedEmbeddings] = await Promise.all([
    Promise.all(sealedImages.map(getEmbedding)),
    Promise.all(unsealedImages.map(getEmbedding)),
  ]);
  return {
    getEmbedding,
    sealedAverage: averageEmbedding(sealedEmbeddings),
    unsealedAverage: averageEmbedding(unsealedEmbeddings),
  };
}

function getClassifier() {
  if (!classifierPromise) {
    classifierPromise = createClassifier().catch((error) => {
      classifierPromise = null;
      throw error;
    });
  }
  return classifierPromise;
}

async function classifySource(source) {
  const width = source.videoWidth || source.naturalWidth || source.width;
  const height = source.videoHeight || source.naturalHeight || source.height;
  if (!width || !height) {
    throw new Error('The camera is not ready yet. Start it and wait for the preview.');
  }
  const frame = document.createElement('canvas');
  frame.width = width;
  frame.height = height;
  frame.getContext('2d').drawImage(source, 0, 0, frame.width, frame.height);

  const startedAt = performance.now();
  const classifier = await getClassifier();
  const embedding = await classifier.getEmbedding(frame);
  const sealedSimilarity = cosineSimilarity(embedding, classifier.sealedAverage);
  const unsealedSimilarity = cosineSimilarity(embedding, classifier.unsealedAverage);
  const unsealed = unsealedSimilarity > sealedSimilarity;
  const margin = Math.abs(unsealedSimilarity - sealedSimilarity);
  // Similarity margin maps to a conservative operator-facing confidence.
  const confidence = Math.min(0.97, Math.max(0.55, 0.55 + (margin * 5)));

  return {
    imageDataUrl: frame.toDataURL('image/jpeg', 0.82),
    status: margin < 0.025 ? 'unclear' : 'detected',
    label: margin < 0.025 ? 'can seal unclear' : (unsealed ? 'unsealed can' : 'sealed can'),
    confidence,
    inferenceMs: Math.round(performance.now() - startedAt),
    referenceScores: { sealed: sealedSimilarity, unsealed: unsealedSimilarity },
  };
}

export async function captureObjectEvidence(video) {
  return classifySource(video);
}

export async function captureImageEvidence(image) {
  return classifySource(image);
}
