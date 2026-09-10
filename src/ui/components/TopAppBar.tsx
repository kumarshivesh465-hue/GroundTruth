import React from 'react';
import { ChevronLeft, Bell, ShieldCheck } from 'lucide-react';

interface TopAppBarProps {
  title: string;
  onBack?: () => void;
  showBack?: boolean;
  showShield?: boolean;
  showBell?: boolean;
  hasUnreadNotifications?: boolean;
  onBellClick?: () => void;
  rightAction?: React.ReactNode;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  title,
  onBack,
  showBack = false,
  showShield = false,
  showBell = true,
  hasUnreadNotifications = true,
  onBellClick,
  rightAction,
}) => {
  return (
    <header
      id="top-app-bar"
      className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs border-b border-slate-200/80 px-4 h-14 flex items-center justify-between select-none"
    >
      {/* Left Slot */}
      <div className="w-10 flex items-center justify-start">
        {showBack && onBack ? (
          <button
            id="top-bar-back-btn"
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-800 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
            aria-label="Go back"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
          </button>
        ) : showShield ? (
          <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-[#00A3B4]">
            <ShieldCheck className="w-5 h-5 text-[#00A3B4]" />
          </div>
        ) : (
          <div className="w-8" />
        )}
      </div>

      {/* Center Title */}
      <div className="flex-1 text-center">
        <h1
          id="top-bar-title"
          className="text-[17px] font-bold text-slate-900 tracking-tight"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {title}
        </h1>
      </div>

      {/* Right Slot */}
      <div className="w-10 flex items-center justify-end">
        {rightAction ? (
          rightAction
        ) : showBell ? (
          <button
            id="top-bar-bell-btn"
            onClick={onBellClick}
            className="relative w-9 h-9 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-slate-700 stroke-[1.8]" />
            {hasUnreadNotifications && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            )}
          </button>
        ) : (
          <div className="w-8" />
        )}
      </div>
    </header>
  );
};
