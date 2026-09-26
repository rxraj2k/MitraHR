import { useId } from 'react';

interface MitraLogoProps {
  variant?: 'full' | 'icon'; // 'full' = icon mark + wordmark, 'icon' = mark only
  mode?: 'dark' | 'light'; // text color for the surface it sits on (dark navy vs. white)
  className?: string;
  size?: number; // icon mark height in px -- wordmark/tagline scale off of it
}

// The "Interlocking Nexus" mark -- three linked figures rendered as a
// single inline SVG (no separate asset file, so it never goes stale
// against the favicon/wordmark colors). Gradient ids are suffixed with
// useId() so multiple instances on one page (unlikely today, but cheap
// insurance) never clash by sharing <defs> ids.
export function MitraLogo({ variant = 'full', mode = 'light', className = '', size = 40 }: MitraLogoProps) {
  const uid = useId();
  const gradA = `nexusGrad1-${uid}`;
  const gradB = `nexusGrad2-${uid}`;
  const textColor = mode === 'dark' ? '#FFFFFF' : '#0F172A';
  const subtitleColor = mode === 'dark' ? '#94A3B8' : '#64748B';

  return (
    <div className={`flex items-center gap-3 flex-wrap justify-center ${className}`}>
      <svg width={size} height={size * (100 / 120)} viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id={gradA} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EC4899" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
          <linearGradient id={gradB} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
        </defs>
        <g transform="translate(0, 5)">
          {/* Left figure */}
          <path d="M 25 75 Q 15 40 40 35 Q 65 30 50 65" fill="none" stroke={`url(#${gradA})`} strokeWidth="12" strokeLinecap="round" />
          <circle cx="30" cy="18" r="9" fill="#EC4899" />
          {/* Center figure (raised, the "connector") */}
          <path d="M 50 65 Q 65 25 80 25 Q 95 25 80 65" fill="none" stroke={`url(#${gradB})`} strokeWidth="12" strokeLinecap="round" />
          <circle cx="65" cy="10" r="10" fill="#06B6D4" />
          {/* Right figure */}
          <path d="M 80 65 Q 65 30 90 35 Q 115 40 105 75" fill="none" stroke="#F59E0B" strokeWidth="12" strokeLinecap="round" />
          <circle cx="100" cy="18" r="9" fill="#F59E0B" />
        </g>
      </svg>

      {variant === 'full' && (
        <div className="flex flex-col items-center justify-center leading-none text-center">
          <span className="font-extrabold tracking-tight" style={{ color: textColor, fontSize: `${size * 0.7}px` }}>
            Mitra<span className="text-[#EC4899]">HR</span>
          </span>
          <span
            className="font-semibold tracking-[0.2em] uppercase mt-1"
            style={{ color: subtitleColor, fontSize: `${Math.max(size * 0.22, 9)}px` }}
          >
            Connecting People
          </span>
        </div>
      )}
    </div>
  );
}
