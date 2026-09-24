import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAdmins, getEmployees, inviteAdmin, updateAdminEmployeeLink, updateAdminRole } from '../lib/api';
import { AdminAccount, Employee } from '../types';
import { Avatar } from './Avatar';
import SearchableSelect from './SearchableSelect';

// Roles & Permissions (minimal, Sprint 19 follow-up): every staff account
// was 'ADMIN' until now, with no way to invite anyone narrower. This is a
// small, standalone role vocabulary for staff (User.role) — separate from
// Employee.systemRole, which is still data-only and doesn't gate anything.
const STAFF_ROLES = ['ADMIN', 'HR', 'MANAGER', 'IT_SUPPORT'] as const;
const STAFF_ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  HR: 'HR',
  MANAGER: 'Manager',
  IT_SUPPORT: 'IT Support',
};
const STAFF_ROLE_BADGE: Record<string, string> = {
  ADMIN: 'bg-indigo-100 text-indigo-700',
  HR: 'bg-fuchsia-100 text-fuchsia-700',
  MANAGER: 'bg-sky-100 text-sky-700',
  IT_SUPPORT: 'bg-amber-100 text-amber-700',
};

function timeAgo(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function AdminManager({ searchQuery }: { searchQuery?: string } = {}) {
  const { token } = useAuth();
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [role, setRole] = useState<string>('ADMIN');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [inviting, setInviting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  // Inline "link to employee" editor for an already-active admin — invites
  // can set this up front, but a seeded or previously-invited admin has no
  // other way to pick one up after the fact (see auth.service.ts).
  const [linkEditingId, setLinkEditingId] = useState<string | null>(null);
  const [linkEditValue, setLinkEditValue] = useState('');
  const [linkSaving, setLinkSaving] = useState(false);

  // Same after-the-fact pattern for role — lets you promote/demote an
  // existing admin (e.g. to HR) without re-inviting them.
  const [roleSavingId, setRoleSavingId] = useState<string | null>(null);

  function load() {
    if (!token) return;
    getAdmins(token)
      .then(setAdmins)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    getEmployees(token)
      .then(setEmployees)
      .catch(() => {});
  }

  useEffect(load, [token]);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError('');
    setInfo('');
    setInviting(true);
    try {
      await inviteAdmin(token, name, email, employeeId || undefined, role);
      setInfo(`Invite sent to ${email}.`);
      setName('');
      setEmail('');
      setEmployeeId('');
      setRole('ADMIN');
      setShowInvite(false);
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  }

  function startEditLink(admin: AdminAccount) {
    setError('');
    setLinkEditingId(admin.id);
    setLinkEditValue(admin.employeeId || '');
  }

  async function saveLink(adminId: string) {
    if (!token) return;
    setLinkSaving(true);
    setError('');
    try {
      await updateAdminEmployeeLink(token, adminId, linkEditValue || null);
      setLinkEditingId(null);
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to update employee link');
    } finally {
      setLinkSaving(false);
    }
  }

  async function changeRole(adminId: string, newRole: string) {
    if (!token) return;
    setRoleSavingId(adminId);
    setError('');
    try {
      await updateAdminRole(token, adminId, newRole);
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
    } finally {
      setRoleSavingId(null);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-slate-800">Admins</h2>
        <button
          onClick={() => setShowInvite((s) => !s)}
          className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
        >
          {showInvite ? 'Cancel' : '+ Invite Admin'}
        </button>
      </div>
      <p className="text-xs text-slate-500 mb-4">Every staff account with sign-in access, their role, and last activity.</p>

      {error && <div className="text-xs text-red-600 mb-3">{error}</div>}
      {info && <div className="text-xs text-emerald-600 mb-3">{info}</div>}

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {admins
            .filter(
              (a) =>
                !searchQuery ||
                a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.email.toLowerCase().includes(searchQuery.toLowerCase()),
            )
            .map((a) => {
            const linkedEmployee = a.employeeId ? employees.find((e) => e.id === a.employeeId) : undefined;
            return (
              <div key={a.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={a.name} photoUrl={linkedEmployee?.photoUrl} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-slate-800 font-medium text-sm truncate">{a.name}</p>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          a.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {a.status === 'ACTIVE' ? 'Active' : 'Invite pending'}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs truncate">{a.email}</p>
                    {linkedEmployee?.designation?.name && (
                      <p className="text-slate-400 text-[11px] mt-0.5">{linkedEmployee.designation.name}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 mt-3">
                  <select
                    value={a.role}
                    disabled={roleSavingId === a.id}
                    onChange={(e) => changeRole(a.id, e.target.value)}
                    className={`text-[11px] font-medium rounded-full px-2.5 py-1 border-0 disabled:opacity-50 ${STAFF_ROLE_BADGE[a.role] || 'bg-slate-100 text-slate-600'}`}
                    title="Role"
                  >
                    {STAFF_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {STAFF_ROLE_LABELS[r] || r}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-400">
                    {a.lastLoginAt ? `Last login ${timeAgo(a.lastLoginAt)}` : 'Never logged in'}
                  </span>
                </div>

                {linkEditingId === a.id ? (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1">
                      <SearchableSelect
                        options={employees.map((e) => ({ id: e.id, name: e.fullName }))}
                        value={linkEditValue}
                        onChange={setLinkEditValue}
                        placeholder="Search employee..."
                      />
                    </div>
                    <button
                      onClick={() => saveLink(a.id)}
                      disabled={linkSaving}
                      className="text-xs font-medium text-white bg-mitra-accentFrom rounded-lg px-2.5 py-1.5 disabled:opacity-50"
                    >
                      {linkSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => setLinkEditingId(null)} className="text-xs text-slate-500 px-1">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="mt-2.5 flex items-center gap-1.5 text-xs">
                    <span className="text-slate-400">{a.employeeId ? `Linked: ${linkedEmployee?.fullName || 'employee'}` : 'Not linked to an employee record'}</span>
                    <button onClick={() => startEditLink(a)} className="text-mitra-accentFrom hover:underline">
                      {a.employeeId ? 'Change' : 'Link'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showInvite && (
        <form onSubmit={handleInvite} className="space-y-2 pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-500 pt-1">Invite a new admin — they'll get an email to set their own password.</p>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <div>
            <label className="block text-xs text-slate-500 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
            >
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {STAFF_ROLE_LABELS[r] || r}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">
              Admin or HR can edit Talent Directory fields (Experience Level, Deployment Status); every role can still
              manage everything else staff already could.
            </p>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Link to their Employee record (optional, lets them use My Leave)
            </label>
            <SearchableSelect
              options={employees.map((e) => ({ id: e.id, name: e.fullName }))}
              value={employeeId}
              onChange={setEmployeeId}
              placeholder="Search employee..."
            />
          </div>
          <button
            type="submit"
            disabled={inviting}
            className="w-full rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium py-2 disabled:opacity-60 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
          >
            {inviting ? 'Sending invite...' : 'Send Invite'}
          </button>
        </form>
      )}
    </div>
  );
}
