import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../../components/Avatar';
import AnnouncementBoard from '../../components/AnnouncementBoard';
import { useOrganizationData } from './useOrganizationData';
import { getAnnouncements, getUpcomingBirthdays } from '../../lib/api';
import { Announcement, UpcomingBirthday } from '../../types';
import { BuildingIcon, CakeIcon, ChevronRightIcon, SparkleIcon, UsersIcon } from '../../components/icons';
import MetricTile from '../../components/MetricTile';
import { TILE_THEMES, tileWrapperClass } from '../../lib/tileThemes';

// Organization's default landing page — a Zoho-People-style widget
// dashboard. Was the "Overview" tab inside the old tab-barred Organization
// page; now its own route (/organization/overview) under the sidebar's
// Organization space, per the nav reorg.
export default function OrganizationOverview() {
  const navigate = useNavigate();
  const { isStaff } = useAuth();
  const { token, employees, departments, loading } = useOrganizationData();

  const [birthdays, setBirthdays] = useState<UpcomingBirthday[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [widgetsLoading, setWidgetsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([getUpcomingBirthdays(token, 30), getAnnouncements(token)])
      .then(([b, a]) => {
        setBirthdays(b);
        setAnnouncements(a);
      })
      .catch(() => {})
      .finally(() => setWidgetsLoading(false));
  }, [token]);

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;

  const activeEmployees = employees.filter((e) => e.status === 'ACTIVE');
  const now = new Date();
  const newHiresThisMonth = activeEmployees.filter((e) => {
    if (!e.dateOfJoining) return false;
    const d = new Date(e.dateOfJoining);
    return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
  }).length;

  const tiles: { label: string; value: number; icon: typeof UsersIcon; onClick: () => void; sub?: string }[] = [
    { label: 'Active Employees', value: activeEmployees.length, icon: UsersIcon, onClick: () => navigate('/organization/directory') },
    { label: 'Departments', value: departments.length, icon: BuildingIcon, onClick: () => navigate('/organization/department-tree') },
    { label: 'New Hires This Month', value: newHiresThisMonth, icon: SparkleIcon, onClick: () => navigate('/organization/new-hires') },
    {
      label: 'Upcoming Birthdays',
      value: birthdays.length,
      icon: CakeIcon,
      onClick: () => navigate('/organization/birthdays'),
      sub: 'Next 30 days',
    },
  ];

  // Employee Tree points at Team Topology directly (it's already its own
  // flat sidebar item — no need to duplicate tree-rendering inside
  // Organization too).
  const quickLinks: { label: string; onClick: () => void }[] = [
    { label: 'Employee Tree', onClick: () => navigate('/org-chart') },
    { label: 'Department Directory', onClick: () => navigate('/organization/directory') },
    { label: 'Company Policies', onClick: () => navigate('/organization/announcements-policies') },
  ];

  const newHires = [...activeEmployees]
    .filter((e) => e.dateOfJoining)
    .sort((a, b) => new Date(b.dateOfJoining as string).getTime() - new Date(a.dateOfJoining as string).getTime())
    .slice(0, 5);

  const deptSnapshot = departments.map((d) => ({
    department: d,
    count: activeEmployees.filter((e) => e.departmentId === d.id).length,
  }));

  function goToDepartment(departmentId: string) {
    navigate(`/organization/directory?dept=${departmentId}`);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Organization</h1>
        <p className="text-sm text-slate-500 mt-1">Company-wide overview, directories, and announcements.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {tiles.map((t, i) => (
          <button key={t.label} type="button" onClick={t.onClick} className={tileWrapperClass(TILE_THEMES[i % TILE_THEMES.length])}>
            <MetricTile icon={t.icon} label={t.label} value={t.value} sub={t.sub} />
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — primary feeds */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800">Company Announcements</h3>
              <button
                type="button"
                onClick={() => navigate('/organization/announcements-policies')}
                className="text-xs font-medium text-mitra-accentFrom hover:underline"
              >
                View all →
              </button>
            </div>
            {widgetsLoading ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : (
              <AnnouncementBoard
                announcements={announcements}
                token={token || ''}
                isStaff={!!isStaff}
                departments={departments}
                onChanged={() => token && getAnnouncements(token).then(setAnnouncements).catch(() => {})}
                limit={3}
                emptyMessage="No announcements posted yet."
              />
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Quick Links</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {quickLinks.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={q.onClick}
                  className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-mitra-accentFrom/40 hover:shadow-sm text-sm text-slate-700 flex items-center justify-between group"
                >
                  {q.label}
                  <ChevronRightIcon className="w-4 h-4 text-slate-300 group-hover:text-mitra-accentFrom" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right column — widgets */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800">Birthday Folks</h3>
              <button
                type="button"
                onClick={() => navigate('/organization/birthdays')}
                className="text-xs font-medium text-mitra-accentFrom hover:underline"
              >
                View all →
              </button>
            </div>
            {widgetsLoading ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : birthdays.length === 0 ? (
              <p className="text-sm text-slate-400">No birthdays in the next 30 days.</p>
            ) : (
              <ul className="space-y-2.5">
                {birthdays.slice(0, 5).map((b) => (
                  <li key={b.id} className="flex items-center gap-2.5">
                    <Avatar name={b.fullName} photoUrl={b.photoUrl} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{b.fullName}</span>
                    <span className="text-xs text-fuchsia-500 font-medium flex-shrink-0">
                      {b.daysUntil === 0 ? 'Today!' : b.daysUntil === 1 ? 'Tomorrow' : `In ${b.daysUntil} days`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800">New Hires</h3>
              <button
                type="button"
                onClick={() => navigate('/organization/new-hires')}
                className="text-xs font-medium text-mitra-accentFrom hover:underline"
              >
                View all →
              </button>
            </div>
            {newHires.length === 0 ? (
              <p className="text-sm text-slate-400">No joining dates on file yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {newHires.map((e) => (
                  <li key={e.id} className="flex items-center gap-2.5">
                    <Avatar name={e.fullName} photoUrl={e.photoUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-700">{e.fullName}</p>
                      <p className="text-xs text-slate-400">Joined {new Date(e.dateOfJoining as string).toLocaleDateString()}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Department Snapshot</h3>
            {deptSnapshot.length === 0 ? (
              <p className="text-sm text-slate-400">No departments set up yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {deptSnapshot.map(({ department, count }) => (
                  <button
                    key={department.id}
                    type="button"
                    onClick={() => goToDepartment(department.id)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-mitra-accentFrom/40 hover:text-mitra-accentFrom"
                  >
                    {department.name}: {count}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
