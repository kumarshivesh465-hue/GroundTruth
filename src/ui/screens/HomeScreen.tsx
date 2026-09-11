import React from 'react';
import { AppScreen, VerificationSession } from '../types';
import { TopAppBar } from '../components/TopAppBar';
import { BottomNav } from '../components/BottomNav';
import { HomeHeroBanner } from '../components/ResultLogos';
import { INITIAL_RECENT_ACTIVITY } from '../data/mockData';
import { Plus, Shield, CheckCircle2, AlertTriangle, Clock, ChevronRight, Info, Settings2 } from 'lucide-react';

interface HomeScreenProps {
  onNavigate: (screen: AppScreen) => void;
  onOpenNotifications: () => void;
  onOpenManual: () => void;
  session: VerificationSession;
  setSession: React.Dispatch<React.SetStateAction<VerificationSession>>;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  onOpenNotifications,
  onOpenManual,
  setSession,
}) => {
  const handleStartNewCheck = () => {
    // Reset session to clean starting state and open capture
    onNavigate('capture');
  };

  const handleActivityClick = (status: 'match' | 'mismatch' | 'incomplete') => {
    if (status === 'match') {
      setSession((prev) => ({
        ...prev,
        customerName: 'Anand Sharma',
        cylinderUid: 'IND-LPG-499281-B',
        outcome: 'match',
        digitalReceiptId: 'GT-8829-XQ',
      }));
      onNavigate('result-match');
    } else if (status === 'mismatch') {
      setSession((prev) => ({
        ...prev,
        customerName: 'Priya Verma',
        cylinderUid: 'IND-LPG-331089-K',
        outcome: 'mismatch',
      }));
      onNavigate('result-mismatch');
    } else {
      onNavigate('history');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white select-none">
      <TopAppBar
        title="GroundTruth"
        showShield={true}
        showBell={true}
        hasUnreadNotifications={true}
        onBellClick={onOpenNotifications}
      />

      <div className="flex-1 px-5 py-4 space-y-4 overflow-y-auto">
        {/* Hero Banner Illustration */}
        <HomeHeroBanner />

        {/* Start new check Card */}
        <div className="space-y-2">
          <h2 className="text-[22px] font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            Start new check
          </h2>
          <p className="text-[13.5px] text-slate-600 leading-relaxed">
            Begin a new cylinder verification to ensure customer safety and authenticity.
          </p>

          <button
            id="start-new-check-btn"
            onClick={handleStartNewCheck}
            className="w-full mt-2 h-13 rounded-xl bg-[#00A3B4] hover:bg-[#008D9B] active:scale-[0.99] text-white font-semibold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer text-base"
          >
            <Plus className="w-5 h-5 stroke-[2.4]" />
            <span>Start new check</span>
          </button>
        </div>

        {/* System Status Pill Card */}
        <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200/90 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-teal-50 border border-teal-200/80 flex items-center justify-center text-[#00A3B4]">
              <Shield className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-600 tracking-wider uppercase font-mono">
                SYSTEM STATUS
              </span>
              <span className="text-[13.5px] font-semibold text-slate-900">
                Local AI Engine Ready
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>ONLINE</span>
          </div>
        </div>

        <button
          id="home-open-calibration-btn"
          onClick={() => onNavigate('calibration')}
          className="w-full -mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2 text-xs font-semibold text-slate-700"><Settings2 className="w-4 h-4 text-[#00A3B4]" />Acoustic calibration &amp; backup</span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* Recent Activity List */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 tracking-wider uppercase font-mono">
              RECENT ACTIVITY
            </span>
            <button
              id="view-all-activity-link"
              onClick={() => onNavigate('history')}
              className="text-xs font-bold text-[#00A3B4] hover:underline flex items-center gap-0.5 cursor-pointer font-mono"
            >
              <span>VIEW ALL</span>
              <span>↗</span>
            </button>
          </div>

          <div className="space-y-2">
            {INITIAL_RECENT_ACTIVITY.map((item) => {
              const isMatch = item.status === 'match';
              const isMismatch = item.status === 'mismatch';

              return (
                <div
                  key={item.id}
                  onClick={() => handleActivityClick(item.status)}
                  className="p-3 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 transition-all flex items-center justify-between cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        isMatch
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : isMismatch
                          ? 'bg-red-50 text-red-600 border border-red-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {isMatch ? (
                        <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
                      ) : isMismatch ? (
                        <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
                      ) : (
                        <Clock className="w-5 h-5 stroke-[2]" />
                      )}
                    </div>

                    <div>
                      <span className="block text-[10px] font-bold text-slate-600 tracking-wider uppercase font-mono">
                        {item.category}
                      </span>
                      <h4 className="text-[14px] font-bold text-slate-900 group-hover:text-[#00A3B4] transition-colors leading-snug">
                        {item.customerName}
                      </h4>
                      <span className="text-[11.5px] text-slate-600 font-mono">
                        {item.timeString}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide font-mono ${
                        isMatch
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isMismatch
                          ? 'bg-[#B91C1C] text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {item.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Agent Tip Box */}
        <div
          onClick={onOpenManual}
          className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 flex items-start gap-3 cursor-pointer hover:bg-slate-100/80 transition-colors group"
        >
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-slate-500 mt-0.5">
            <Info className="w-4.5 h-4.5 text-slate-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 tracking-wider uppercase font-mono">
                AGENT TIP
              </span>
              <span className="text-[10px] text-[#00A3B4] font-semibold group-hover:underline">View Manual</span>
            </div>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Ensure good lighting when capturing the cylinder valve for the fastest AI recognition results.
            </p>
          </div>
        </div>
      </div>

      <BottomNav currentScreen="home" onNavigate={onNavigate} />
    </div>
  );
};
