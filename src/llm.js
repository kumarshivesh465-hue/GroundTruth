const MODEL_ID = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
let enginePromise = null;

async function getEngine(onProgress) {
  if (!navigator.gpu) throw new Error('WebGPU is unavailable in this browser.');
  if (!enginePromise) {
    enginePromise = (async () => {
      const webllm = await import('https://esm.run/@mlc-ai/web-llm');
      return webllm.CreateMLCEngine(MODEL_ID, { initProgressCallback: (item) => onProgress(item.text) });
    })();
  }
  try { return await enginePromise; } catch (error) { enginePromise = null; throw error; }
}

export async function runLlmReconciliation(check, onProgress = () => {}) {
  onProgress('Checking WebGPU and loading the on-device reasoning model…');
  const engine = await getEngine(onProgress);
  onProgress('Comparing the available evidence locally…');
  const evidence = {
    vision: check.vision.status === 'detected' ? `general object label ${check.vision.label} at ${Math.round(check.vision.confidence * 100)}%` : 'no reliable object signal',
    acoustic: check.acoustic.status === 'recorded' ? `response recorded${check.acoustic.calibrated ? ' with calibration' : ' without calibration'}` : 'not recorded',
    claim: check.claim.text || 'no claim recorded',
  };
  const reply = await engine.chat.completions.create({
    messages: [
      { role: 'system', content: 'You reconcile delivery evidence. Be conservative. A general object detector does not certify an LPG cylinder or seal. An uncalibrated acoustic response does not prove fill level. Explain in one short sentence. On the last line output exactly VERDICT: MATCH, VERDICT: MISMATCH, or VERDICT: RECHECK.' },
      { role: 'user', content: `Evidence: ${JSON.stringify(evidence)}` },
    ],
  });
  const text = (reply.choices[0].message.content || '').trim();
  const match = text.match(/VERDICT:\s*(MATCH|MISMATCH|RECHECK)/i);
  const status = match?.[1].toUpperCase() || 'RECHECK';
  const reason = text.replace(/\s*VERDICT:\s*(MATCH|MISMATCH|RECHECK)\s*/i, '').trim().slice(0, 480) || 'The model did not return a usable explanation; collect the evidence again.';
  return { status, reason, source: 'WebLLM on-device' };
}
