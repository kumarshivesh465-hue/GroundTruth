import React, { useEffect, useState } from 'react';
import { AppScreen, VerificationSession } from '../types';
import { TopAppBar } from '../components/TopAppBar';
import { BottomNav } from '../components/BottomNav';
import { EvidenceConflictLogo } from '../components/ResultLogos';
import { VisionEvidenceCard } from '../components/VisionEvidenceCard';
import { buildProviderEmail, PROVIDERS, providerLabel } from '../../provider-email';
import { triggerMismatchFeedback } from '../../feedback.js';
import {
  AlertCircle,
  RotateCcw,
  FileCheck,
  ChevronRight,
  Info,
  Check,
  Mail,
} from 'lucide-react';

interface ResultMismatchScreenProps {
  onNavigate: (screen: AppScreen) => void;
  session: VerificationSession;
}

export const ResultMismatchScreen: React.FC<ResultMismatchScreenProps> = ({
  onNavigate,
  session,
}) => {
  const [reportSaved, setReportSaved] = useState(false);
  const [providerId, setProviderId] = useState(session.provider?.id || 'bharatgas');
  const [otherLabel, setOtherLabel] = useState(session.provider?.otherLabel || '');
  const [recipientEmail, setRecipientEmail] = useState(session.provider?.recipientEmail || '');
  // Vibration + flash + alarm tone, once, when this verdict first appears.
  useEffect(() => { triggerMismatchFeedback(); }, []);

  // Live on-device detection label when available; simulated brand otherwise.
  const visualDetected = session.visionEvidence?.label
    ? session.visionEvidence.label.charAt(0).toUpperCase() +
      session.visionEvidence.label.slice(1) +
      ' · ' +
      Math.round(session.visionEvidence.confidence * 100) +
      '%'
    : session.selectedPreset.detectedBrand;

  // The tap screen is the primary method. Prefer its screened fill, falling
  // back to the legacy tone-sweep estimate only when no tap result exists.
  const tapFill = session.tapEvidence?.estimatePercent;
  const fillPercentage = typeof tapFill === 'number' ? tapFill : session.acousticEvidence?.fillPercentage;
  const fillMethod = session.tapEvidence?.prediction === 'level'
    ? 'nearest calibrated tap reference'
    : session.acousticEvidence?.fillEstimateMethod || null;

  const handleSaveReport = () => {
    setReportSaved(true);
    setTimeout(() => setReportSaved(false), 2000);
  };

  const providerSelection = { id: providerId, otherLabel, recipientEmail };
  const handleDraftEmail = () => {
    // Opens the device mail client with a prepared draft. Nothing is sent by
    // this app: there is no SMTP or backend service anywhere in the project.
    const draft = buildProviderEmail(session, providerSelection);
    window.location.href = draft.mailto;
  };

  return (
    <div className="flex-1 flex flex-col bg-white select-none">
      <TopAppBar
        title="Verification Result"
        showBack={true}
        onBack={() => onNavigate('home')}
        showBell={false}
      />

      <div className="flex-1 px-5 py-3 space-y-4 overflow-y-auto">
        {/* Evidence Conflict Triangle Logo matching Image 7 */}
        <EvidenceConflictLogo />

        {/* Title & Subtitle */}
        <div className="flex flex-col items-center text-center space-y-1.5">
          <h2 className="text-[22px] font-bold text-[#B91C1C] tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            Evidence mismatch
          </h2>

          <p className="text-[13px] text-slate-600 max-w-xs leading-relaxed">
            The information captured does not match the expected records for this cylinder.
          </p>
        </div>

        {/* IDENTIFIED CONFLICTS Card matching Image 7 */}
        <div className="rounded-2xl border border-red-200/90 overflow-hidden shadow-2xs">
          {/* Header Banner */}
          <div className="bg-[#FFF1F2] px-4 py-2.5 border-b border-red-100 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#B91C1C]" />
            <span className="text-[11px] font-bold text-[#B91C1C] tracking-wider uppercase font-mono">
              IDENTIFIED CONFLICTS
            </span>
          </div>

          <div className="p-3.5 bg-white space-y-3.5 text-xs divide-y divide-slate-100">
            {/* Visual Identity */}
            <div className="space-y-1.5 first:pt-0 pt-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Visual Identity</span>
                <span className="px-2 py-0.5 rounded-full bg-red-50 text-[#B91C1C] border border-red-200 text-[10px] font-bold font-mono">
                  MISMATCH
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div>
                  <span className="block text-[10px] font-bold text-slate-600 font-mono">DETECTED</span>
                  <span className="font-bold text-[#B91C1C]">{visualDetected}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-600 font-mono">EXPECTED</span>
                  <span className="font-bold text-emerald-700">{session.selectedPreset.expectedBrand}</span>
                </div>
              </div>
            </div>

            {/* Acoustic Signal */}
            <div className="space-y-1.5 pt-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Acoustic Signal</span>
                <span className="px-2 py-0.5 rounded-full bg-red-50 text-[#B91C1C] border border-red-200 text-[10px] font-bold font-mono">
                  MISMATCH
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div>
                  <span className="block text-[10px] font-bold text-slate-600 font-mono">DETECTED</span>
                  <span className="font-bold text-[#B91C1C]">
                    {typeof fillPercentage !== 'number'
                      ? 'No estimate'
                      : `${fillPercentage}% estimated`}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-600 font-mono">EXPECTED</span>
                  <span className="font-bold text-emerald-700">
                    {session.transcript?.trim() || 'Claim not stated'}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 leading-snug pt-0.5">
                {session.acousticEvidence?.fillEstimateMethod
                  ? `Method: ${session.acousticEvidence.fillEstimateMethod}. Interpolated between two local calibration anchors - not a weight, certified volume, or precise measurement.`
                  : 'Estimated fill level is interpolated between two local calibration anchors. It is not a weight, a certified volume, or a precise measurement.'}
              </p>
            </div>

            {/* Seal Integrity */}
            <div className="space-y-1.5 pt-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Seal Integrity</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div>
                  <span className="block text-[10px] font-bold text-slate-600 font-mono">DETECTED</span>
                  <span className="font-bold text-slate-800">Intact</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-600 font-mono">EXPECTED</span>
                  <span className="font-bold text-emerald-700">Intact</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live visual detection captured on-device */}
        <VisionEvidenceCard evidence={session.visionEvidence} compact />

        {/* Limitation statement: deliberately shown on every mismatch report. */}
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-[11.5px] text-amber-900 leading-snug">
            This report records evidence captured on this device. The fill figure is a relative estimate
            between two locally calibrated anchors, not a regulated measurement, and it is not proof of
            tampering or of gas quantity. Confirm with a licensed weighing method before acting.
          </p>
        </div>

        {/* Provider report: user reviews and sends the draft themselves. */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 font-mono">
            <Mail className="w-4 h-4 text-[#00A3B4]" />
            <span>DRAFT EMAIL TO PROVIDER</span>
          </div>

          <div className="space-y-1">
            <label htmlFor="provider-select" className="block text-[10px] font-bold text-slate-600 font-mono">
              PROVIDER
            </label>
            <select
              id="provider-select"
              value={providerId}
              onChange={(event) => setProviderId(event.target.value as typeof providerId)}
              className="w-full h-10 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700"
            >
              {PROVIDERS.map((provider) => (
                <option key={provider.id} value={provider.id}>{provider.label}</option>
              ))}
            </select>
          </div>

          {providerId === 'other' && (
            <div className="space-y-1">
              <label htmlFor="provider-other" className="block text-[10px] font-bold text-slate-600 font-mono">
                PROVIDER NAME
              </label>
              <input
                id="provider-other"
                value={otherLabel}
                onChange={(event) => setOtherLabel(event.target.value)}
                placeholder="Type the distributor name"
                className="w-full h-10 rounded-xl border border-slate-300 bg-white px-2.5 text-xs text-slate-700"
              />
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="provider-email" className="block text-[10px] font-bold text-slate-600 font-mono">
              RECIPIENT EMAIL (OPTIONAL)
            </label>
            <input
              id="provider-email"
              type="email"
              inputMode="email"
              value={recipientEmail}
              onChange={(event) => setRecipientEmail(event.target.value)}
              placeholder="Leave blank to choose the recipient in your mail app"
              className="w-full h-10 rounded-xl border border-slate-300 bg-white px-2.5 text-xs text-slate-700"
            />
            <p className="text-[10px] text-slate-500 leading-snug">
              This app has no company address book and never guesses one. Add an address only if you have a verified one.
            </p>
          </div>

          <button
            id="draft-provider-email-btn"
            onClick={handleDraftEmail}
            className="w-full h-11 rounded-xl bg-[#00A3B4] hover:bg-[#008D9B] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Mail className="w-4 h-4" />
            <span>Draft email to {providerLabel(providerSelection)}</span>
          </button>
          <p className="text-[10px] text-slate-500 leading-snug">
            Opens a prepared draft in your mail app. You review, edit, and send it yourself - nothing is sent automatically.
          </p>
        </div>

        {/* RECOMMENDED ACTIONS matching Image 7 */}
        <div className="space-y-2 pt-1">
          <span className="block text-[11px] font-bold text-slate-600 tracking-wider uppercase font-mono">
            RECOMMENDED ACTIONS
          </span>

          {/* Action 1 */}
          <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-cyan-50 border border-cyan-200 text-[#00A3B4] flex items-center justify-center shrink-0 mt-0.5">
              <Info className="w-4 h-4" />
            </div>
            <div className="text-xs space-y-0.5">
              <h4 className="font-bold text-slate-900">Verify Serial Number</h4>
              <p className="text-slate-600 leading-snug">
                Ensure the physical serial number on the cylinder collar matches the consumer's invoice.
              </p>
            </div>
          </div>

          {/* Action 2 */}
          <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-cyan-50 border border-cyan-200 text-[#00A3B4] flex items-center justify-center shrink-0 mt-0.5">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div className="text-xs space-y-0.5">
              <h4 className="font-bold text-slate-900">Re-capture Visuals</h4>
              <p className="text-slate-600 leading-snug">
                If the cylinder is correct, try capturing the image again in better lighting conditions.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons matching Image 7 */}
        <div className="pt-2 space-y-2.5 pb-2">
          <button
            id="restart-verification-btn"
            onClick={() => onNavigate('capture')}
            className="w-full h-12.5 rounded-xl bg-[#00A3B4] hover:bg-[#008D9B] active:scale-[0.99] text-white font-semibold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer text-sm"
          >
            <RotateCcw className="w-4.5 h-4.5" />
            <span>Restart Verification</span>
          </button>

          <button
            id="save-evidence-report-btn"
            onClick={handleSaveReport}
            className="w-full h-11 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            {reportSaved ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Evidence Report Saved</span>
              </>
            ) : (
              <>
                <FileCheck className="w-4 h-4 text-slate-500" />
                <span>Save Evidence Report</span>
              </>
            )}
          </button>

          <button
            onClick={() => onNavigate('home')}
            className="w-full py-1 text-center text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <span>Return to Dashboard</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <BottomNav currentScreen="home" onNavigate={onNavigate} />
    </div>
  );
};
