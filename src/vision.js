// Reference-based can-lid check for the demo. MobileNet produces a visual
// embedding for each frame, which is compared with sealed and unsealed local
// reference averages using cosine similarity.
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

// An open can creates a large connected dark aperture in the lid. This check
// focuses on the opening rather than colour, branding, or background.
function findLidOpening(frame) {
  const context = frame.getContext('2d', { willReadFrequently: true });
  const cropX = Math.floor(frame.width * 0.24);
  const cropY = Math.floor(frame.height * 0.13);
  const cropWidth = Math.max(1, Math.floor(frame.width * 0.52));
  const cropHeight = Math.max(1, Math.floor(frame.height * 0.46));
  const source = context.getImageData(cropX, cropY, cropWidth, cropHeight).data;
  const gridWidth = 80;
  const gridHeight = 80;
  const dark = new Uint8Array(gridWidth * gridHeight);

  for (let gridY = 0; gridY < gridHeight; gridY += 1) {
    for (let gridX = 0; gridX < gridWidth; gridX += 1) {
      const x = Math.min(cropWidth - 1, Math.floor((gridX + 0.5) * cropWidth / gridWidth));
      const y = Math.min(cropHeight - 1, Math.floor((gridY + 0.5) * cropHeight / gridHeight));
      const offset = ((y * cropWidth) + x) * 4;
      const brightness = (0.2126 * source[offset]) + (0.7152 * source[offset + 1]) + (0.0722 * source[offset + 2]);
      // Metal grooves and small shadows should not form a large connected area.
      dark[(gridY * gridWidth) + gridX] = brightness < 58 ? 1 : 0;
    }
  }

  const visited = new Uint8Array(dark.length);
  let largestComponent = 0;
  for (let index = 0; index < dark.length; index += 1) {
    if (!dark[index] || visited[index]) continue;
    const queue = [index];
    visited[index] = 1;
    let componentSize = 0;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const point = queue[cursor];
      componentSize += 1;
      const x = point % gridWidth;
      const y = Math.floor(point / gridWidth);
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          const neighbourX = x + offsetX;
          const neighbourY = y + offsetY;
          if (neighbourX < 0 || neighbourX >= gridWidth || neighbourY < 0 || neighbourY >= gridHeight) continue;
          const neighbour = (neighbourY * gridWidth) + neighbourX;
          if (dark[neighbour] && !visited[neighbour]) {
            visited[neighbour] = 1;
            queue.push(neighbour);
          }
        }
      }
    }
    largestComponent = Math.max(largestComponent, componentSize);
  }

  const ratio = largestComponent / dark.length;
  return { ratio, clearOpening: ratio >= 0.028 };
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
  const opening = findLidOpening(frame);
  const classifier = await getClassifier();
  const embedding = await classifier.getEmbedding(frame);
  const sealedSimilarity = cosineSimilarity(embedding, classifier.sealedAverage);
  const unsealedSimilarity = cosineSimilarity(embedding, classifier.unsealedAverage);
  // A clear aperture overrides the global embedding comparison.
  const unsealed = opening.clearOpening || unsealedSimilarity > sealedSimilarity;
  const margin = Math.abs(unsealedSimilarity - sealedSimilarity);
  // The similarity margin becomes an operator-facing confidence value.
  const openingConfidence = Math.min(0.98, 0.72 + ((opening.ratio - 0.028) * 4));
  const confidence = opening.clearOpening
    ? openingConfidence
    : Math.min(0.97, Math.max(0.55, 0.55 + (margin * 5)));

  return {
    imageDataUrl: frame.toDataURL('image/jpeg', 0.82),
    status: opening.clearOpening || margin >= 0.025 ? 'detected' : 'unclear',
    label: opening.clearOpening || margin >= 0.025 ? (unsealed ? 'unsealed can' : 'sealed can') : 'can seal unclear',
    confidence,
    inferenceMs: Math.round(performance.now() - startedAt),
    referenceScores: { sealed: sealedSimilarity, unsealed: unsealedSimilarity, openingRatio: opening.ratio },
  };
}

export async function captureObjectEvidence(video) {
  return classifySource(video);
}

export async function captureImageEvidence(image) {
  return classifySource(image);
}
