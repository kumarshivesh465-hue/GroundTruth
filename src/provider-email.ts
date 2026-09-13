import { ConsumptionPrediction, ProviderSelection, VerificationSession } from './ui/types';

export const PROVIDERS: { id: ProviderSelection['id']; label: string }[] = [
  { id: 'bharatgas', label: 'Bharatgas' },
  { id: 'indane', label: 'Indane' },
  { id: 'hpgas', label: 'HP Gas' },
  { id: 'other', label: 'Other' },
];

/**
 * Display name for the selected provider. If a distributor is not listable by
 * name, we never invent one: an unrecognised or "other" selection stays generic.
 */
export function providerLabel(provider?: ProviderSelection | null): string {
  if (!provider) return 'LPG distributor';
  if (provider.id === 'other') return provider.otherLabel.trim() || 'LPG distributor';
  return PROVIDERS.find((entry) => entry.id === provider.id)?.label || 'LPG distributor';
}

function describeFillEstimate(session: VerificationSession): string {
  const evidence = session.acousticEvidence;
  if (!evidence || evidence.fillPercentage === null) {
    return 'No trustworthy fill estimate was produced (the acoustic capture was withheld or the calibration was inadequate).';
  }
  return `${evidence.fillPercentage}% estimated (interpolated between this device's locally calibrated Full and Empty references; not a weight and not a certified volume).`;
}

function describeVerdict(session: VerificationSession): string {
  if (session.outcome === 'mismatch') return 'MISMATCH - the available evidence disagreed with the recorded claim.';
  if (session.outcome === 'match') return 'MATCH - the available evidence agreed with the recorded claim.';
  return 'RECHECK - the evidence was not conclusive, so no verdict was issued.';
}


/**
 * Draft the time-to-empty alert a site manager needs.
 *
 * Like the provider email, this only ever drafts: it hands a mailto: URL to the
 * device mail client. There is no SMTP path and nothing is sent by the app.
 * The consumption forecast is a screening estimate from a few tap readings, so
 * it is always presented as a range with an explicit confidence interval.
 */
export function buildManagerAlert(
  prediction: ConsumptionPrediction | null,
  session: VerificationSession | null,
  { recipient = '', managerName = 'Site manager' }: { recipient?: string; managerName?: string } = {}
) {
  const vessel = session?.vesselId || session?.cylinderUid || 'the vessel';
  const estimate = prediction && prediction.status === 'ok'
    ? `${Math.round(prediction.daysToEmpty)} days (95% range ${Math.round(prediction.earliestDays)}-${Math.round(prediction.latestDays)} days), at about ${prediction.ratePerDay.toFixed(2)} fill-points per day across ${prediction.count} readings.`
    : prediction?.reason || 'No usable trend estimate is available yet.';
  const subject = `GroundTruth alert - ${vessel} predicted to empty`;
  const lines = [
    `Hi ${managerName},`,
    '',
    `GroundTruth estimates that ${vessel} will reach empty in ${estimate}`,
    '',
    'This is a screening estimate from repeated acoustic tap readings, not a measurement or a custody-transfer value. Please confirm with the installed gauge or a physical check before scheduling a refill.',
    '',
    'Why it matters: an LPG vessel left empty for a long period, or cycled empty repeatedly, can take in water, oil, rust, or particulate, which changes the composition of what is delivered next.',
    '',
    `Readings used: ${prediction?.count ?? 0}${prediction?.weakFit ? ' (readings scatter widely, so treat the date as approximate)' : ''}`,
    `Recorded: ${session?.timestamp || new Date().toISOString()}`,
    '',
    'Regards,',
    'GroundTruth (on-device screening)',
  ];
  const body = lines.join('\n');
  const to = String(recipient || '').trim();
  const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return { subject, body, mailto, recipient: to };
}
export function buildProviderEmail(session: VerificationSession, provider?: ProviderSelection | null) {
  const label = providerLabel(provider);
  const subject = `GroundTruth report ${session.digitalReceiptId} - verification for cylinder ${session.cylinderUid}`;
  const lines = [
    `To the ${label} support team,`,
    '',
    'I am requesting a review of a delivery verification recorded with GroundTruth, a local on-device evidence tool.',
    '',
    `Report ID: ${session.digitalReceiptId}`,
    `Recorded: ${session.timestamp}`,
    `Cylinder ID: ${session.cylinderUid}`,
    `Customer: ${session.customerName}`,
    '',
    `Stated claim: ${session.transcript?.trim() || (session.hasRecordedAudio ? 'Voice claim recorded (not transcribed).' : 'No claim text was recorded.')}`,
    `Visual evidence: ${session.visionEvidence?.label ? `${session.visionEvidence.label} (${Math.round(session.visionEvidence.confidence * 100)}% general object confidence)` : 'No reliable general object signal.'}`,
    `Fill estimate: ${describeFillEstimate(session)}`,
    `Verdict: ${describeVerdict(session)}`,
    '',
    'Please review the delivery against the above. I can provide the captured image and the recorded claim on request.',
    '',
    'Note: the fill figure is a relative estimate between two local calibration anchors. It is not a weight, a certified volume, or a regulated measurement.',
    '',
    'Regards,',
    session.customerName,
  ];
  const body = lines.join('\n');
  const recipient = (provider?.recipientEmail || '').trim();
  // The recipient stays blank unless the user typed a verified address, so the
  // device mail client opens a draft rather than guessing an address.
  const mailto = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return { subject, body, mailto, recipient, providerLabel: label };
}