import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';
import {
  BriefcaseIcon,
  BuildingIcon,
  CalendarCheckIcon,
  ChartBarIcon,
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
  ShuffleIcon,
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
const STAFF_NAV_ITEMS = [
  { to: '/employees', label: 'Talent Directory', end: false, icon: UsersIcon },
  { to: '/org-chart', label: 'Team Topology', end: false, icon: ShareNetworkIcon },
  { to: '/leave', label: 'Leaves & Attendance', end: false, icon: CalendarCheckIcon },
  { to: '/clients', label: 'Client Management', end: false, icon: BuildingIcon },
  { to: '/projects', label: 'Project Management', end: false, icon: BriefcaseIcon },
  { to: '/utilization', label: 'Bench & Utilization', end: false, icon: GaugeIcon },
  { to: '/staffing-sandbox', label: 'Staffing Sandbox', end: false, icon: ShuffleIcon },
  { to: '/training', label: 'Learning Center', end: false, icon: GraduationCapIcon },
  { to: '/assets', label: 'Asset Management', end: false, icon: PackageIcon },
  { to: '/documents', label: 'Document Management', end: false, icon: FileTextIcon },
  { to: '/exits', label: 'Exit & Clearance', end: false, icon: ClipboardListIcon },
  { to: '/recruitment', label: 'Recruitment', end: false, icon: UserPlusIcon },
  { to: '/performance', label: 'Performance & Goals', end: false, icon: TrophyIcon },
  { to: '/engagement', label: 'Engagement & Feedback', end: false, icon: HeartIcon },
  { to: '/reports', label: 'Reports & Analytics', end: false, icon: ChartBarIcon },
  { to: '/settings', label: 'Master Data', end: false, icon: DatabaseIcon },
];

const EMPLOYEE_NAV_ITEMS = [
  { to: '/employees', label: 'Talent Directory', end: false, icon: UsersIcon },
  { to: '/org-chart', label: 'Team Topology', end: false, icon: ShareNetworkIcon },
  { to: '/my-leave', label: 'My Leaves & Attendance', end: false, icon: CalendarCheckIcon },
  { to: '/my-learning', label: 'My Learning', end: false, icon: GraduationCapIcon },
  { to: '/my-performance', label: 'My Performance', end: false, icon: TrophyIcon },
  { to: '/engagement', label: 'Engagement & Feedback', end: false, icon: HeartIcon },
];

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
const SPACES: Space[] = [
  {
    key: 'my-space',
    label: 'My Space',
    icon: UserCircleIcon,
    basePath: '/my-space',
    subNav: [
      { to: '/my-space/summary', label: 'Overview' },
      { to: '/my-space/attendance-leave', label: 'Attendance & Leaves' },
      { to: '/my-space/approvals-documents', label: 'My Approvals & Documents' },
    ],
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
    ],
    extraActivePaths: ['/employees'],
  },
];

// Color identity per space for the header's 3D switcher buttons — exact
// hex codes from the nav spec. `inactive` is a soft, still-colorful tinted
// gradient (not gray) so all three read as colorful at rest per his
// feedback; `hover` (folded into the inactive string below) deepens that
// tint; `active` is the fully saturated gradient + glow ring + lift.
// Kept as complete literal Tailwind arbitrary-value strings — never built
// via interpolation, since arbitrary classes only resolve from literal
// source text.
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

function navLinkClass({ isActive }: { isActive: boolean }) {
  return [
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
    isActive ? 'bg-white/10 text-white font-medium' : 'text-slate-300 hover:bg-white/5 hover:text-white',
  ].join(' ');
}

function subTabClass({ isActive }: { isActive: boolean }) {
  return [
    'flex-shrink-0 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
    isActive ? 'border-mitra-accentFrom text-mitra-accentFrom' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300',
  ].join(' ');
}

export default function AppLayout() {
  const { user, isStaff, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const navItems = isStaff ? STAFF_NAV_ITEMS : EMPLOYEE_NAV_ITEMS;

  const activeSpace = SPACES.find(
    (s) =>
      location.pathname === s.basePath ||
      location.pathname.startsWith(`${s.basePath}/`) ||
      (s.extraActivePaths || []).some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`)),
  );

  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden">
      <aside className="w-60 flex-shrink-0 bg-mitra-navy flex flex-col">
        <div className="px-6 py-5">
          <span className="font-semibold text-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo bg-clip-text text-transparent">
            MitraHR
          </span>
        </div>

        <div className="px-3 pb-3">
          <NavLink to="/" end className={navLinkClass}>
            <HomeIcon className="w-5 h-5 flex-shrink-0" />
            <span>Home</span>
          </NavLink>
        </div>

        <div className="mx-3 mb-2 h-px bg-white/10" />

        {/* Always the flat module list — never swapped by the space
            switcher, per his feedback that the sidebar should stay put. */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex-shrink-0 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4">
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
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell />
            <span className="text-sm text-slate-500">
              {user?.name} <span className="text-slate-400">({user?.role})</span>
            </span>
            <button
              onClick={logout}
              className="text-sm rounded-md border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        </header>

        {/* Secondary tab strip — only shown while a space is active,
            exactly like Zoho's "Overview / Dashboard" row under
            "My Space / Team / Organization". This is where a space's
            sub-views live now, instead of in the sidebar. */}
        {activeSpace && (
          <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 flex items-center gap-6 overflow-x-auto">
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
  );
}
