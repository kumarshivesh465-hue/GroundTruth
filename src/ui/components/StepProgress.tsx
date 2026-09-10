import React from 'react';

interface StepProgressProps {
  currentStep: number;
  totalSteps?: number;
  stepLabel: string;
  isBadge?: boolean;
}

export const StepProgress: React.FC<StepProgressProps> = ({
  currentStep,
  totalSteps = 4,
  stepLabel,
  isBadge = false,
}) => {
  const percentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="w-full px-5 pt-3 pb-2 select-none">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase font-mono">
          STEP {currentStep} OF {totalSteps}
        </span>

        {isBadge ? (
          <span className="px-2.5 py-0.5 rounded-full border border-teal-200 bg-teal-50 text-[#008D9B] text-[11px] font-bold tracking-wide font-mono">
            {stepLabel}
          </span>
        ) : (
          <span className="text-[11px] font-bold text-[#00A3B4] tracking-wider uppercase font-mono">
            {stepLabel}
          </span>
        )}
      </div>

      {/* Progress Track */}
      <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#00A3B4] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
