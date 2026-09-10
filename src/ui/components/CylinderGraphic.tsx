import React from 'react';

interface CylinderGraphicProps {
  variant?: 'red' | 'orange' | 'dark' | 'blurred';
  label?: string;
  showStamps?: boolean;
  className?: string;
  badge?: 'match' | 'mismatch' | 'none';
}

export const CylinderGraphic: React.FC<CylinderGraphicProps> = ({
  variant = 'red',
  label = 'BHARATGAS',
  showStamps = true,
  className = 'w-full h-full',
  badge = 'none',
}) => {
  const isBlurred = variant === 'blurred';
  const mainColor = variant === 'orange' ? '#D9531E' : '#B83A20';
  const shadeColor = variant === 'orange' ? '#A33910' : '#85210D';
  const lightColor = variant === 'orange' ? '#E86D38' : '#D45034';

  return (
    <div className={`relative flex items-center justify-center select-none ${className} ${isBlurred ? 'filter blur-[1.5px]' : ''}`}>
      <svg
        viewBox="0 0 320 440"
        className="w-full h-full max-h-full drop-shadow-md"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`cyl-grad-${variant}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={shadeColor} />
            <stop offset="25%" stopColor={mainColor} />
            <stop offset="55%" stopColor={lightColor} />
            <stop offset="85%" stopColor={mainColor} />
            <stop offset="100%" stopColor={shadeColor} />
          </linearGradient>

          <linearGradient id="metal-brass" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d4af37" />
            <stop offset="50%" stopColor="#f3e5ab" />
            <stop offset="100%" stopColor="#aa820a" />
          </linearGradient>

          <linearGradient id="collar-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7a1c0b" />
            <stop offset="50%" stopColor={mainColor} />
            <stop offset="100%" stopColor="#7a1c0b" />
          </linearGradient>
        </defs>

        {/* Valve assembly */}
        <rect x="150" y="70" width="20" height="28" rx="2" fill="url(#metal-brass)" />
        <path d="M142 66 H178 V72 H142 Z" fill="#c29b28" />
        <circle cx="160" cy="62" r="9" fill="#1e40af" stroke="#1d4ed8" strokeWidth="2" />
        <rect x="156" y="53" width="8" height="9" rx="1" fill="#2563eb" />

        {/* Protective Collar / Top Ring */}
        <path
          d="M112 110 V50 C112 40 208 40 208 50 V110"
          stroke="url(#collar-grad)"
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
        />
        {/* Collar Stay Braces */}
        <line x1="126" y1="52" x2="148" y2="110" stroke={shadeColor} strokeWidth="8" strokeLinecap="round" />
        <line x1="194" y1="52" x2="172" y2="110" stroke={shadeColor} strokeWidth="8" strokeLinecap="round" />
        <circle cx="160" cy="46" r="3" fill="#cbd5e1" />

        {/* Cylinder Dome / Neck */}
        <path
          d="M102 140 C102 108 218 108 218 140 Z"
          fill={`url(#cyl-grad-${variant})`}
        />

        {/* Main Body */}
        <rect
          x="94"
          y="136"
          width="132"
          height="194"
          rx="18"
          fill={`url(#cyl-grad-${variant})`}
        />

        {/* Welded center seam line */}
        <line x1="94" y1="230" x2="226" y2="230" stroke="rgba(0,0,0,0.25)" strokeWidth="2.5" />
        <line x1="94" y1="232" x2="226" y2="232" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />

        {/* Bottom Ring / Footring */}
        <rect x="100" y="322" width="120" height="28" rx="6" fill="url(#collar-grad)" />
        {/* Ventilation holes in footring */}
        <circle cx="118" cy="336" r="5" fill="#0f172a" opacity="0.8" />
        <circle cx="160" cy="336" r="5" fill="#0f172a" opacity="0.8" />
        <circle cx="202" cy="336" r="5" fill="#0f172a" opacity="0.8" />

        {/* Printed Stencils on Body matching the reference Image 1 & Image 9 */}
        {showStamps && (
          <g fill="rgba(255, 255, 255, 0.72)" textAnchor="middle" fontFamily="Inter, sans-serif">
            <text x="160" y="165" fontSize="10" fontWeight="700" letterSpacing="0.05em">LPG</text>
            <text x="160" y="178" fontSize="8.5" fontWeight="600">IS 3196</text>
            <text x="160" y="190" fontSize="8" fontWeight="500">WC 26.5 L</text>
            <text x="160" y="202" fontSize="8.5" fontWeight="700">TARE 15.2 kg</text>
            <text x="160" y="214" fontSize="7.5" fontWeight="500">MFG DATE 11/22</text>
            <text x="160" y="224" fontSize="7.5" fontWeight="500">TEST DATE 11/27</text>

            <rect x="120" y="244" width="80" height="18" rx="3" fill="rgba(0,0,0,0.2)" />
            <text x="160" y="256" fontSize="8.5" fontWeight="700" fill="#ffffff">{label}</text>
            <text x="160" y="278" fontSize="8" fontWeight="600">GAS CAPACITY 14.2 kg</text>
            <text x="160" y="292" fontSize="7" fontWeight="500" fill="rgba(255,255,255,0.6)">EMERGENCY NO. 1906</text>
          </g>
        )}
      </svg>

      {badge === 'match' && (
        <div className="absolute -bottom-2 bg-emerald-600 text-white rounded-full p-2 shadow-lg border-2 border-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </div>
  );
};
