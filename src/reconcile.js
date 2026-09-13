// Transparent, deterministic fallback for when a local LLM is unavailable.

// Words that state a fill level explicitly enough to check against an estimate.
// Anything vaguer is treated as unparseable and never used to accuse a claim.
const EMPTY_WORDS = /\b(empty|emptied|no gas|ran out|run out|nothing (?:left|in))\b/;
const PARTIAL_WORDS = /\b(half|partly|partially|partial|less than full|not full|not completely full|under ?filled|short|low)\b/;
const FULL_WORDS = /\b(full|filled|topped up|complete)\b/;

// Exported so the LLM adapter and tests share one definition of "reliable".
export function parseClaimFillDirection(text) {
  const value = String(text || '').toLowerCase();
  if (!value.trim()) return null;
  if (EMPTY_WORDS.test(value)) return 'empty';
  if (PARTIAL_WORDS.test(value)) return 'partial';
  if (FULL_WORDS.test(value)) return 'full';
  return null;
}

// A percentage is only treated as definitive near either anchor. The middle band
// is deliberately wide because a two-anchor interpolation has no resolution there.
export function estimateToDirection(fillPercentage) {
  if (typeof fillPercentage !== 'number' || !Number.isFinite(fillPercentage)) return null;
  if (fillPercentage >= 65) return 'full';
  if (fillPercentage <= 35) return 'empty';
  return 'partial';
}

export function reconcileEvidence(check) {
  if (!check.vision?.imageDataUrl) return { status: 'INCOMPLETE', reason: 'Capture a delivery frame before checking the claim.', source: 'local rules' };
  if (!check.claim?.text?.trim() && !check.claim?.recorded) return { status: 'INCOMPLETE', reason: 'Record or enter the delivery claim before checking it.', source: 'local rules' };
  if (check.vision.status !== 'detected') return { status: 'RECHECK', reason: 'No reliable general object signal was found. Retake the photo in better light.', source: 'local rules' };
  if (check.acoustic?.status === 'conflicting') return { status: 'MISMATCH', reason: 'The acoustic result conflicts with the recorded claim. Repeat the check before accepting delivery.', source: 'local rules' };
  if (check.acoustic?.status !== 'recorded') return { status: 'RECHECK', reason: 'Visual and claim evidence were collected, but the acoustic signal is incomplete.', source: 'local rules' };
  if (!check.acoustic.calibrated) return { status: 'RECHECK', reason: 'An acoustic response was captured, but it has not been calibrated against known reference containers.', source: 'local rules' };

  const fillPercentage = check.acoustic.fillPercentage;
  if (typeof fillPercentage !== 'number' || !Number.isFinite(fillPercentage)) {
    return { status: 'RECHECK', reason: check.acoustic.withheldReason || 'The acoustic capture could not produce an estimated fill level, so the claim cannot be checked against it.', source: 'local rules' };
  }

  // The percentage is directional evidence only. It is compared with the claim
  // solely when the wording states a fill level explicitly; an unclear or
  // unsupported claim can never by itself produce a mismatch.
  const claimDirection = parseClaimFillDirection(check.claim.text);
  const estimateDirection = estimateToDirection(fillPercentage);
  if (!claimDirection) {
    return { status: 'RECHECK', reason: `The claim does not state a fill level in words this app can read reliably, so the ${fillPercentage}% estimate was not compared against it. Confirm the fill level with the customer or provider.`, source: 'local rules' };
  }
  if (claimDirection === 'partial' || estimateDirection === 'partial') {
    return { status: 'RECHECK', reason: `The claim reads as "${claimDirection}" and the estimate reads as "${estimateDirection}" (${fillPercentage}%). A two-anchor estimate is not precise enough to resolve this, so the result is not called either way.`, source: 'local rules' };
  }
  if (claimDirection !== estimateDirection) {
    return { status: 'MISMATCH', reason: `The claim states the container was ${claimDirection}, but the acoustic estimate reads ${fillPercentage}% (${estimateDirection}).`, source: 'local rules' };
  }
  return { status: 'MATCH', reason: `The claim states the container was ${claimDirection} and the acoustic estimate reads ${fillPercentage}%, which agrees. This is an interpolated estimate between two local calibration anchors, not a measurement.`, source: 'local rules' };
}


// Tap-test path. The tap check is the primary method, so it gets its own
// reconciliation entry point. The same conservatism applies: a screening
// result is directional evidence, never a measurement.
export function reconcileTapEvidence(check) {
  const tap = check.tap;
  if (!tap) return { status: 'INCOMPLETE', reason: 'Run the tap check before comparing the claim.', source: 'local rules' };
  if (tap.prediction !== 'level' || typeof tap.estimatePercent !== 'number' || !Number.isFinite(tap.estimatePercent)) {
    return { status: 'RECHECK', reason: tap.message || 'The tap could not be placed reliably against the calibrated references.', source: 'local rules' };
  }
  const claimDirection = parseClaimFillDirection(check.claim?.text);
  if (!claimDirection) {
    return { status: 'RECHECK', reason: `The tap reads closest to "${tap.levelName}" (about ${tap.estimatePercent}% by nearest calibrated reference), but the claim does not state a fill level in words this app can read reliably, so the two were not compared.`, source: 'local rules' };
  }
  const estimateDirection = estimateToDirection(tap.estimatePercent);
  if (claimDirection === 'partial' || estimateDirection === 'partial') {
    return { status: 'RECHECK', reason: `The claim reads as "${claimDirection}" and the tap reads as "${estimateDirection}" (nearest ${tap.levelName}, about ${tap.estimatePercent}%). A nearest-reference screen is not precise enough to resolve this, so no verdict is issued.`, source: 'local rules' };
  }
  if (claimDirection !== estimateDirection) {
    return { status: 'MISMATCH', reason: `The claim states the vessel was ${claimDirection}, but the tap screen reads closest to "${tap.levelName}" (about ${tap.estimatePercent}% fill). Confirm with a human check.`, source: 'local rules' };
  }
  return { status: 'MATCH', reason: `The claim states the vessel was ${claimDirection} and the tap screen agrees (nearest "${tap.levelName}", about ${tap.estimatePercent}% fill). This is a nearest-reference screen, not a measurement.`, source: 'local rules' };
}
// Adapts the UI session into the small, explicit evidence contract above.
// This keeps the decision path deterministic and prevents preset demo outcomes
// from deciding a live verification result.
export function reconcileSession(session) {
  // The tap test is the primary method. When a tap result exists it decides,
  // because it is the signal the product is built around now.
  if (session.tapEvidence) {
    return reconcileTapEvidence({
      tap: session.tapEvidence,
      claim: { text: session.transcript, recorded: session.hasRecordedAudio },
    });
  }
  const evidence = session.acousticEvidence;
  const acousticPrediction = evidence?.prediction || session.acousticPrediction;

  return reconcileEvidence({
    vision: session.visionEvidence,
    claim: {
      text: session.transcript,
      recorded: session.hasRecordedAudio,
    },
    acoustic: {
      status: acousticPrediction === 'full' || acousticPrediction === 'empty' ? 'recorded' : 'incomplete',
      calibrated: acousticPrediction === 'full' || acousticPrediction === 'empty',
      fillPercentage: evidence?.fillPercentage ?? null,
      withheldReason: evidence?.withheldReason ?? null,
    },
  });
}
