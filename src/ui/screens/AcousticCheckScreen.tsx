import React, { useState, useEffect } from 'react';
import { AppScreen, VerificationSession } from '../types';
import { TopAppBar } from '../components/TopAppBar';
import { BottomNav } from '../components/BottomNav';
import { StepProgress } from '../components/StepProgress';
import { Mic, Volume2, ShieldCheck, Pause, Play, RotateCcw, ArrowRight, Info } from 'lucide-react';

interface AcousticCheckScreenProps {
  onNavigate: (screen: AppScreen) => void;
  onOpenNotifications: () => void;
  session: VerificationSession;
  setSession: React.Dispatch<React.SetStateAction<VerificationSession>>;
}

export const AcousticCheckScreen: React.FC<AcousticCheckScreenProps> = ({
  onNavigate,
  onOpenNotifications,
  session,
  setSession,
}) => {
  const [signalQuality, setSignalQuality] = useState(18);
  const [isPaused, setIsPaused] = useState(false);
  const [ambientDb, setAmbientDb] = useState(12.4);

  // Simulate progressive acoustic signal acquisition
  useEffect(() => {
    if (isPaused) return;

    const interval = window.setInterval(() => {
      setSignalQuality((prev) => {
        if (prev >= 98) {
          return 98;
        }
        return Math.min(98, prev + 8);
      });

      // Micro variation in ambient noise
      setAmbientDb((prev) => +(11.8 + Math.random() * 1.6).toFixed(1));
    }, 450);

    return () => clearInterval(interval);
  }, [isPaused]);

  const handleTogglePause = () => {
    setIsPaused(!isPaused);
  };

  const handleRestart = () => {
    setSignalQuality(18);
    setIsPaused(false);
  };

  const handleFinishSweep = () => {
    setSession((prev) => ({
      ...prev,
      acousticSignalQuality: signalQuality,
      ambientNoiseDb: ambientDb,
      resonanceStatus: 'Stable',
    }));
    onNavigate('review-evidence');
  };

  const isSweepComplete = signalQuality >= 90;

  return (
    <div className="flex-1 flex flex-col bg-white select-none">
      <TopAppBar
        title="Acoustic Check"
        showBack={true}
        onBack={() => onNavigate('record-claim')}
        showBell={true}
        hasUnreadNotifications={true}
        onBellClick={onOpenNotifications}
      />

      <StepProgress
        currentStep={3}
        totalSteps={4}
        stepLabel="Acoustic Signal"
        isBadge={true}
      />

      <div className="flex-1 px-5 py-3 space-y-3.5 overflow-y-auto flex flex-col">
        {/* Acoustic Pulse Viewport Graphic matching Image 8 */}
        <div className="relative w-full h-44 rounded-2xl bg-gradient-to-br from-[#93A5B8] via-[#B4C5D4] to-[#C9D9E5] overflow-hidden flex flex-col items-center justify-center p-3 shadow-inner">
          {/* Animated concentric acoustic wave rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className={`w-40 h-40 rounded-full border border-cyan-400/40 ${
                !isPaused ? 'animate-ping' : ''
              }`}
              style={{ animationDuration: '3s' }}
            />
            <div
              className={`w-28 h-28 rounded-full border-2 border-cyan-300/50 ${
                !isPaused ? 'animate-pulse' : ''
              }`}
            />
            <div className="w-18 h-18 rounded-full bg-cyan-200/40 backdrop-blur-xs" />
          </div>

          {/* Central Listening Mic Node */}
          <div className="relative z-10 flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-[#00A3B4] border-2 border-white/80 shadow-md flex items-center justify-center text-white">
              <Mic className="w-7 h-7 stroke-[2.2]" />
            </div>

            <span className="mt-2 text-xs font-extrabold tracking-widest text-slate-800 uppercase font-mono">
              {isPaused ? 'PAUSED' : 'LISTENING...'}
            </span>
            <span className="text-[9px] tracking-wider text-slate-700 font-mono font-semibold opacity-85">
              SONIC PULSE EMISSION • CALIB. FREQUENCY
            </span>
          </div>
        </div>

        {/* Acoustic Sweep Title & Safety-compliant instruction */}
        <div className="space-y-1">
          <h2 className="text-[20px] font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            Acoustic Sweep
          </h2>
          <p className="text-[13px] text-slate-600 leading-snug">
            Place the phone near the cylinder and run the acoustic check to evaluate interior gas resonance.
          </p>
        </div>

        {/* Signal Quality Card matching Image 8 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 tracking-wider uppercase font-mono">
              SIGNAL QUALITY
            </span>
            <span className="text-[16px] font-extrabold text-[#00A3B4] font-mono">
              {signalQuality}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00A3B4] rounded-full transition-all duration-300"
              style={{ width: `${signalQuality}%` }}
            />
          </div>

          <div className="flex items-start gap-2 pt-1">
            <Info className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
            <p className="text-[12px] text-slate-600 leading-snug">
              Maintain silence in the environment for 5 seconds to complete the capture.
            </p>
          </div>
        </div>

        {/* Diagnostics Metrics Grid matching Image 8 */}
        <div className="grid grid-cols-2 gap-3">
          {/* Ambient Noise */}
          <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-slate-200/90">
            <span className="block text-[10px] font-bold text-slate-600 tracking-wider uppercase font-mono">
              AMBIENT NOISE
            </span>
            <div className="mt-1 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-cyan-600" />
              <span className="text-[15px] font-bold text-slate-800 font-mono">
                {ambientDb} dB
              </span>
            </div>
          </div>

          {/* Resonance */}
          <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-slate-200/90">
            <span className="block text-[10px] font-bold text-slate-600 tracking-wider uppercase font-mono">
              RESONANCE
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-[15px] font-bold text-slate-800">
                Stable
              </span>
            </div>
          </div>
        </div>

        {/* Action Button Area matching Image 8 */}
        <div className="pt-2 mt-auto pb-1 space-y-2">
          {isSweepComplete ? (
            <button
              id="complete-sweep-btn"
              onClick={handleFinishSweep}
              className="w-full h-12.5 rounded-xl bg-[#00A3B4] hover:bg-[#008D9B] active:scale-[0.99] text-white font-semibold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer text-sm"
            >
              <span>Review Evidence</span>
              <ArrowRight className="w-4.5 h-4.5" />
            </button>
          ) : (
            <button
              id="pause-acoustic-btn"
              onClick={handleTogglePause}
              className="w-full h-12.5 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] active:scale-[0.99] text-white font-semibold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer text-sm"
            >
              {isPaused ? (
                <>
                  <Play className="w-4.5 h-4.5 fill-current" />
                  <span>Resume Analysis</span>
                </>
              ) : (
                <>
                  <Pause className="w-4.5 h-4.5" />
                  <span>Pause Analysis</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={handleRestart}
            className="w-full py-1 text-center text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart Signal Capture</span>
          </button>
        </div>
      </div>

      <BottomNav currentScreen="home" onNavigate={onNavigate} />
    </div>
  );
};
