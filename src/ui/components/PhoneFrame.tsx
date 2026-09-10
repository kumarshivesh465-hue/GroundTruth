import React from 'react';
import { Wifi, Battery } from 'lucide-react';

interface PhoneFrameProps {
  children: React.ReactNode;
  isFramed: boolean;
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({ children, isFramed }) => {
  if (!isFramed) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex justify-center text-slate-900">
        <div className="w-full max-w-[430px] min-h-screen bg-white shadow-xl flex flex-col relative border-x border-slate-200/80">
          {/* Top Status Bar (iOS style) */}
          <div className="sticky top-0 z-40 bg-white/95 px-6 pt-2 pb-1.5 flex items-center justify-between text-[13px] font-bold text-slate-900 select-none border-b border-slate-100/50">
            <span className="font-semibold tracking-tight">9:41</span>
            <div className="flex items-center gap-1.5 text-slate-900">
              <svg className="w-4 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <rect x="2" y="16" width="3" height="6" rx="0.5" />
                <rect x="7" y="12" width="3" height="10" rx="0.5" />
                <rect x="12" y="8" width="3" height="14" rx="0.5" />
                <rect x="17" y="4" width="3" height="18" rx="0.5" />
              </svg>
              <Wifi className="w-3.5 h-3.5 stroke-[2.2]" />
              <div className="flex items-center">
                <Battery className="w-4.5 h-4.5 stroke-[2]" />
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900/95 py-6 px-2 flex items-center justify-center select-none">
      {/* Outer Phone Shell */}
      <div className="relative w-[390px] h-[844px] bg-black rounded-[52px] p-3.5 shadow-2xl ring-1 ring-slate-800 ring-offset-4 ring-offset-slate-950 flex flex-col">
        {/* Dynamic Island / Hardware Ear Speaker */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-50 flex items-center justify-between px-3 pointer-events-none">
          <div className="w-2.5 h-2.5 rounded-full bg-[#111] ring-1 ring-slate-800" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-950 ring-1 ring-emerald-500/40" />
        </div>

        {/* Screen Canvas Container */}
        <div className="w-full h-full bg-white rounded-[40px] overflow-hidden flex flex-col relative">
          {/* iOS Status Bar */}
          <div className="bg-white/95 px-7 pt-3.5 pb-1 flex items-center justify-between text-[13px] font-bold text-slate-900 select-none z-40">
            <span className="font-semibold tracking-tight text-slate-900 pl-1">9:41</span>
            <div className="flex items-center gap-1.5 text-slate-900 pr-1">
              <svg className="w-4 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <rect x="2" y="16" width="3" height="6" rx="0.5" />
                <rect x="7" y="12" width="3" height="10" rx="0.5" />
                <rect x="12" y="8" width="3" height="14" rx="0.5" />
                <rect x="17" y="4" width="3" height="18" rx="0.5" />
              </svg>
              <Wifi className="w-3.5 h-3.5 stroke-[2.2]" />
              <div className="flex items-center">
                <Battery className="w-4.5 h-4.5 stroke-[2]" />
              </div>
            </div>
          </div>

          {/* Screen Content Scrollable View */}
          <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden relative">
            {children}
          </div>

          {/* Home indicator bar at bottom */}
          <div className="bg-white py-1.5 flex justify-center select-none pointer-events-none z-40">
            <div className="w-32 h-1 bg-slate-900 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
