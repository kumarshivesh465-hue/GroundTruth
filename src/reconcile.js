// Transparent, deterministic fallback for when a local LLM is unavailable.
export function reconcileEvidence(check) {
  if (!check.vision?.imageDataUrl) return { status: 'INCOMPLETE', reason: 'Capture a delivery frame before checking the claim.', source: 'local rules' };
  if (!check.claim?.text?.trim() && !check.claim?.recorded) return { status: 'INCOMPLETE', reason: 'Record or enter the delivery claim before checking it.', source: 'local rules' };
  if (check.vision.status !== 'detected') return { status: 'RECHECK', reason: 'No reliable general object signal was found. Retake the photo in better light.', source: 'local rules' };
  if (check.acoustic?.status === 'conflicting') return { status: 'MISMATCH', reason: 'The acoustic result conflicts with the recorded claim. Repeat the check before accepting delivery.', source: 'local rules' };
  if (check.acoustic?.status !== 'recorded') return { status: 'RECHECK', reason: 'Visual and claim evidence were collected, but the acoustic signal is incomplete.', source: 'local rules' };
  if (!check.acoustic.calibrated) return { status: 'RECHECK', reason: 'An acoustic response was captured, but it has not been calibrated against known reference containers.', source: 'local rules' };
  return { status: 'MATCH', reason: 'All available signals were recorded and the calibrated acoustic response supports the claim.', source: 'local rules' };
}

// Adapts the UI session into the small, explicit evidence contract above.
// This keeps the decision path deterministic and prevents preset demo outcomes
// from deciding a live verification result.
export function reconcileSession(session) {
  const acousticPrediction = session.acousticPrediction;

  return reconcileEvidence({
    vision: session.visionEvidence,
    claim: {
      text: session.transcript,
      recorded: session.hasRecordedAudio,
    },
    acoustic: {
      status: acousticPrediction === 'full' || acousticPrediction === 'empty' ? 'recorded' : 'incomplete',
      calibrated: acousticPrediction === 'full' || acousticPrediction === 'empty',
    },
  });
}
