import React, { useState, useEffect } from 'react';
import { AppScreen, VerificationSession } from '../types';
import { TopAppBar } from '../components/TopAppBar';
import { BottomNav } from '../components/BottomNav';
import { NeuralSphereVisual } from '../components/ResultLogos';
import { ShieldCheck } from 'lucide-react';

interface AnalysisScreenProps {
  onNavigate: (screen: AppScreen) => void;
  session: VerificationSession;
}

export const AnalysisScreen: React.FC<AnalysisScreenProps> = ({
  onNavigate,
  session,
}) => {
  const [progress, setProgress] = useState(4);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 12;
      });
    }, 280);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      const timeout = setTimeout(() => {
        if (session.outcome === 'match') {
          onNavigate('result-match');
        } else if (session.outcome === 'mismatch') {
          onNavigate('result-mismatch');
        } else {
          onNavigate('result-clarity');
        }
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [progress, session.outcome, onNavigate]);

  const handleSkip = () => {
    if (session.outcome === 'match') {
      onNavigate('result-match');
    } else if (session.outcome === 'mismatch') {
      onNavigate('result-mismatch');
    } else {
      onNavigate('result-clarity');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white select-none">
      <TopAppBar
        title="AI Analysis"
        showShield={true}
        showBell={false}
      />

      <div className="flex-1 px-6 py-6 flex flex-col items-center justify-center space-y-6 overflow-y-auto">
        {/* Glowing Neural Sphere Visual matching Image 5 */}
        <div className="py-2 cursor-pointer" onClick={handleSkip} title="Tap to proceed">
          <NeuralSphereVisual />
        </div>

        {/* Informational Copy */}
        <div className="text-center space-y-2 max-w-xs">
          <h2 className="text-[20px] font-bold text-slate-900 tracking-tight leading-snug" style={{ fontFamily: 'var(--font-heading)' }}>
            Reviewing evidence privately on this device.
          </h2>
          <p className="text-[13px] text-slate-600 leading-relaxed">
            Analysis is performed locally to ensure your data remains secure.
          </p>
        </div>

        {/* Progress Bar & Processing Label matching Image 5 */}
        <div className="w-full max-w-xs space-y-2 pt-2">
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00A3B4] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500 font-bold">{progress}%</span>
            <span className="text-[#008D9B] font-semibold animate-pulse">Processing...</span>
          </div>
        </div>

        {/* SECURE ANALYSIS Pill matching Image 5 */}
        <div className="pt-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold font-mono tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>SECURE ANALYSIS</span>
          </div>
        </div>
      </div>

      <BottomNav currentScreen="home" onNavigate={onNavigate} />
    </div>
  );
};
