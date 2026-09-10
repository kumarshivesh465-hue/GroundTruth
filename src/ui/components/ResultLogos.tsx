import React from 'react';

/**
 * Image 6: Safe Gas Solutions logo with green checkmark around cylinder
 */
export const SafeGasMatchLogo: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-2">
      <div className="relative w-28 h-28 flex items-center justify-center">
        {/* Background cylinder silhouette */}
        <svg viewBox="0 0 100 120" className="w-20 h-24" fill="none">
          {/* Cap/valve */}
          <rect x="45" y="10" width="10" height="12" rx="2" fill="#2d6a4f" />
          <path d="M35 24 C35 15 65 15 65 24" stroke="#2d6a4f" strokeWidth="6" strokeLinecap="round" />
          {/* Main body */}
          <rect x="25" y="32" width="50" height="66" rx="8" fill="#40916c" />
          <rect x="29" y="100" width="42" height="10" rx="3" fill="#2d6a4f" />
          <line x1="25" y1="65" x2="75" y2="65" stroke="#1b4332" strokeWidth="2" opacity="0.4" />
        </svg>

        {/* Dynamic green swoosh checkmark wrapped around the cylinder */}
        <svg
          viewBox="0 0 120 120"
          className="absolute inset-0 w-full h-full drop-shadow-md"
          fill="none"
        >
          <path
            d="M26 65 L46 95 L98 25"
            stroke="#16a34a"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M26 65 L46 95 L98 25"
            stroke="#4ade80"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="mt-2 text-center">
        <span className="font-extrabold tracking-wider text-slate-800 text-[13px] uppercase font-mono">
          SAFE GAS SOLUTIONS
        </span>
      </div>
    </div>
  );
};

/**
 * Image 7: Evidence Conflict hazard triangle with cylinder and red badge
 */
export const EvidenceConflictLogo: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-2">
      <div className="relative w-32 h-28 flex items-center justify-center">
        {/* Warning Triangle */}
        <svg viewBox="0 0 120 110" className="w-28 h-28" fill="none">
          <polygon
            points="60,10 112,98 8,98"
            fill="#FFF1F0"
            stroke="#E11D48"
            strokeWidth="8"
            strokeLinejoin="round"
          />
          {/* Inner cylinder in danger color */}
          <rect x="54" y="34" width="12" height="8" rx="2" fill="#475569" />
          <path d="M46 44 C46 36 74 36 74 44" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
          <rect x="42" y="48" width="36" height="42" rx="6" fill="#64748B" />
          <line x1="42" y1="69" x2="78" y2="69" stroke="#334155" strokeWidth="2" />
        </svg>

        {/* Conflict Pill Badge overlapping triangle base */}
        <div className="absolute -bottom-2 bg-[#B91C1C] text-white px-3 py-1 rounded-full text-[11px] font-bold tracking-wider shadow flex items-center gap-1">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6zm-1 5v4h2v-4h-2zm0 6v2h2v-2h-2z" />
          </svg>
          <span>EVIDENCE CONFLICT</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Image 3: 3D Clarity loop graphic (soft pink/coral toric loop)
 */
export const ClarityLoopGraphic: React.FC = () => {
  return (
    <div className="flex items-center justify-center py-2">
      <div className="w-36 h-36 rounded-2xl bg-[#FFE4E6]/60 p-3 flex items-center justify-center shadow-inner">
        <svg viewBox="0 0 140 140" className="w-28 h-28 drop-shadow-lg" fill="none">
          <defs>
            <linearGradient id="torusGrad" x1="10%" y1="10%" x2="90%" y2="90%">
              <stop offset="0%" stopColor="#C084FC" />
              <stop offset="30%" stopColor="#FB7185" />
              <stop offset="70%" stopColor="#FDA4AF" />
              <stop offset="100%" stopColor="#818CF8" />
            </linearGradient>
            <linearGradient id="innerLoop" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F43F5E" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>

          {/* Outer ribbon fold */}
          <path
            d="M70 20 C100 20 120 45 120 75 C120 105 95 120 65 120 C35 120 20 95 20 65 C20 35 45 20 70 20 Z"
            fill="url(#torusGrad)"
            opacity="0.85"
          />
          {/* Intertwined ring layer */}
          <path
            d="M60 40 C85 40 105 55 105 80 C105 105 80 105 55 95 C35 85 40 60 60 40 Z"
            stroke="#FFF"
            strokeWidth="3"
            fill="none"
            opacity="0.6"
          />
          {/* Inner ring aperture */}
          <ellipse cx="72" cy="70" rx="22" ry="16" transform="rotate(-25 72 70)" stroke="url(#innerLoop)" strokeWidth="6" fill="#FEE2E2" />
        </svg>
      </div>
    </div>
  );
};

/**
 * Image 5: AI Analysis neural sphere with glowing synaptic dendrites
 */
export const NeuralSphereVisual: React.FC = () => {
  return (
    <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
      {/* Soft pulse glow backdrop */}
      <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-xl animate-pulse" />

      {/* Outer rotating ring */}
      <svg viewBox="0 0 200 200" className="w-44 h-44 animate-spin" style={{ animationDuration: '18s' }}>
        <circle cx="100" cy="100" r="92" stroke="rgba(0, 163, 180, 0.3)" strokeWidth="1.5" strokeDasharray="6 4" fill="none" />
        <circle cx="100" cy="100" r="82" stroke="rgba(0, 163, 180, 0.45)" strokeWidth="1.5" strokeDasharray="14 8" fill="none" />
      </svg>

      {/* Center Iris & Neural Net */}
      <div className="absolute w-36 h-36 rounded-full overflow-hidden bg-gradient-to-tr from-[#003b46] via-[#075985] to-[#38bdf8] p-1 shadow-2xl flex items-center justify-center">
        {/* Synaptic background pattern */}
        <svg viewBox="0 0 100 100" className="w-full h-full opacity-70">
          <line x1="10" y1="50" x2="90" y2="50" stroke="#a5f3fc" strokeWidth="0.8" />
          <line x1="50" y1="10" x2="50" y2="90" stroke="#a5f3fc" strokeWidth="0.8" />
          <line x1="20" y1="20" x2="80" y2="80" stroke="#67e8f9" strokeWidth="0.8" />
          <line x1="80" y1="20" x2="20" y2="80" stroke="#67e8f9" strokeWidth="0.8" />
          <circle cx="50" cy="50" r="32" stroke="#e0f2fe" strokeWidth="1.5" fill="none" />
          <circle cx="50" cy="50" r="20" fill="#0f172a" />
          <circle cx="50" cy="50" r="14" fill="#0284c7" className="animate-ping" style={{ animationDuration: '2s' }} />
          <circle cx="50" cy="50" r="8" fill="#ffffff" />
        </svg>
      </div>
    </div>
  );
};

/**
 * Image 4: Home Dashboard Hero Banner Illustration (Agent Portal kiosk & officer)
 */
export const HomeHeroBanner: React.FC = () => {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-br from-[#dbeafe] via-[#eff6ff] to-[#f0fdf4] p-3.5 border border-slate-200/80 shadow-xs">
      <div className="flex items-start justify-between">
        {/* Top Badges */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/90 border border-slate-200 text-[10px] font-bold text-slate-700 tracking-wider font-mono shadow-2xs">
          <svg className="w-3 h-3 text-cyan-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
          </svg>
          <span>TRUST & SAFETY | DIGITAL VERIFICATION</span>
        </div>
      </div>

      {/* Illustrated kiosk & inspector scene */}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="w-32 h-28 relative">
          {/* Smart Kiosk Unit */}
          <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-sm">
            {/* Base */}
            <rect x="25" y="45" width="45" height="70" rx="8" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="2" />
            <rect x="30" y="52" width="35" height="30" rx="4" fill="#00A3B4" />
            {/* Screen */}
            <rect x="33" y="55" width="29" height="24" rx="2" fill="#F0FDFA" />
            <path d="M42 66 L46 70 L54 62" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Fingerprint / scanner slot */}
            <circle cx="47" cy="94" r="7" fill="#0284C7" />
            <circle cx="47" cy="94" r="4" fill="#E0F2FE" />
          </svg>
          <span className="absolute bottom-1 left-2 bg-[#00A3B4] text-white text-[9px] font-bold px-2 py-0.5 rounded tracking-wide font-mono">
            AGENT PORTAL
          </span>
        </div>

        {/* Inspector Agent with phone */}
        <div className="w-36 h-28 relative flex items-end justify-center">
          <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-sm">
            {/* Hair */}
            <ellipse cx="65" cy="36" rx="20" ry="18" fill="#472A2B" />
            {/* Face */}
            <ellipse cx="65" cy="40" rx="14" ry="15" fill="#FED7AA" />
            {/* Smile & eyes */}
            <circle cx="61" cy="38" r="1.5" fill="#1E293B" />
            <circle cx="69" cy="38" r="1.5" fill="#1E293B" />
            <path d="M63 46 Q65 49 69 46" stroke="#9A3412" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            {/* Blouse */}
            <path d="M45 68 C45 54 85 54 85 68 L90 120 H40 Z" fill="#93C5FD" />
            <path d="M57 58 L65 72 L73 58" fill="#FED7AA" />
            {/* Skirt */}
            <rect x="42" y="96" width="46" height="24" fill="#475569" />
            {/* Arm holding phone */}
            <path d="M48 68 L32 88 L40 92" stroke="#FED7AA" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            {/* Smartphone device */}
            <rect x="36" y="74" width="14" height="22" rx="3" fill="#1E293B" />
            <rect x="38" y="76" width="10" height="18" rx="2" fill="#38BDF8" />
          </svg>
        </div>
      </div>
    </div>
  );
};
