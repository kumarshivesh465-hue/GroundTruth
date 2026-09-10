import React from 'react';
import { X, BookOpen, Camera, Mic, Activity, ShieldAlert, CheckCircle } from 'lucide-react';

interface ManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManualModal: React.FC<ManualModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-teal-50 text-[#00A3B4] flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base leading-tight">Field Evidence Manual</h3>
              <p className="text-[11px] text-slate-500 font-mono">Standard Operating Protocol v3.1</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs text-slate-600">
          {/* Section 1 */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Camera className="w-4 h-4 text-[#00A3B4]" />
              <h4>1. Visual Stencil & Seal Capture</h4>
            </div>
            <p className="leading-relaxed">
              Align the full cylinder within the reticle guidelines. Confirm the top valve collar, plastic safety cap/seal, tare weight imprint, and test dates are not obscured by grease or shadows.
            </p>
            <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md text-[11px] font-medium">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Use natural light or tap the flash toggle for dimly lit hallways.</span>
            </div>
          </div>

          {/* Section 2 */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Mic className="w-4 h-4 text-[#00A3B4]" />
              <h4>2. Audio Claim Statement</h4>
            </div>
            <p className="leading-relaxed">
              State the recipient location, timestamp, and confirm the cylinder safety seal was physically inspected and intact in the customer’s presence.
            </p>
          </div>

          {/* Section 3 */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Activity className="w-4 h-4 text-[#00A3B4]" />
              <h4>3. Non-Destructive Acoustic Check</h4>
            </div>
            <p className="leading-relaxed">
              Place the smartphone approximately 10-15cm from the center belly of the cylinder. Hold steady for 5 seconds while maintaining ambient silence.
            </p>
            <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md text-[11px] font-medium">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>Safety Rule: Never tap, strike, or mechanically agitate gas containers.</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-[#00A3B4] text-white text-sm font-semibold hover:bg-[#008D9B] transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
