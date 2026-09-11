import React from 'react';
import { VisionEvidence } from '../types';
import { Eye, EyeOff } from 'lucide-react';

interface VisionEvidenceCardProps {
  evidence: VisionEvidence | null;
  /** Compact variant omits the frame thumbnail (used inside result screens). */
  compact?: boolean;
  className?: string;
}

export const VisionEvidenceCard: React.FC<VisionEvidenceCardProps> = ({
  evidence,
  compact = false,
  className = '',
}) => {
  if (!evidence) return null;

  const detected = evidence.status === 'detected';
  const palette = detected
    ? 'bg-teal-50 border-teal-200 text-teal-800'
    : 'bg-amber-50 border-amber-200 text-amber-800';
  const iconColor = detected ? 'text-teal-600' : 'text-amber-600';

  return (
    <div
      className={
        'p-3.5 rounded-2xl border flex items-center gap-3 shadow-2xs ' +
        palette +
        (className ? ' ' + className : '')
      }
    >
      {!compact && (
        <img
          src={evidence.imageDataUrl}
          alt="Captured evidence frame"
          className="w-14 h-14 rounded-xl object-cover border border-white shadow-sm shrink-0 bg-white"
        />
      )}
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5">
          {detected ? (
            <Eye className={'w-4 h-4 shrink-0 ' + iconColor} />
          ) : (
            <EyeOff className={'w-4 h-4 shrink-0 ' + iconColor} />
          )}
          <span className="text-[12px] font-bold tracking-wide">
            VISUAL FRAME · {detected ? 'DETECTED' : 'UNCLEAR'}
          </span>
        </div>
        <span className="text-[12px] text-slate-700 font-medium truncate">
          {evidence.label} · {Math.round(evidence.confidence * 100)}% confidence
        </span>
        <span className="text-[11px] text-slate-500 font-mono">
          Local reference comparison · {evidence.inferenceMs}ms
        </span>
      </div>
    </div>
  );
};
