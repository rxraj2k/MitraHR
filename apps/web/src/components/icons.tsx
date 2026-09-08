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

export function TrophyIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 4.5h10v4a5 5 0 0 1-10 0v-4Z" />
      <path d="M7 5.5H4.5a1 1 0 0 0-1 1v1a3.5 3.5 0 0 0 3.5 3.5" />
      <path d="M17 5.5h2.5a1 1 0 0 1 1 1v1a3.5 3.5 0 0 1-3.5 3.5" />
      <path d="M12 13.5v3M9 20.5h6M9.5 20.5c0-2 .8-3 2.5-3.5 1.7.5 2.5 1.5 2.5 3.5" />
    </svg>
  );
}

export function ExternalLinkIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 6H5.5a2 2 0 0 0-2 2V18a2 2 0 0 0 2 2H16a2 2 0 0 0 2-2v-3.5" />
      <path d="M14.5 4H20v5.5" />
      <path d="M20 4 11 13" />
    </svg>
  );
}

export function GraduationCapIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 9.5 12 5l9.5 4.5L12 14 2.5 9.5Z" />
      <path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" />
      <path d="M21.5 9.5V15.5" />
    </svg>
  );
}

export function ClipboardListIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="4.5" width="14" height="17" rx="2" />
      <path d="M9 4.5V3.75a1.25 1.25 0 0 1 1.25-1.25h3.5A1.25 1.25 0 0 1 15 3.75V4.5" />
      <path d="M8.5 10.5h7M8.5 14h7M8.5 17.5h4.5" />
    </svg>
  );
}

export function GridIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.5" />
      <rect x="13" y="13" width="7.5" height="7.5" rx="1.5" />
    </svg>
  );
}

export function NotebookIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4.5" y="3" width="15" height="18" rx="2" />
      <path d="M8.5 3v18" />
      <path d="M4.5 7.5h2M4.5 11h2M4.5 14.5h2" />
      <path d="M12 9h4M12 12.5h4M12 16h2.5" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5 19 6v5.5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-2.5Z" />
      <path d="m9 12 2 2 4-4.5" />
    </svg>
  );
}

export function SparkleIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21" />
      <path d="M12 8.5c0 2-1.5 3.5-3.5 3.5 2 0 3.5 1.5 3.5 3.5 0-2 1.5-3.5 3.5-3.5-2 0-3.5-1.5-3.5-3.5Z" />
    </svg>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.5 2.3 3.8 5.3 3.8 8.5s-1.3 6.2-3.8 8.5c-2.5-2.3-3.8-5.3-3.8-8.5S9.5 5.8 12 3.5Z" />
    </svg>
  );
}

export function GaugeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 16a8 8 0 0 1 16 0" />
      <path d="M12 16 15.5 10.5" />
      <circle cx="12" cy="16" r="1" />
      <path d="M4 16h1.5M18.5 16H20M6.3 9.8l1 1M17.7 9.8l-1 1M12 5v1.5" />
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
