import React, { useState, useEffect, useRef } from 'react';
import { AppScreen, VerificationSession } from '../types';
import { TopAppBar } from '../components/TopAppBar';
import { BottomNav } from '../components/BottomNav';
import { StepProgress } from '../components/StepProgress';
import { Mic, AlertCircle, ArrowRight, Square, RotateCcw, Volume2 } from 'lucide-react';

interface RecordClaimScreenProps {
  onNavigate: (screen: AppScreen) => void;
  session: VerificationSession;
  setSession: React.Dispatch<React.SetStateAction<VerificationSession>>;
}

export const RecordClaimScreen: React.FC<RecordClaimScreenProps> = ({
  onNavigate,
  session,
  setSession,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [recorded, setRecorded] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const handleToggleRecord = () => {
    if (!isRecording) {
      setIsRecording(true);
      setSeconds(0);
      setRecorded(false);
    } else {
      setIsRecording(false);
      const finalSec = Math.max(seconds, 6);
      setSeconds(finalSec);
      setRecorded(true);
      setSession((prev) => ({
        ...prev,
        audioDurationSeconds: finalSec,
        hasRecordedAudio: true,
      }));
    }
  };

  const handleResetRecord = () => {
    setIsRecording(false);
    setSeconds(0);
    setRecorded(false);
  };

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleContinue = () => {
    if (!recorded) {
      // Set default 12 seconds if skipped straight to acoustic check
      setSession((prev) => ({
        ...prev,
        audioDurationSeconds: 12,
        hasRecordedAudio: true,
      }));
    }
    onNavigate('acoustic-check');
  };

  return (
    <div className="flex-1 flex flex-col bg-white select-none">
      <TopAppBar
        title="Record Claim"
        showBack={true}
        onBack={() => onNavigate('capture')}
        showBell={false}
      />

      <StepProgress
        currentStep={2}
        totalSteps={4}
        stepLabel="AUDIO VERIFICATION"
        isBadge={false}
      />

      <div className="flex-1 px-5 py-3 space-y-4 overflow-y-auto flex flex-col">
        {/* Info callout box matching Image 2 */}
        <div className="p-3.5 rounded-2xl bg-[#ECFEFF] border border-[#A5F3FC] flex items-start gap-3 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-[#0E7490] shrink-0 mt-0.5" />
          <p className="text-[13px] text-[#0E7490] leading-snug font-medium">
            Please state the delivery location, time, and confirm that the cylinder seal was checked in front of the customer.
          </p>
        </div>

        {/* Dark Audio Recording Container matching Image 2 */}
        <div className="w-full bg-[#0F172A] rounded-2xl p-5 flex flex-col items-center justify-between min-h-[220px] shadow-md relative overflow-hidden">
          {/* Subtle phone/soundscape sessions visualizer */}
          <div className="relative w-full flex-1 flex flex-col items-center justify-center">
            {/* Waveform graphic bars */}
            <div className="flex items-center gap-1.5 h-16 justify-center my-2">
              {[18, 35, 60, 85, 45, 95, 70, 40, 65, 80, 50, 90, 75, 40, 25].map(
                (h, i) => (
                  <div
                    key={i}
                    className="w-1.5 rounded-full bg-gradient-to-t from-[#0284C7] to-[#38BDF8] transition-all duration-200"
                    style={{
                      height: isRecording
                        ? `${Math.max(12, Math.min(100, h * (0.6 + Math.random() * 0.8)))}%`
                        : recorded
                        ? `${h * 0.7}%`
                        : '20%',
                      opacity: isRecording ? 1 : recorded ? 0.85 : 0.4,
                    }}
                  />
                )
              )}
            </div>

            {/* Monospace Digital Timer */}
            <div className="text-3xl font-bold tracking-widest text-white font-mono my-1">
              {formatTimer(seconds)}
            </div>

            <span className="text-[11px] text-slate-400 font-mono tracking-wider">
              {isRecording ? 'RECORDING LIVE AUDIO...' : recorded ? 'RECORDING COMPLETE' : 'AUDIO CLAIM BUFFER'}
            </span>
          </div>

          {/* Background subtle radial glow */}
          {isRecording && (
            <div className="absolute inset-0 bg-cyan-500/10 pointer-events-none animate-pulse" />
          )}
        </div>

        {/* Recording Guidance and Button Area matching Image 2 */}
        <div className="flex flex-col items-center justify-center space-y-3 py-1">
          <p className="text-center text-[13.5px] text-slate-600 font-medium">
            {isRecording
              ? 'Speaking... tap square to finish.'
              : recorded
              ? 'Claim voice record ready for review.'
              : 'Tap the button below to start recording your claim.'}
          </p>

          <div className="flex items-center justify-center gap-4">
            {recorded && (
              <button
                onClick={handleResetRecord}
                className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                title="Rerecord"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            {/* Round Cyan Microphone Button */}
            <div className="relative flex items-center justify-center">
              {isRecording && (
                <div className="absolute w-20 h-20 rounded-full bg-cyan-400/30 animate-ping" />
              )}
              <button
                id="toggle-record-claim-btn"
                onClick={handleToggleRecord}
                className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-all active:scale-95 cursor-pointer z-10 ${
                  isRecording
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-[#00A3B4] hover:bg-[#008D9B]'
                }`}
                aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
              >
                {isRecording ? (
                  <Square className="w-6 h-6 fill-current" />
                ) : (
                  <Mic className="w-7 h-7 stroke-[2.2]" />
                )}
              </button>
            </div>

            {recorded && (
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Volume2 className="w-4.5 h-4.5" />
              </div>
            )}
          </div>
        </div>

        {/* Action Button: "Continue to Acoustic Check ->" */}
        <div className="pt-2 mt-auto pb-2">
          <button
            id="continue-to-acoustic-btn"
            onClick={handleContinue}
            className="w-full h-13 rounded-xl bg-[#00A3B4] hover:bg-[#008D9B] active:scale-[0.99] text-white font-semibold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer text-base"
          >
            <span>Continue to Acoustic Check</span>
            <ArrowRight className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>
      </div>

      <BottomNav currentScreen="home" onNavigate={onNavigate} />
    </div>
  );
};
