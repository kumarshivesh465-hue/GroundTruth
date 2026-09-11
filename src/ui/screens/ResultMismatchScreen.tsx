import React, { useState } from 'react';
import { AppScreen, VerificationSession } from '../types';
import { TopAppBar } from '../components/TopAppBar';
import { BottomNav } from '../components/BottomNav';
import { EvidenceConflictLogo } from '../components/ResultLogos';
import { VisionEvidenceCard } from '../components/VisionEvidenceCard';
import {
  AlertCircle,
  RotateCcw,
  FileCheck,
  ChevronRight,
  Info,
  Check,
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

  // Live on-device detection label when available; simulated brand otherwise.
  const visualDetected = session.visionEvidence?.label
    ? session.visionEvidence.label.charAt(0).toUpperCase() +
      session.visionEvidence.label.slice(1) +
      ' · ' +
      Math.round(session.visionEvidence.confidence * 100) +
      '%'
    : session.selectedPreset.detectedBrand;

  const handleSaveReport = () => {
    setReportSaved(true);
    setTimeout(() => setReportSaved(false), 2000);
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
                  <span className="font-bold text-[#B91C1C]">82% Resonance</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-600 font-mono">EXPECTED</span>
                  <span className="font-bold text-emerald-700">&gt; 95% Match</span>
                </div>
              </div>
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
