import React from 'react';
import { X, Bell, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-teal-50 text-[#00A3B4] flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Field Notifications</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <div className="flex items-center justify-between font-bold text-amber-900">
                <span>Cylinder Audit Advisory</span>
                <span className="text-[10px] text-amber-700 font-mono">10m ago</span>
              </div>
              <p className="mt-1 text-amber-800 leading-relaxed">
                Regional safety notice: Double check collar tare weights on batch IND-LPG-499 series for domestic 14.2kg cylinders.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200/80 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <div className="flex items-center justify-between font-bold text-teal-900">
                <span>Model Engine v2.4 Loaded</span>
                <span className="text-[10px] text-teal-700 font-mono">1h ago</span>
              </div>
              <p className="mt-1 text-teal-800 leading-relaxed">
                Local edge neural pipeline calibrated for fast offline acoustic resonance checking and stenciling OCR.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
            <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span>Offline Storage Quota</span>
                <span className="text-[10px] text-slate-500 font-mono">Yesterday</span>
              </div>
              <p className="mt-1 text-slate-600 leading-relaxed">
                4 local inspection reports stored on this device. Encrypted records are maintained for 30 days.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-[#00A3B4] text-white text-sm font-semibold hover:bg-[#008D9B] transition-colors"
          >
            Dismiss All
          </button>
        </div>
      </div>
    </div>
  );
};
