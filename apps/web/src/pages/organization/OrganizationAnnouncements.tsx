import { useAuth } from '../../context/AuthContext';
import { useOrganizationData } from './useOrganizationData';
import AnnouncementsTab from './AnnouncementsTab';

// Thin route wrapper — AnnouncementsTab itself is unchanged (it already
// took token/isStaff/departments/employees as props from the old tab-barred
// Organization page, and renders its own "Announcements" heading), just
// mounted at its own route now (/organization/announcements) instead of
// behind a pill tab.
export default function OrganizationAnnouncements() {
  const { isStaff } = useAuth();
  const { token, employees, departments, loading } = useOrganizationData();

  if (loading || !token) return <p className="text-sm text-slate-400">Loading…</p>;

  return <AnnouncementsTab token={token} isStaff={isStaff} departments={departments} employees={employees} />;
}
