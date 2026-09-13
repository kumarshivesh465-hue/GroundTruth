// Optional on-device reconciliation adapter (WebLLM + WebGPU).
// Not wired into the live flow yet: the deterministic rules in reconcile.js
// remain the active decision path. When it is enabled, it must obey the same
// conservative guardrails, so it imports the shared claim parser.
import { parseClaimFillDirection } from './reconcile.js';

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
  onProgress('Checking WebGPU and loading the on-device reasoning model...');
  const engine = await getEngine(onProgress);
  onProgress('Comparing the available evidence locally...');
  // The tap screen is the primary method now. When a tap result exists it is
  // the evidence that matters; the tone-sweep estimate is the legacy path.
  const tap = check.tap;
  const tapDecisive = tap && tap.prediction === 'level' && typeof tap.estimatePercent === 'number' && Number.isFinite(tap.estimatePercent);
  const fillPercentage = tapDecisive ? tap.estimatePercent : check.acoustic?.fillPercentage;
  const estimateStated = typeof fillPercentage === 'number' && Number.isFinite(fillPercentage);
  const claimDirection = parseClaimFillDirection(check.claim.text);
  const evidence = {
    vision: check.vision.status === 'detected' ? `general object label ${check.vision.label} at ${Math.round(check.vision.confidence * 100)}%` : 'no reliable object signal',
    acoustic: tapDecisive
      ? `tap screen: nearest calibrated level \"${tap.levelName}\" at about ${tap.estimatePercent}% fill`
      : check.acoustic.status === 'recorded' ? `tone-sweep response recorded${check.acoustic.calibrated ? ' with calibration' : ' without calibration'}` : 'not recorded',
    estimatedFillLevel: estimateStated ? (tapDecisive ? `${fillPercentage}% by nearest calibrated tap reference (screening, not a measurement)` : `${fillPercentage}% by two-anchor interpolation between local Full and Empty references`) : 'withheld (no trustworthy estimate)',
    calibrationConcern: check.acoustic?.withheldReason || check.acoustic?.calibrationMessage || 'none',
    claim: check.claim.text || 'no claim recorded',
    claimStatedFillLevel: claimDirection || 'not stated in reliably readable words',
  };
  const reply = await engine.chat.completions.create({
    messages: [
      { role: 'system', content: 'You reconcile delivery evidence. Be conservative. A general object detector does not certify an LPG cylinder or seal. The fill level is an interpolated estimate between two local calibration anchors, never a weight or a certified volume. You may only report MISMATCH when the claim states a fill level in reliably readable words AND the estimate clearly disagrees with it. If the claim wording is unclear, absent, or only partially readable, you must return RECHECK rather than a mismatch. If no trustworthy estimate is available, return RECHECK. Explain in one short sentence. On the last line output exactly VERDICT: MATCH, VERDICT: MISMATCH, or VERDICT: RECHECK.' },
      { role: 'user', content: `Evidence: ${JSON.stringify(evidence)}` },
    ],
  });
  const text = (reply.choices[0].message.content || '').trim();
  const match = text.match(/VERDICT:\s*(MATCH|MISMATCH|RECHECK)/i);
  let status = match?.[1].toUpperCase() || 'RECHECK';
  // Enforce the same guardrail the deterministic rules use: an unsupported or
  // unclear claim can never be upgraded into a mismatch by the model.
  if (status === 'MISMATCH' && (!claimDirection || !estimateStated)) {
    status = 'RECHECK';
  }
  const reason = text.replace(/\s*VERDICT:\s*(MATCH|MISMATCH|RECHECK)\s*/i, '').trim().slice(0, 480) || 'The model did not return a usable explanation; collect the evidence again.';
  return { status, reason, source: 'WebLLM on-device' };
}