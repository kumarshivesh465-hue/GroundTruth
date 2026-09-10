import React, { useState } from 'react';
import { AppScreen, VerificationSession } from '../types';
import { TopAppBar } from '../components/TopAppBar';
import { BottomNav } from '../components/BottomNav';
import { SafeGasMatchLogo } from '../components/ResultLogos';
import {
  CheckCircle2,
  ShieldCheck,
  Fingerprint,
  Calendar,
  Clock,
  FileText,
  Download,
  Share2,
  ArrowRight,
  ChevronRight,
  Check,
} from 'lucide-react';

interface ResultMatchScreenProps {
  onNavigate: (screen: AppScreen) => void;
  onOpenNotifications: () => void;
  session: VerificationSession;
}

export const ResultMatchScreen: React.FC<ResultMatchScreenProps> = ({
  onNavigate,
  onOpenNotifications,
  session,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleShare = () => {
    const text = `GroundTruth Verified Cylinder: ${session.cylinderUid} | Digital Receipt: ${session.digitalReceiptId} | Confidence: 99.8%`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col bg-white select-none">
      <TopAppBar
        title="Verification Result"
        showBack={true}
        onBack={() => onNavigate('home')}
        showBell={true}
        hasUnreadNotifications={true}
        onBellClick={onOpenNotifications}
      />

      <div className="flex-1 px-5 py-3 space-y-4 overflow-y-auto">
        {/* Safe Gas Solutions Logo matching Image 6 */}
        <SafeGasMatchLogo />

        {/* Status Pill & Header */}
        <div className="flex flex-col items-center text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Evidence match</span>
          </div>

          <h2 className="text-[24px] font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            Evidence match
          </h2>

          <p className="text-[13px] text-slate-600 max-w-xs leading-relaxed">
            The captured acoustic and visual signals are in agreement.
          </p>
        </div>

        {/* EVIDENCE SUMMARY Card matching Image 6 */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 font-mono tracking-wider uppercase">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>EVIDENCE SUMMARY</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs divide-y divide-slate-100 text-xs">
            {/* Cylinder UID */}
            <div className="py-2.5 flex items-center justify-between first:pt-1">
              <div className="flex items-center gap-2 text-slate-500 font-medium">
                <Fingerprint className="w-4 h-4 text-slate-400" />
                <span>Cylinder UID</span>
              </div>
              <span className="font-bold text-slate-900 font-mono text-[13px]">
                {session.cylinderUid}
              </span>
            </div>

            {/* Date */}
            <div className="py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500 font-medium">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Date</span>
              </div>
              <span className="font-bold text-slate-800 font-mono">
                OCT 24, 2023
              </span>
            </div>

            {/* Time */}
            <div className="py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500 font-medium">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Time</span>
              </div>
              <span className="font-bold text-slate-800 font-mono">
                14:32:08 PM
              </span>
            </div>

            {/* AI Confidence */}
            <div className="py-2.5 flex items-center justify-between last:pb-1">
              <div className="flex items-center gap-2 text-slate-500 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>AI Confidence</span>
              </div>
              <span className="font-bold text-slate-900 font-mono text-[13px]">
                99.8%
              </span>
            </div>
          </div>
        </div>

        {/* DIGITAL RECEIPT Card matching Image 6 */}
        <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-800 font-mono">
              <FileText className="w-4 h-4 text-[#00A3B4]" />
              <span>DIGITAL RECEIPT</span>
            </div>
            <span className="text-[11px] font-bold text-slate-500 font-mono">
              ID: {session.digitalReceiptId}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleDownload}
              className="py-2 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              {downloaded ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-slate-500" />
                  <span>Download</span>
                </>
              )}
            </button>

            <button
              onClick={handleShare}
              className="py-2 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-slate-500" />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action Button & Link matching Image 6 */}
        <div className="pt-2 space-y-2 pb-2">
          <button
            id="start-new-verification-btn"
            onClick={() => onNavigate('capture')}
            className="w-full h-13 rounded-xl bg-[#00A3B4] hover:bg-[#008D9B] active:scale-[0.99] text-white font-semibold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer text-base uppercase font-mono"
          >
            <span>START NEW VERIFICATION</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          <button
            onClick={() => onNavigate('history')}
            className="w-full py-1.5 text-center text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <span>View History</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <BottomNav currentScreen="home" onNavigate={onNavigate} />
    </div>
  );
};
