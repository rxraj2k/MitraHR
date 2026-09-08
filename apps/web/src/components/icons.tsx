// Small hand-picked set of stroke icons for the sidebar nav — plain inline
// SVG (no icon library dependency), sized/colored via `className` so they
// pick up the nav link's current text color (active/inactive) for free.
import { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M2.75 20a6.25 6.25 0 0 1 12.5 0" />
      <path d="M15.5 8.75a3 3 0 1 0 0-5.5" />
      <path d="M16.5 14.25a6.25 6.25 0 0 1 4.75 6" />
    </svg>
  );
}

export function ShareNetworkIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="m8.2 10.8 7.6-3.6" />
      <path d="m8.2 13.2 7.6 3.6" />
    </svg>
  );
}

export function CalendarCheckIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4M16 3v4" />
      <path d="m8.5 14 2.2 2.2L15.5 12" />
    </svg>
  );
}

export function BuildingIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="3.5" width="12" height="17" rx="1" />
      <path d="M16 9.5h4v11h-4" />
      <path d="M7.5 7.5h1M11.5 7.5h1M7.5 11h1M11.5 11h1M7.5 14.5h1M11.5 14.5h1" />
      <path d="M9 20.5v-4h2v4" />
    </svg>
  );
}

export function BriefcaseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2.75" y="7.5" width="18.5" height="12" rx="2" />
      <path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" />
      <path d="M2.75 13h18.5" />
      <path d="M10.5 13v1.5h3V13" />
    </svg>
  );
}

export function DatabaseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <ellipse cx="12" cy="6" rx="8" ry="3.25" />
      <path d="M4 6v6c0 1.8 3.6 3.25 8 3.25s8-1.45 8-3.25V6" />
      <path d="M4 12v6c0 1.8 3.6 3.25 8 3.25s8-1.45 8-3.25v-6" />
    </svg>
  );
}
