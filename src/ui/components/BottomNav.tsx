import React from 'react';
import { AppScreen } from '../types';
import { ShieldCheck, History } from 'lucide-react';

interface BottomNavProps {
  currentScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate }) => {
  const isHomeActive = currentScreen !== 'history';
  const isHistoryActive = currentScreen === 'history';

  return (
    <nav
      id="bottom-navigation-bar"
      className="sticky bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200/90 flex items-center justify-around h-15 px-6 shadow-xs select-none"
    >
      {/* Home Tab */}
      <button
        id="nav-tab-home"
        onClick={() => onNavigate('home')}
        className="relative flex-1 flex flex-col items-center justify-center h-full py-1 text-xs transition-colors cursor-pointer group"
      >
        {isHomeActive && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-[3px] bg-[#00A3B4] rounded-b-full" />
        )}
        <ShieldCheck
          className={`w-5 h-5 transition-transform group-hover:scale-105 ${
            isHomeActive ? 'text-[#00A3B4]' : 'text-slate-500'
          }`}
        />
        <span
          className={`mt-1 font-semibold text-[11px] tracking-tight ${
            isHomeActive ? 'text-[#00A3B4]' : 'text-slate-500'
          }`}
        >
          Home
        </span>
      </button>

      {/* History Tab */}
      <button
        id="nav-tab-history"
        onClick={() => onNavigate('history')}
        className="relative flex-1 flex flex-col items-center justify-center h-full py-1 text-xs transition-colors cursor-pointer group"
      >
        {isHistoryActive && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-[3px] bg-[#00A3B4] rounded-b-full" />
        )}
        <History
          className={`w-5 h-5 transition-transform group-hover:scale-105 ${
            isHistoryActive ? 'text-[#00A3B4]' : 'text-slate-500'
          }`}
        />
        <span
          className={`mt-1 font-semibold text-[11px] tracking-tight ${
            isHistoryActive ? 'text-[#00A3B4]' : 'text-slate-500'
          }`}
        >
          History
        </span>
      </button>
    </nav>
  );
};
