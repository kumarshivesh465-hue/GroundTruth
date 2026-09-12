import React, { useState } from 'react';
import { AppScreen, VerificationSession } from '../types';
import { TopAppBar } from '../components/TopAppBar';
import { BottomNav } from '../components/BottomNav';
import { CylinderGraphic } from '../components/CylinderGraphic';
import { Camera, Mic, Activity, CheckCircle2, Play, Pause, ArrowRight, ShieldCheck, EyeOff } from 'lucide-react';
import { reconcileSession } from '../../reconcile.js';

interface ReviewEvidenceScreenProps {
  onNavigate: (screen: AppScreen) => void;
  onOpenNotifications: () => void;
  session: VerificationSession;
  setSession: React.Dispatch<React.SetStateAction<VerificationSession>>;
}

export const ReviewEvidenceScreen: React.FC<ReviewEvidenceScreenProps> = ({
  onNavigate,
  onOpenNotifications,
  session,
  setSession,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(40);

  const visualUnclear = session.visionEvidence?.status === 'unclear';

  const toggleAudioPlayback = () => {
    setIsPlayingAudio(!isPlayingAudio);
    if (!isPlayingAudio) {
      setAudioProgress(0);
      const interval = setInterval(() => {
        setAudioProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsPlayingAudio(false);
            return 100;
          }
          return prev + 10;
        });
      }, 300);
    }
  };

  const reconcileCurrentSession = () => {
    const result = reconcileSession(session);
    const outcome = result.status === 'MATCH' ? 'match' : result.status === 'MISMATCH' ? 'mismatch' : 'clarity';
    setSession((previous) => ({ ...previous, outcome, reconciliation: result }));
    return { result, outcome };
  };

  const resultScreenFor = (outcome: VerificationSession['outcome']) => {
    if (outcome === 'match') return 'result-match';
    if (outcome === 'mismatch') return 'result-mismatch';
    return 'result-clarity';
  };

  const handleRunAiReview = () => {
    reconcileCurrentSession();
    onNavigate('ai-analysis');
  };

  const handleLocalFallback = () => {
    const { outcome } = reconcileCurrentSession();
    onNavigate(resultScreenFor(outcome));
  };

  return (
    <div className="flex-1 flex flex-col bg-white select-none">
      <TopAppBar
        title="Review Evidence"
        showBack={true}
        onBack={() => onNavigate('acoustic-check')}
        showBell={true}
        hasUnreadNotifications={true}
        onBellClick={onOpenNotifications}
      />

      <div className="flex-1 px-5 py-4 space-y-4 overflow-y-auto">
        {/* Title Header */}
        <div className="space-y-1">
          <h2 className="text-[21px] font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            Verification Summary
          </h2>
          <p className="text-[13px] text-slate-600 leading-snug">
            Review all signals below. High-fidelity data ensures accurate AI authentication.
          </p>
        </div>

        {/* 1. Visual Card matching Image 9 */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-800 text-sm font-bold font-mono">
              <Camera className="w-4 h-4 text-[#00A3B4]" />
              <span>visual</span>
            </div>
            <div
              className={
                'flex items-center gap-1 text-[11px] font-bold font-mono px-2 py-0.5 rounded-full border ' +
                (visualUnclear
                  ? 'text-amber-700 bg-amber-50 border-amber-200'
                  : 'text-emerald-700 bg-emerald-50 border-emerald-200')
              }
            >
              {visualUnclear ? (
                <EyeOff className="w-3.5 h-3.5 text-amber-600" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span>{visualUnclear ? 'UNCLEAR' : 'SUCCESS'}</span>
            </div>
          </div>

          {/* Photo Preview: live captured frame when available, preset graphic otherwise */}
          <div className="w-full h-38 rounded-xl bg-[#6c6764] overflow-hidden flex items-center justify-center p-2 relative shadow-inner">
            {session.visionEvidence?.imageDataUrl ? (
              <img
                src={session.visionEvidence.imageDataUrl}
                alt="Captured evidence frame"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full max-w-[200px] flex items-center justify-center">
                <CylinderGraphic
                  variant={
                    session.outcome === 'clarity'
                      ? 'blurred'
                      : session.selectedPreset.brand === 'HP Gas'
                      ? 'orange'
                      : 'red'
                  }
                  label={session.selectedPreset.brand.toUpperCase()}
                  showStamps={true}
                />
              </div>
            )}
          </div>

          {/* Detection metadata when a live frame was captured */}
          {session.visionEvidence && (
            <div className="flex items-center justify-between px-1 text-[11px] text-slate-500 font-mono">
              <span>
                {session.visionEvidence.label ?? 'no object'} · {Math.round(session.visionEvidence.confidence * 100)}%
              </span>
              <span>Local reference comparison · {session.visionEvidence.inferenceMs}ms</span>
            </div>
          )}

          <button
            onClick={() => onNavigate('capture')}
            className="w-full py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Retake Visual
          </button>
        </div>

        {/* 2. Delivery Audio Card matching Image 9 */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-800 text-sm font-bold font-mono">
              <Mic className="w-4 h-4 text-[#00A3B4]" />
              <span>delivery</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>SUCCESS</span>
            </div>
          </div>

          {/* Audio Scrubber Bar */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <button
              onClick={toggleAudioPlayback}
              className="w-8 h-8 rounded-full bg-[#00A3B4] text-white flex items-center justify-center hover:bg-[#008D9B] transition-colors cursor-pointer shadow-xs shrink-0"
              aria-label={isPlayingAudio ? 'Pause' : 'Play'}
            >
              {isPlayingAudio ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Playback bar */}
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00A3B4] rounded-full transition-all duration-300"
                style={{ width: `${audioProgress}%` }}
              />
            </div>

            <span className="text-xs font-mono font-bold text-slate-600 shrink-0">
              0:12
            </span>
          </div>

          <button
            onClick={() => onNavigate('record-claim')}
            className="w-full py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Retake Delivery
          </button>
        </div>

        {/* 3. Acoustic Card matching Image 9 */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-800 text-sm font-bold font-mono">
              <Activity className="w-4 h-4 text-[#00A3B4]" />
              <span>acoustic</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>SUCCESS</span>
            </div>
          </div>

          {/* Waveform graphic container */}
          <div className="w-full h-16 rounded-xl bg-gradient-to-r from-slate-100 via-sky-50 to-slate-100 border border-slate-200/80 flex items-center justify-center px-4 relative overflow-hidden">
            <svg viewBox="0 0 300 60" className="w-full h-12 stroke-[#0284C7]" fill="none">
              <path
                d="M0 30 Q20 5 40 30 T80 30 T120 5 T160 55 T200 15 T240 45 T280 30 T300 30"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M0 30 Q20 15 40 30 T80 30 T120 18 T160 42 T200 24 T240 36 T280 30 T300 30"
                strokeWidth="1.2"
                strokeDasharray="4 2"
                opacity="0.6"
              />
            </svg>
          </div>

          <button
            onClick={() => onNavigate('acoustic-check')}
            className="w-full py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Retake Acoustic
          </button>
        </div>

        {/* Encrypted Local Review Banner matching Image 9 */}
        <div className="p-3.5 rounded-2xl bg-[#ECFEFF] border border-[#A5F3FC] flex items-start gap-2.5 shadow-2xs">
          <ShieldCheck className="w-5 h-5 text-[#0E7490] shrink-0 mt-0.5" />
          <p className="text-[12.5px] text-[#0E7490] leading-snug font-medium">
            Encrypted local review. No biometric data leaves this device.
          </p>
        </div>

        {/* Action Buttons matching Image 9 */}
        <div className="pt-2 space-y-2.5 pb-2">
          <button
            id="run-ai-review-btn"
            onClick={handleRunAiReview}
            className="w-full h-13 rounded-xl bg-[#00A3B4] hover:bg-[#008D9B] active:scale-[0.99] text-white font-semibold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer text-base"
          >
            <span>Run on-device AI review</span>
            <ArrowRight className="w-5 h-5 stroke-[2.2]" />
          </button>

          <button
            id="use-local-fallback-btn"
            onClick={handleLocalFallback}
            className="w-full h-11 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Use local fallback
          </button>

          <p className="text-center text-[11px] text-slate-500 font-mono pt-1">
            By submitting, you attest that this evidence was captured live.
          </p>
        </div>
      </div>

      <BottomNav currentScreen="home" onNavigate={onNavigate} />
    </div>
  );
};
