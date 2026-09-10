import React, { useState } from 'react';
import { AppScreen, HistoryRecord, VerificationSession } from '../types';
import { TopAppBar } from '../components/TopAppBar';
import { BottomNav } from '../components/BottomNav';
import { INITIAL_HISTORY } from '../data/mockData';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  MapPin,
  FileCheck,
  Calendar,
  ChevronRight,
  Info,
  X,
} from 'lucide-react';

interface HistoryScreenProps {
  onNavigate: (screen: AppScreen) => void;
  onOpenNotifications: () => void;
  setSession: React.Dispatch<React.SetStateAction<VerificationSession>>;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  onNavigate,
  onOpenNotifications,
  setSession,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'match' | 'mismatch' | 'incomplete'>('all');
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>('rec-1');

  const toggleExpand = (id: string) => {
    setExpandedRecordId(expandedRecordId === id ? null : id);
  };

  const handleViewReceipt = (rec: HistoryRecord) => {
    if (rec.status === 'match') {
      setSession((prev) => ({
        ...prev,
        customerName: rec.customerName,
        cylinderUid: rec.cylinderId,
        digitalReceiptId: rec.digitalReceiptId || 'GT-8829-XQ',
        outcome: 'match',
      }));
      onNavigate('result-match');
    } else if (rec.status === 'mismatch') {
      onNavigate('result-mismatch');
    }
  };

  const filteredRecords = INITIAL_HISTORY.filter((rec) => {
    const matchesFilter =
      activeFilter === 'all' ? true : rec.status === activeFilter;

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      rec.recordId.toLowerCase().includes(q) ||
      rec.customerName.toLowerCase().includes(q) ||
      rec.cylinderId.toLowerCase().includes(q);

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col bg-white select-none">
      <TopAppBar
        title="Verification History"
        showShield={true}
        showBell={true}
        hasUnreadNotifications={true}
        onBellClick={onOpenNotifications}
      />

      <div className="flex-1 px-5 py-4 space-y-4 overflow-y-auto">
        {/* Search Input Bar matching Image 10 */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            id="history-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ID, customer, or cylinder..."
            className="w-full h-11 pl-10 pr-9 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00A3B4]/40 focus:border-[#00A3B4] text-xs text-slate-900 placeholder:text-slate-400 font-medium transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills matching Image 10 */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-1.5 rounded-full font-semibold transition-all cursor-pointer shrink-0 ${
              activeFilter === 'all'
                ? 'bg-[#00A3B4] text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Records
          </button>

          <button
            onClick={() => setActiveFilter('match')}
            className={`px-4 py-1.5 rounded-full font-semibold transition-all cursor-pointer shrink-0 ${
              activeFilter === 'match'
                ? 'bg-[#00A3B4] text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Matches
          </button>

          <button
            onClick={() => setActiveFilter('mismatch')}
            className={`px-4 py-1.5 rounded-full font-semibold transition-all cursor-pointer shrink-0 ${
              activeFilter === 'mismatch'
                ? 'bg-[#00A3B4] text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Mismatches
          </button>

          <button
            onClick={() => setActiveFilter('incomplete')}
            className={`px-4 py-1.5 rounded-full font-semibold transition-all cursor-pointer shrink-0 ${
              activeFilter === 'incomplete'
                ? 'bg-[#00A3B4] text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Incomplete
          </button>
        </div>

        {/* Accordion Record Cards List matching Image 10 */}
        <div className="space-y-3">
          {filteredRecords.map((rec) => {
            const isExpanded = expandedRecordId === rec.id;
            const isMatch = rec.status === 'match';
            const isMismatch = rec.status === 'mismatch';

            return (
              <div
                key={rec.id}
                className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs transition-all"
              >
                {/* Header row */}
                <div
                  onClick={() => toggleExpand(rec.id)}
                  className="p-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-500 font-mono">
                      {rec.recordId}
                    </span>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono ${
                          isMatch
                            ? 'bg-emerald-600 text-white'
                            : isMismatch
                            ? 'bg-[#B91C1C] text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isMatch && <CheckCircle2 className="w-3 h-3" />}
                        {isMismatch && <AlertTriangle className="w-3 h-3" />}
                        {!isMatch && !isMismatch && <Clock className="w-3 h-3" />}
                        <span className="capitalize">{rec.status}</span>
                      </span>

                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  <h3 className="text-[15px] font-bold text-slate-900 leading-tight">
                    {rec.customerName}
                  </h3>

                  <div className="mt-1 flex items-center gap-2 text-slate-500 text-xs font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{rec.date}</span>
                    </span>
                    <span>▪</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{rec.time}</span>
                    </span>
                  </div>
                </div>

                {/* Expanded Details Section matching Image 10 */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-3 animate-in fade-in-50 duration-150">
                    <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                      <div>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-600 font-mono uppercase">
                          <Info className="w-3 h-3 text-slate-400" />
                          CYLINDER ID
                        </span>
                        <span className="font-bold text-slate-900 font-mono text-[12.5px] mt-0.5 block">
                          {rec.cylinderId}
                        </span>
                      </div>

                      <div>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-600 font-mono uppercase">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          ADDRESS
                        </span>
                        <span className="text-slate-800 text-[12px] mt-0.5 block leading-tight font-medium">
                          {rec.address || 'Standard Delivery Address'}
                        </span>
                      </div>
                    </div>

                    {/* VERIFICATION SIGNALS badges matching Image 10 */}
                    <div className="space-y-1.5 pt-1">
                      <span className="block text-[10px] font-bold text-slate-600 font-mono uppercase">
                        VERIFICATION SIGNALS
                      </span>

                      <div className="flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                          <FileCheck className="w-3 h-3 text-emerald-600" />
                          <span>Visual Frame</span>
                        </span>

                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                          <Clock className="w-3 h-3 text-emerald-600" />
                          <span>Acoustic Sweep</span>
                        </span>

                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                          <span className="text-emerald-600 text-xs">↘</span>
                          <span>Audio Record</span>
                        </span>
                      </div>
                    </div>

                    {/* View Full Digital Receipt Button matching Image 10 */}
                    <div className="pt-2">
                      <button
                        onClick={() => handleViewReceipt(rec)}
                        className="w-full py-2 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span>View Full Digital Receipt</span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer info note matching Image 10 */}
        <div className="text-center pt-2 pb-4 space-y-0.5">
          <p className="text-[11.5px] text-slate-600">
            Showing {filteredRecords.length} local records on this device.
          </p>
          <p className="text-[11px] text-slate-500 font-mono">
            Records are cleared after 30 days.
          </p>
        </div>
      </div>

      <BottomNav currentScreen="history" onNavigate={onNavigate} />
    </div>
  );
};
