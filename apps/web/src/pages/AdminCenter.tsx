import { useState } from 'react';
import Tabs3D, { Tab3DItem } from '../components/Tabs3D';
import { ClipboardListIcon, DatabaseIcon, LockIcon, MailIcon, ShieldIcon } from '../components/icons';
import AdminUsersPermissions from '../components/admin/AdminUsersPermissions';
import AdminSecuritySettings from '../components/admin/AdminSecuritySettings';
import AdminAuditLogs from '../components/admin/AdminAuditLogs';
import AdminAutomations from '../components/admin/AdminAutomations';
import AdminSystemHealth from '../components/admin/AdminSystemHealth';

type AdminTabKey = 'users' | 'security' | 'audit' | 'automations' | 'health';

const TABS: Tab3DItem<AdminTabKey>[] = [
  { key: 'users', label: 'Users & Permissions', color: 'indigo', icon: ShieldIcon },
  { key: 'security', label: 'Security & Authentication', color: 'rose', icon: LockIcon },
  { key: 'audit', label: 'System Audit Logs', color: 'amber', icon: ClipboardListIcon },
  { key: 'automations', label: 'Email & Automations', color: 'sky', icon: MailIcon },
  { key: 'health', label: 'Data & System Health', color: 'emerald', icon: DatabaseIcon },
];

// The Admin Center -- platform governance, restricted to Administrator
// accounts (see App.tsx's AdminOnlyRoute and AppLayout's sidebar filter).
// Five sub-tabs via the same tactile 3D pill strip Master Data uses.
export default function AdminCenter() {
  const [tab, setTab] = useState<AdminTabKey>('users');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-1">Admin Center</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Platform governance, access control, audit logs, and system settings.
        </p>
      </div>

      <div className="mb-6">
        <Tabs3D tabs={TABS} active={tab} onChange={setTab} />
      </div>

      {tab === 'users' && <AdminUsersPermissions />}
      {tab === 'security' && <AdminSecuritySettings />}
      {tab === 'audit' && <AdminAuditLogs />}
      {tab === 'automations' && <AdminAutomations />}
      {tab === 'health' && <AdminSystemHealth />}
    </div>
  );
}
