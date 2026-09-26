import AdminManager from '../AdminManager';
import { CheckCircleIcon, XCircleIcon } from '../icons';

// This codebase's real access model today is role-TIERED, not per-module:
// StaffOnlyGuard treats every password-login role (Admin/HR/Manager/IT
// Support) as equally "staff" for almost every endpoint. The one exception
// is Talent Directory's Experience Level / Deployment Status fields
// (Admin/HR only -- see employees.controller.ts's
// TALENT_DIRECTORY_FIELD_ROLES) and, as of this Admin Center, the Admin
// Center's own governance actions (Administrator only -- AdminOnlyGuard).
// This table shows that REAL model rather than a fake fine-grained,
// editable grid that would imply enforcement the app doesn't have yet.
type Access = 'FULL' | 'LIMITED' | 'READ_ONLY' | 'NONE';

const ACCESS_META: Record<Access, { label: string; className: string }> = {
  FULL: { label: 'Full access', className: 'text-emerald-600 dark:text-emerald-400' },
  LIMITED: { label: 'Limited', className: 'text-amber-600 dark:text-amber-400' },
  READ_ONLY: { label: 'Read only', className: 'text-sky-600 dark:text-sky-400' },
  NONE: { label: 'No access', className: 'text-slate-400 dark:text-slate-500' },
};

function AccessCell({ value, note }: { value: Access; note?: string }) {
  const meta = ACCESS_META[value];
  return (
    <td className="px-3 py-3">
      <div className="flex items-center gap-1.5">
        {value === 'NONE' ? (
          <XCircleIcon className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 flex-shrink-0" />
        ) : (
          <CheckCircleIcon className={`w-3.5 h-3.5 flex-shrink-0 ${meta.className}`} />
        )}
        <span className={`text-xs font-medium ${meta.className}`}>{meta.label}</span>
      </div>
      {note && <p className="text-[10px] text-slate-400 mt-0.5">{note}</p>}
    </td>
  );
}

const ROWS: { module: string; admin: Access; hr: Access; managerIt: Access; employee: Access; note?: string }[] = [
  { module: 'Admin Center (this module)', admin: 'FULL', hr: 'NONE', managerIt: 'NONE', employee: 'NONE' },
  { module: 'Admin accounts, roles & invites', admin: 'FULL', hr: 'NONE', managerIt: 'NONE', employee: 'NONE' },
  {
    module: 'Talent Directory — Experience Level / Deployment Status',
    admin: 'FULL',
    hr: 'FULL',
    managerIt: 'READ_ONLY',
    employee: 'READ_ONLY',
    note: 'The one existing per-field rule outside Admin Center',
  },
  { module: 'Employees, Leave, Assets, Projects, Documents, etc.', admin: 'FULL', hr: 'FULL', managerIt: 'FULL', employee: 'READ_ONLY', note: 'Employees see their own scoped data only' },
  { module: 'Appraisal compensation decisions (finalize)', admin: 'FULL', hr: 'FULL', managerIt: 'FULL', employee: 'NONE' },
];

export default function AdminUsersPermissions() {
  return (
    <div className="space-y-6">
      <AdminManager />

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Current Access Model</h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          MitraHR's access control today is role-tiered (Administrator / HR / Manager / IT Support / Employee), not a
          per-module read/write/approve/delete grid — this table reflects what's actually enforced, not an aspirational
          matrix. A fully granular per-module permission system is a larger follow-on project.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="px-3 py-2">Module / Action</th>
                <th className="px-3 py-2">Administrator</th>
                <th className="px-3 py-2">HR</th>
                <th className="px-3 py-2">Manager / IT Support</th>
                <th className="px-3 py-2">Employee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {ROWS.map((row) => (
                <tr key={row.module}>
                  <td className="px-3 py-3 text-slate-700 dark:text-slate-200 font-medium align-top">{row.module}</td>
                  <AccessCell value={row.admin} />
                  <AccessCell value={row.hr} />
                  <AccessCell value={row.managerIt} />
                  <AccessCell value={row.employee} note={row.note} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
