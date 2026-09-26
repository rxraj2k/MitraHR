import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { updatePresence } from '../lib/api';
import { Avatar } from './Avatar';
import AccountSettingsModal from './AccountSettingsModal';
import {
  ChevronDownIcon,
  DatabaseIcon,
  GearIcon,
  LogOutIcon,
  MoonIcon,
  ShieldIcon,
  SunIcon,
  UserCircleIcon,
} from './icons';

const PRESENCE_DOT: Record<string, string> = {
  AVAILABLE: 'bg-emerald-500',
  AWAY: 'bg-amber-400',
};

// Replaces the old plain-text "Name (ROLE)" + standalone Log out button
// with a single profile pill + dropdown, per his redesign spec. Everything
// here links to something real: My Profile (the actual employee profile
// page), Security & IAM Roles / System Master Data (staff-only, deep-link
// into the existing Master Data page), Account Settings (password +
// notification preferences -- see AccountSettingsModal), an Available/Away
// presence toggle (persisted on the account, reflected in this same
// header's status dot), a real dark/light theme toggle, and Sign Out with
// an inline confirm.
export default function UserProfileMenu() {
  const { user, isStaff, logout, token, patchUser } = useAuth();
  const { mode, toggleMode } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [presenceSaving, setPresenceSaving] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirmingLogout(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        setConfirmingLogout(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  // Only a session actually linked to an Employee record has a real
  // profile to open -- a pure admin login with no linked Employee has
  // nothing at /employees/undefined, so the item just doesn't render.
  const profileHref = user.employeeId ? `/employees/${user.employeeId}` : null;
  const dotColor = PRESENCE_DOT[user.presenceStatus] || PRESENCE_DOT.AVAILABLE;

  function go(path: string) {
    setOpen(false);
    navigate(path);
  }

  async function setPresence(status: 'AVAILABLE' | 'AWAY') {
    if (!token || status === user!.presenceStatus || presenceSaving) return;
    const previous = user!.presenceStatus;
    setPresenceSaving(true);
    patchUser({ presenceStatus: status });
    try {
      await updatePresence(token, status);
    } catch {
      patchUser({ presenceStatus: previous });
    } finally {
      setPresenceSaving(false);
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2.5 rounded-full border pl-1.5 pr-2.5 py-1.5 transition-all duration-150 hover:-translate-y-px ${
          open
            ? 'bg-[var(--accent-from)]/5'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
        }`}
        style={open ? { borderColor: 'var(--accent-solid)' } : undefined}
      >
        <span className="relative flex-shrink-0">
          <Avatar name={user.name} photoUrl={user.photoUrl} size="md" />
          <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${dotColor}`} />
        </span>
        <span className="hidden sm:flex flex-col items-start leading-tight">
          <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{user.name}</span>
          <span
            className="text-[10px] font-semibold tracking-wide rounded-full px-1.5 py-px mt-0.5 font-mono text-white"
            style={{ backgroundImage: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
          >
            {user.role}
          </span>
        </span>
        <ChevronDownIcon
          className={`w-4 h-4 text-slate-400 transition-transform duration-150 flex-shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden z-50 origin-top-right animate-[dropdownIn_0.15s_ease-out]">
          <div className="p-4 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <Avatar name={user.name} photoUrl={user.photoUrl} size="lg" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
              <span
                className="inline-block mt-1 text-[10px] font-semibold tracking-wide rounded-full px-2 py-0.5 font-mono text-white"
                style={{ backgroundImage: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
              >
                {user.role}
              </span>
            </div>
          </div>

          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">Status</p>
            <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5">
              {(['AVAILABLE', 'AWAY'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setPresence(status)}
                  disabled={presenceSaving}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                    user.presenceStatus === status
                      ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${PRESENCE_DOT[status]}`} />
                  {status === 'AVAILABLE' ? 'Available' : 'Away'}
                </button>
              ))}
            </div>
          </div>

          <div className="py-1.5">
            {profileHref && (
              <button
                type="button"
                onClick={() => go(profileHref)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left"
              >
                <UserCircleIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                My Profile
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setSettingsOpen(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left"
            >
              <GearIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
              Account Settings
            </button>
            {isStaff && user?.role === 'ADMIN' && (
              <button
                type="button"
                onClick={() => go('/admin-center')}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left"
              >
                <ShieldIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                Admin Center
              </button>
            )}
            {isStaff && (
              <button
                type="button"
                onClick={() => go('/settings')}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left"
              >
                <DatabaseIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                System Master Data
              </button>
            )}
            <button
              type="button"
              onClick={toggleMode}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left"
              title="Quick switch -- pick from all 4 themes in Account Settings > Appearance"
            >
              {mode === 'dark' ? (
                <SunIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
              ) : (
                <MoonIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
              )}
              {mode === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 py-1.5">
            {!confirmingLogout ? (
              <button
                type="button"
                onClick={() => setConfirmingLogout(true)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 text-left font-medium"
              >
                <LogOutIcon className="w-4 h-4 flex-shrink-0" />
                Sign Out
              </button>
            ) : (
              <div className="px-4 py-2.5 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Sign out of MitraHR?</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setConfirmingLogout(false)}
                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={logout}
                    className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-md"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <AccountSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
