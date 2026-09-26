import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { getOfficeWallOnline } from '../lib/api';
import { MitraLogo } from '../components/common/MitraLogo';
import GlobalSearch from '../components/GlobalSearch';
import NotificationBell from '../components/NotificationBell';
import UserProfileMenu from '../components/UserProfileMenu';
import {
  BriefcaseIcon,
  BuildingIcon,
  CalendarCheckIcon,
  ChartBarIcon,
  ChevronDownIcon,
  ClipboardListIcon,
  UserPlusIcon,
  TrophyIcon,
  DatabaseIcon,
  FileTextIcon,
  GaugeIcon,
  GraduationCapIcon,
  GridIcon,
  HeartIcon,
  HomeIcon,
  PackageIcon,
  ShareNetworkIcon,
  ShieldIcon,
  ShuffleIcon,
  SparkleIcon,
  TeamIcon,
  UserCircleIcon,
  UsersIcon,
} from '../components/icons';

// The left sidebar is a plain, always-on module list now (per his Zoho
// People reference screenshots: the sidebar there never changes when you
// switch top-level sections). My Space/My Team/Organization live entirely
// in the header instead — the 3D switcher buttons plus a secondary tab
// strip underneath for whichever space is active — never touching this
// list. Home is pinned separately (rendered unconditionally, see below).
//
// Each entry is either a direct link, or a "drawer" grouping a handful of
// real, distinct routes that share one domain. Investigation for the
// vibrant-sidebar redesign found exactly one cluster worth grouping this
// way — Client Management / Project Management / Bench & Utilization /
// Staffing Sandbox are four separate, real pages that together make up
// "Projects" as a section, the same way the Projects nav used to read as a
// block. Everything else here routes to one page with no sibling views, so
// it stays a flat link rather than being forced into an artificial group.
interface FlatNavItem {
  type: 'link';
  to: string;
  label: string;
  end?: boolean;
  icon: typeof HomeIcon;
  adminOnly?: boolean;
}
interface DrawerNavItem {
  type: 'drawer';
  key: string;
  label: string;
  icon: typeof HomeIcon;
  children: { to: string; label: string; icon: typeof HomeIcon }[];
  adminOnly?: boolean;
}
type NavEntry = FlatNavItem | DrawerNavItem;

const STAFF_NAV_ITEMS: NavEntry[] = [
  { type: 'link', to: '/employees', label: 'Talent Directory', end: false, icon: UsersIcon },
  { type: 'link', to: '/org-chart', label: 'Team Topology', end: false, icon: ShareNetworkIcon },
  { type: 'link', to: '/leave', label: 'Leaves & Attendance', end: false, icon: CalendarCheckIcon },
  {
    type: 'drawer',
    key: 'projects',
    label: 'Projects & Clients',
    icon: BriefcaseIcon,
    children: [
      { to: '/clients', label: 'Client Management', icon: BuildingIcon },
      { to: '/projects', label: 'Project Management', icon: BriefcaseIcon },
      { to: '/utilization', label: 'Bench & Utilization', icon: GaugeIcon },
      { to: '/staffing-sandbox', label: 'Staffing Sandbox', icon: ShuffleIcon },
    ],
  },
  { type: 'link', to: '/training', label: 'Learning Center', end: false, icon: GraduationCapIcon },
  { type: 'link', to: '/assets', label: 'Asset Management', end: false, icon: PackageIcon },
  { type: 'link', to: '/documents', label: 'Document Management', end: false, icon: FileTextIcon },
  { type: 'link', to: '/exits', label: 'Exit & Clearance', end: false, icon: ClipboardListIcon },
  { type: 'link', to: '/recruitment', label: 'Recruitment', end: false, icon: UserPlusIcon },
  { type: 'link', to: '/performance', label: 'Performance & Goals', end: false, icon: TrophyIcon },
  { type: 'link', to: '/engagement', label: 'Engagement & Feedback', end: false, icon: HeartIcon },
  { type: 'link', to: '/reports', label: 'Reports & Analytics', end: false, icon: ChartBarIcon },
  // Administrator-only (filtered out below for HR/Manager/IT Support) --
  // sits directly above Master Data per his placement request.
  { type: 'link', to: '/admin-center', label: 'Admin Center', end: false, icon: ShieldIcon, adminOnly: true },
  { type: 'link', to: '/settings', label: 'Master Data', end: false, icon: DatabaseIcon },
];

const EMPLOYEE_NAV_ITEMS: NavEntry[] = [
  { type: 'link', to: '/employees', label: 'Talent Directory', end: false, icon: UsersIcon },
  { type: 'link', to: '/org-chart', label: 'Team Topology', end: false, icon: ShareNetworkIcon },
  { type: 'link', to: '/my-leave', label: 'My Leaves & Attendance', end: false, icon: CalendarCheckIcon },
  { type: 'link', to: '/my-learning', label: 'My Learning', end: false, icon: GraduationCapIcon },
  { type: 'link', to: '/my-performance', label: 'My Performance', end: false, icon: TrophyIcon },
  { type: 'link', to: '/engagement', label: 'Engagement & Feedback', end: false, icon: HeartIcon },
];

// A fixed, vibrant two-stop gradient per module -- its visual identity,
// independent of the active chrome theme (the same way the header's
// My Space/My Team/Organization pills keep their own colors regardless of
// theme). Keyed by route so a route reuses the same identity whether it
// shows as a flat item (staff) or inside "My ..." (employee).
const NAV_GRADIENTS: Record<string, [string, string]> = {
  '/employees': ['#38BDF8', '#2563EB'],
  '/org-chart': ['#C084FC', '#7C3AED'],
  '/leave': ['#34D399', '#0D9488'],
  '/my-leave': ['#34D399', '#0D9488'],
  '/clients': ['#FBBF24', '#F97316'],
  '/projects': ['#818CF8', '#4338CA'],
  '/utilization': ['#67E8F9', '#0E7490'],
  '/staffing-sandbox': ['#E879F9', '#A21CAF'],
  '/training': ['#A3E635', '#4D7C0F'],
  '/my-learning': ['#A3E635', '#4D7C0F'],
  '/assets': ['#FDA4AF', '#BE123C'],
  '/documents': ['#FDE68A', '#92400E'],
  '/exits': ['#FCA5A5', '#991B1B'],
  '/recruitment': ['#7DD3FC', '#0369A1'],
  '/performance': ['#FDE047', '#CA8A04'],
  '/my-performance': ['#FDE047', '#CA8A04'],
  '/engagement': ['#F9A8D4', '#DB2777'],
  '/reports': ['#93C5FD', '#1D4ED8'],
  '/admin-center': ['#FCA5A5', '#DC2626'],
  '/settings': ['#A5B4FC', '#4F46E5'],
};
const DEFAULT_GRADIENT: [string, string] = ['#94A3B8', '#475569'];
// The drawer header's own chip color -- the cluster's identity as a whole,
// distinct from any one child's color.
const DRAWER_GRADIENTS: Record<string, [string, string]> = {
  projects: ['#A78BFA', '#4F46E5'],
};

interface SpaceSubNavItem {
  to: string;
  label: string;
}

interface Space {
  key: string;
  label: string;
  icon: typeof HomeIcon;
  basePath: string;
  subNav: SpaceSubNavItem[];
  // Paths outside this space's own basePath that should still count as
  // "inside" it for active-state detection — e.g. Organization's Talent
  // Directory sub-nav item points at the pre-existing /employees page
  // rather than duplicating it under /organization.
  extraActivePaths?: string[];
}

// The three Zoho-People-style "operational spaces". The switcher button
// navigates to basePath (which index-redirects to the first sub-view, see
// App.tsx); subNav then renders as the secondary tab strip under the
// header, exactly like Zoho's own "Overview / Dashboard" row under
// "My Space / Team / Organization".
function buildSpaces(isStaff: boolean): Space[] {
  return [
  {
    key: 'my-space',
    label: 'My Space',
    icon: UserCircleIcon,
    basePath: '/my-space',
    subNav: [
      { to: '/my-space/summary', label: 'Overview' },
      { to: '/my-space/attendance-leave', label: 'Attendance & Leaves' },
      { to: '/my-space/approvals-documents', label: 'My Approvals & Documents' },
      { to: '/my-performance', label: 'Performance & Goals' },
    ],
    extraActivePaths: ['/my-performance'],
  },
  {
    key: 'my-team',
    label: 'My Team',
    icon: TeamIcon,
    basePath: '/my-team',
    subNav: [
      { to: '/my-team/direct-reports', label: 'Direct Reports' },
      { to: '/my-team/attendance-approvals', label: 'Team Attendance & Approvals' },
      { to: '/my-team/tree', label: 'Team Topology' },
    ],
  },
  {
    key: 'organization',
    label: 'Organization',
    icon: GridIcon,
    basePath: '/organization',
    subNav: [
      { to: '/organization/overview', label: 'Overview' },
      { to: '/employees', label: 'Talent Directory' },
      { to: '/organization/department-tree', label: 'Department Tree' },
      { to: '/organization/announcements-policies', label: 'Announcements & Policies' },
      { to: isStaff ? '/performance' : '/my-performance', label: 'Performance & Goals' },
    ],
    extraActivePaths: isStaff ? ['/employees', '/performance'] : ['/employees', '/my-performance'],
  },
  ];
}

// Color identity per space for the header's 3D switcher buttons — exact
// hex codes from the nav spec. `inactive` is a soft, still-colorful tinted
// gradient (not gray) so all three read as colorful at rest per his
// feedback; `hover` (folded into the inactive string below) deepens that
// tint; `active` is the fully saturated gradient + glow ring + lift.
// Kept as complete literal Tailwind arbitrary-value strings — never built
// via interpolation, since arbitrary classes only resolve from literal
// source text. Deliberately NOT driven by the chrome theme engine -- these
// are fixed per-space identity, same as the Office Wall pill below, per
// his decision to leave this header architecture untouched.
const SPACE_STYLES: Record<string, { active: string; inactive: string }> = {
  'my-space': {
    active:
      'bg-gradient-to-br from-[#6366F1] to-[#4F46E5] text-white border-white/30 shadow-[0_6px_16px_-2px_rgba(79,70,229,0.45),0_0_0_3px_rgba(99,102,241,0.25),inset_0_1px_0_rgba(255,255,255,0.35)] -translate-y-0.5',
    inactive:
      'bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF] text-[#4F46E5] border-[#C7D2FE] hover:from-[#C7D2FE] hover:to-[#A5B4FC] hover:text-[#3730A3] hover:shadow-[0_2px_8px_-2px_rgba(99,102,241,0.35)]',
  },
  'my-team': {
    active:
      'bg-gradient-to-br from-[#10B981] to-[#059669] text-white border-white/30 shadow-[0_6px_16px_-2px_rgba(5,150,105,0.45),0_0_0_3px_rgba(16,185,129,0.25),inset_0_1px_0_rgba(255,255,255,0.35)] -translate-y-0.5',
    inactive:
      'bg-gradient-to-br from-[#ECFDF5] to-[#D1FAE5] text-[#059669] border-[#A7F3D0] hover:from-[#A7F3D0] hover:to-[#6EE7B7] hover:text-[#065F46] hover:shadow-[0_2px_8px_-2px_rgba(16,185,129,0.35)]',
  },
  organization: {
    active:
      'bg-gradient-to-br from-[#3B82F6] to-[#2563EB] text-white border-white/30 shadow-[0_6px_16px_-2px_rgba(37,99,235,0.45),0_0_0_3px_rgba(59,130,246,0.25),inset_0_1px_0_rgba(255,255,255,0.35)] -translate-y-0.5',
    inactive:
      'bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] text-[#2563EB] border-[#BFDBFE] hover:from-[#BFDBFE] hover:to-[#93C5FD] hover:text-[#1E3A8A] hover:shadow-[0_2px_8px_-2px_rgba(59,130,246,0.35)]',
  },
};

function subTabClass({ isActive }: { isActive: boolean }) {
  return [
    'flex-shrink-0 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
    isActive
      ? 'border-mitra-accentFrom text-mitra-accentFrom'
      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-100',
  ].join(' ');
}

// One "elevated button card" nav row -- the vibrant per-module gradient
// lives on the small icon chip (always visible, so the list reads as
// colorful at rest without 17 fully-saturated rows competing with each
// other); the active state additionally washes the row in the current
// theme's translucent accent and rings it in the module's own color.
function NavRow({ to, end, label, icon: Icon }: { to: string; end?: boolean; label: string; icon: typeof HomeIcon }) {
  const grad = NAV_GRADIENTS[to] || DEFAULT_GRADIENT;
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-xl px-3 py-2 h-10 text-sm transition-all duration-200 ease-out hover:scale-[1.06] hover:-translate-y-0.5 active:scale-[0.97] ${
          isActive ? '' : 'hover:bg-[var(--nav-hover-bg)]'
        }`
      }
      style={({ isActive }) => ({
        background: isActive ? 'var(--nav-active-bg)' : 'var(--nav-card-bg)',
        border: '1px solid var(--nav-card-border)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        boxShadow: isActive
          ? `0 0 0 1px ${grad[1]}55, 0 4px 14px -4px ${grad[1]}77, var(--nav-card-shadow)`
          : 'var(--nav-card-shadow)',
      })}
    >
      {({ isActive }) => (
        <>
          <span
            className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 shadow-sm transition-transform duration-200 ease-out group-hover:scale-125 group-hover:rotate-3"
            style={{ backgroundImage: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` }}
          >
            <Icon className="w-[18px] h-[18px] text-white" />
          </span>
          <span className="truncate font-medium" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

// A collapsible cluster of real sub-pages -- CSS-only expand/collapse (the
// `grid-template-rows: 0fr -> 1fr` trick) rather than adding framer-motion
// as a new dependency, matching the app's existing zero-animation-library
// convention (see index.css's @keyframes for the toast/dropdown pop-ins).
function NavDrawer({ entry, open, onToggle, childActive }: { entry: DrawerNavItem; open: boolean; onToggle: () => void; childActive: boolean }) {
  const Icon = entry.icon;
  const grad = DRAWER_GRADIENTS[entry.key] || DEFAULT_GRADIENT;
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={`group w-full flex items-center gap-3 rounded-xl px-3 py-2 h-10 text-sm transition-all duration-200 ease-out hover:scale-[1.06] hover:-translate-y-0.5 active:scale-[0.97] ${
          childActive ? '' : 'hover:bg-[var(--nav-hover-bg)]'
        }`}
        style={{
          background: childActive ? 'var(--nav-active-bg)' : 'var(--nav-card-bg)',
          border: '1px solid var(--nav-card-border)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          boxShadow: childActive
            ? `0 0 0 1px ${grad[1]}55, var(--nav-card-shadow)`
            : 'var(--nav-card-shadow)',
        }}
      >
        <span
          className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 shadow-sm transition-transform duration-200 ease-out group-hover:scale-125 group-hover:rotate-3"
          style={{ backgroundImage: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` }}
        >
          <Icon className="w-[18px] h-[18px] text-white" />
        </span>
        <span
          className="truncate font-medium flex-1 text-left"
          style={{ color: childActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
        >
          {entry.label}
        </span>
        <ChevronDownIcon
          className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-secondary)' }}
        />
      </button>
      <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="ml-4 mt-1 mb-0.5 pl-3.5 space-y-1 border-l-2" style={{ borderColor: 'var(--chrome-border)' }}>
            {entry.children.map((child) => {
              const cgrad = NAV_GRADIENTS[child.to] || DEFAULT_GRADIENT;
              const ChildIcon = child.icon;
              return (
                <NavLink
                  key={child.to}
                  to={child.to}
                  className={({ isActive }) =>
                    `group flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-all duration-200 ease-out hover:scale-[1.06] hover:-translate-y-0.5 active:scale-[0.97] ${
                      isActive ? '' : 'hover:bg-[var(--nav-hover-bg)]'
                    }`
                  }
                  style={({ isActive }) => ({
                    background: isActive ? 'var(--nav-active-bg)' : 'var(--nav-card-bg)',
                    border: '1px solid var(--nav-card-border)',
                    backdropFilter: 'var(--glass-blur)',
                    WebkitBackdropFilter: 'var(--glass-blur)',
                    boxShadow: isActive
                      ? `0 0 0 1px ${cgrad[1]}55, var(--nav-card-shadow)`
                      : 'var(--nav-card-shadow)',
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className="flex items-center justify-center w-6 h-6 rounded-md flex-shrink-0 transition-transform duration-200 ease-out group-hover:scale-125 group-hover:rotate-3"
                        style={{ backgroundImage: `linear-gradient(135deg, ${cgrad[0]}, ${cgrad[1]})` }}
                      >
                        <ChildIcon className="w-3.5 h-3.5 text-white" />
                      </span>
                      <span className="truncate" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        {child.label}
                      </span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { isStaff, user, token } = useAuth();
  const { mode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = isStaff && user?.role === 'ADMIN';
  // Admin Center is Administrator-only -- everyone else's sidebar simply
  // never shows it, rather than showing it and bouncing them on click.
  const navItems = (isStaff ? STAFF_NAV_ITEMS : EMPLOYEE_NAV_ITEMS).filter((item) => !item.adminOnly || isAdmin);
  const SPACES = buildSpaces(isStaff);
  const officeWallActive = location.pathname === '/office-wall' || location.pathname.startsWith('/office-wall/');

  // Drawers stay open once opened; the one drawer that currently exists
  // (Projects & Clients) starts pre-opened if a direct link/bookmark lands
  // you on one of its pages, so the active route is never hidden behind a
  // collapsed section.
  const [openDrawers, setOpenDrawers] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const entry of STAFF_NAV_ITEMS) {
      if (
        entry.type === 'drawer' &&
        entry.children.some((c) => location.pathname === c.to || location.pathname.startsWith(`${c.to}/`))
      ) {
        initial.add(entry.key);
      }
    }
    return initial;
  });
  function toggleDrawer(key: string) {
    setOpenDrawers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Live "N Online" badge on the Office Wall nav pill -- same presence
  // signal the page's own "Who's Online Now" card reads, polled here too
  // since the pill needs to show it from anywhere in the app, not just on
  // the Office Wall page itself.
  const [wallOnlineCount, setWallOnlineCount] = useState<number | null>(null);
  function loadWallOnlineCount() {
    if (!token) return;
    getOfficeWallOnline(token)
      .then((rows) => setWallOnlineCount(rows.length))
      .catch(() => {});
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadWallOnlineCount, [token]);
  useAutoRefresh(loadWallOnlineCount, 20000);

  const activeSpace = SPACES.find(
    (s) =>
      location.pathname === s.basePath ||
      location.pathname.startsWith(`${s.basePath}/`) ||
      (s.extraActivePaths || []).some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`)),
  );

  // ToastProvider wraps the whole authenticated shell (not just the bell)
  // so its floating pop-ups can render above every page, not only where
  // the bell happens to sit in the header.
  return (
    <ToastProvider>
    <div className="h-screen flex bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <aside
        className="w-56 flex-shrink-0 flex flex-col border-r transition-colors duration-200 no-print"
        style={{ background: 'var(--bg-primary)', borderColor: 'var(--chrome-border)' }}
      >
        <div className="px-6 py-5">
          <MitraLogo mode={mode === 'dark' ? 'dark' : 'light'} size={36} variant="full" />
        </div>

        <div className="px-3 pb-3">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3 py-2 h-10 text-sm transition-all duration-200 ease-out hover:scale-[1.06] hover:-translate-y-0.5 active:scale-[0.97] ${
                isActive ? '' : 'hover:bg-[var(--nav-hover-bg)]'
              }`
            }
            style={({ isActive }) => ({
              background: isActive ? 'var(--nav-active-bg)' : 'var(--nav-card-bg)',
              border: '1px solid var(--nav-card-border)',
              backdropFilter: 'var(--glass-blur)',
              WebkitBackdropFilter: 'var(--glass-blur)',
              boxShadow: 'var(--nav-card-shadow)',
            })}
          >
            {({ isActive }) => (
              <>
                <span
                  className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 shadow-sm transition-transform duration-200 ease-out group-hover:scale-125 group-hover:rotate-3"
                  style={{ backgroundImage: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
                >
                  <HomeIcon className="w-[18px] h-[18px] text-white" />
                </span>
                <span className="font-medium" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  Home
                </span>
              </>
            )}
          </NavLink>
        </div>

        <div className="mx-3 mb-2 h-px" style={{ backgroundColor: 'var(--chrome-border)' }} />

        {/* Always the flat module list — never swapped by the space
            switcher, per his feedback that the sidebar should stay put. */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((entry) =>
            entry.type === 'drawer' ? (
              <NavDrawer
                key={entry.key}
                entry={entry}
                open={openDrawers.has(entry.key)}
                onToggle={() => toggleDrawer(entry.key)}
                childActive={entry.children.some(
                  (c) => location.pathname === c.to || location.pathname.startsWith(`${c.to}/`),
                )}
              />
            ) : (
              <NavRow key={entry.to} to={entry.to} end={entry.end} label={entry.label} icon={entry.icon} />
            ),
          )}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="h-16 flex-shrink-0 border-b px-6 flex items-center justify-between gap-4 transition-colors duration-200 no-print"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--chrome-border)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)' }}
        >
          {/* Zoho-People-style workspace switcher: high-impact 3D buttons,
              positioned at the left of the header right after the
              sidebar (not pushed to the far right), colorful even at
              rest so all three read as distinct without needing a click. */}
          <div className="flex items-center gap-2">
            {SPACES.map((space) => {
              const Icon = space.icon;
              const active = activeSpace?.key === space.key;
              const styles = SPACE_STYLES[space.key];
              return (
                <button
                  key={space.key}
                  type="button"
                  onClick={() => navigate(space.basePath)}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-150 active:scale-[0.97] ${
                    active ? styles.active : styles.inactive
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{space.label}</span>
                </button>
              );
            })}

            {/* Office Wall -- a distinct violet-to-pink gradient (never the
                muted tri-tone SPACE_STYLES above) so it reads as its own
                social space, not a fourth workspace tab, plus a live "N
                Online" pill matching the feature spec. */}
            <button
              type="button"
              onClick={() => navigate('/office-wall')}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-150 active:scale-[0.97] bg-gradient-to-br from-violet-500 to-pink-500 text-white border-white/30 hover:from-violet-600 hover:to-pink-600 hover:-translate-y-0.5 ${
                officeWallActive
                  ? 'shadow-[0_6px_16px_-2px_rgba(219,39,119,0.45),0_0_0_3px_rgba(217,70,239,0.25),inset_0_1px_0_rgba(255,255,255,0.35)] -translate-y-0.5'
                  : 'shadow-[0_2px_8px_-2px_rgba(219,39,119,0.35)]'
              }`}
            >
              <SparkleIcon className="w-4 h-4 flex-shrink-0" />
              <span>Office Wall</span>
              {wallOnlineCount !== null && wallOnlineCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white/20 rounded-full px-1.5 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" /> {wallOnlineCount} Online
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-4">
            <GlobalSearch />
            <NotificationBell />
            <UserProfileMenu />
          </div>
        </header>

        {/* Secondary tab strip — only shown while a space is active,
            exactly like Zoho's "Overview / Dashboard" row under
            "My Space / Team / Organization". This is where a space's
            sub-views live now, instead of in the sidebar. */}
        {activeSpace && (
          <div
            className="flex-shrink-0 border-b px-6 flex items-center gap-6 overflow-x-auto transition-colors duration-200"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--chrome-border)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)' }}
          >
            {activeSpace.subNav.map((item) => (
              <NavLink key={item.to} to={item.to} className={subTabClass}>
                {item.label}
              </NavLink>
            ))}
          </div>
        )}

        <main className="flex-1 p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
    </ToastProvider>
  );
}
