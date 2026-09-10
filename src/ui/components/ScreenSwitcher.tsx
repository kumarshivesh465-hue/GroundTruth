import React, { useState } from 'react';
import { AppScreen } from '../types';
import { Layers, ChevronDown, Check, Smartphone, Monitor } from 'lucide-react';

interface ScreenSwitcherProps {
  currentScreen: AppScreen;
  onSelectScreen: (screen: AppScreen) => void;
  isFramed: boolean;
  onToggleFrame: () => void;
}

const SCREENS: { id: AppScreen; label: string; tag: string }[] = [
  { id: 'home', label: '1. Home Dashboard', tag: 'Image 4' },
  { id: 'capture', label: '2. Capture Evidence (Step 1)', tag: 'Image 1' },
  { id: 'record-claim', label: '3. Record Claim (Step 2)', tag: 'Image 2' },
  { id: 'acoustic-check', label: '4. Acoustic Check (Step 3)', tag: 'Image 8' },
  { id: 'review-evidence', label: '5. Review Evidence (Step 4)', tag: 'Image 9' },
  { id: 'ai-analysis', label: '6. AI Analysis Transition', tag: 'Image 5' },
  { id: 'result-match', label: '7. Result: Evidence Match', tag: 'Image 6' },
  { id: 'result-mismatch', label: '8. Result: Evidence Mismatch', tag: 'Image 7' },
  { id: 'result-clarity', label: '9. Result: Further Clarity', tag: 'Image 3' },
  { id: 'history', label: '10. Verification History', tag: 'Image 10' },
];

export const ScreenSwitcher: React.FC<ScreenSwitcherProps> = ({
  currentScreen,
  onSelectScreen,
  isFramed,
  onToggleFrame,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const currentObj = SCREENS.find((s) => s.id === currentScreen) || SCREENS[0];

  return (
    <div className="fixed top-2 right-3 z-50 flex items-center gap-2">
      {/* Frame view toggle */}
      <button
        onClick={onToggleFrame}
        title={isFramed ? 'Switch to Full Fluid View' : 'Switch to Mobile Bezel Frame'}
        className="h-8 px-2.5 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-md border border-slate-200/90 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-xs"
      >
        {isFramed ? <Monitor className="w-3.5 h-3.5 text-teal-600" /> : <Smartphone className="w-3.5 h-3.5 text-teal-600" />}
        <span className="hidden sm:inline text-[11px]">{isFramed ? 'Fluid' : 'Frame'}</span>
      </button>

      {/* Screen Selector Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="h-8 px-3 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white shadow-md border border-slate-700/80 text-xs font-medium flex items-center gap-2 transition-all cursor-pointer backdrop-blur-xs"
        >
          <Layers className="w-3.5 h-3.5 text-teal-400" />
          <span className="max-w-[130px] truncate text-[11px] font-semibold">{currentObj.label}</span>
          <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute right-0 mt-1.5 w-64 rounded-xl bg-white shadow-2xl border border-slate-200 py-1.5 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider text-slate-600 uppercase font-mono">
                  Inspect All 10 Screens
                </span>
                <span className="text-[10px] text-teal-600 font-bold">10 / 10 Match</span>
              </div>
              <div className="max-h-[70vh] overflow-y-auto py-1">
                {SCREENS.map((screen) => {
                  const isSelected = screen.id === currentScreen;
                  return (
                    <button
                      key={screen.id}
                      onClick={() => {
                        onSelectScreen(screen.id);
                        setIsOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-50 transition-colors text-xs ${
                        isSelected ? 'bg-teal-50/80 text-[#00A3B4] font-bold' : 'text-slate-700'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span>{screen.label}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{screen.tag}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#00A3B4] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
