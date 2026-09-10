import React from 'react';
import { AppScreen } from '../types';
import { TopAppBar } from '../components/TopAppBar';
import { BottomNav } from '../components/BottomNav';
import { ClarityLoopGraphic } from '../components/ResultLogos';
import {
  AlertCircle,
  Camera,
  Activity,
  ChevronRight,
  HelpCircle,
  FileText,
  RotateCcw,
} from 'lucide-react';

interface ResultClarityScreenProps {
  onNavigate: (screen: AppScreen) => void;
  onOpenNotifications: () => void;
  onOpenManual: () => void;
}

export const ResultClarityScreen: React.FC<ResultClarityScreenProps> = ({
  onNavigate,
  onOpenNotifications,
  onOpenManual,
}) => {
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
        {/* 3D Toroidal Swirl Graphic matching Image 3 */}
        <ClarityLoopGraphic />

        {/* Status Pill & Header */}
        <div className="flex flex-col items-center text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-slate-700 text-xs font-bold font-mono tracking-wider">
            <AlertCircle className="w-3.5 h-3.5 text-slate-600" />
            <span>UPDATE NEEDED</span>
          </div>

          <h2 className="text-[22px] font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            Further Clarity Required
          </h2>

          <p className="text-[13px] text-slate-600 max-w-xs leading-relaxed">
            We need a bit more detail to verify this cylinder accurately. Please update the items below.
          </p>
        </div>

        {/* Updates Needed Section matching Image 3 */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-bold text-slate-900">
              Updates Needed
            </span>
            <span className="text-xs text-slate-600 font-mono font-medium">
              2 items to clarify
            </span>
          </div>

          {/* Item 1: Visual Evidence */}
          <div
            onClick={() => onNavigate('capture')}
            className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex items-start gap-3 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
              <Camera className="w-4.5 h-4.5" />
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-xs tracking-wider uppercase font-mono">
                  VISUAL EVIDENCE
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold font-mono">
                  UNCLEAR
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-snug">
                Cylinder valve seal is blurred. A clearer photo will help complete
              </p>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 self-center transition-colors" />
          </div>

          {/* Item 2: Acoustic Sweep */}
          <div
            onClick={() => onNavigate('acoustic-check')}
            className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex items-start gap-3 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
              <Activity className="w-4.5 h-4.5" />
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-xs tracking-wider uppercase font-mono">
                  ACOUSTIC SWEEP
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold font-mono">
                  UNCLEAR
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-snug">
                The background was a bit loud. A quieter recording will provide
              </p>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 self-center transition-colors" />
          </div>
        </div>

        {/* NEED HELP? Card matching Image 3 */}
        <div className="p-4 rounded-2xl bg-[#ECFEFF] border border-[#A5F3FC] shadow-2xs space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#00A3B4] text-white flex items-center justify-center shrink-0 mt-0.5">
              <HelpCircle className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="text-xs space-y-1 flex-1">
              <h4 className="font-bold text-[#0E7490] tracking-wider uppercase font-mono">
                NEED HELP?
              </h4>
              <p className="text-slate-700 leading-relaxed font-medium">
                Watch a 30-second guide on how to capture clean acoustic and visual signals.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenManual}
            className="w-auto py-2 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs ml-11"
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span>View Manual</span>
          </button>
        </div>

        {/* Actions matching Image 3 */}
        <div className="pt-2 space-y-2 pb-2">
          <button
            id="restart-full-check-btn"
            onClick={() => onNavigate('capture')}
            className="w-full h-12.5 rounded-xl bg-[#00A3B4] hover:bg-[#008D9B] active:scale-[0.99] text-white font-semibold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer text-sm"
          >
            <RotateCcw className="w-4.5 h-4.5" />
            <span>Restart Full Check</span>
          </button>

          <button
            onClick={() => onNavigate('home')}
            className="w-full py-1.5 text-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>

      <BottomNav currentScreen="home" onNavigate={onNavigate} />
    </div>
  );
};
