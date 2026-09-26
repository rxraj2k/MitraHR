import { FormEvent, useState } from 'react';
import { createPortal } from 'react-dom';
import { NotificationPreferences, useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToasts } from '../context/ToastContext';
import { changeMyPassword, updateNotificationPreferences } from '../lib/api';
import { THEME_ORDER, THEMES } from '../lib/themes';
import { XIcon, LockIcon, BellIcon, SparkleIcon, CheckCircleIcon } from './icons';

type Tab = 'password' | 'notifications' | 'appearance';

const PREF_LABELS: Record<string, { label: string; hint: string }> = {
  emailOnLeaveDecision: { label: 'Leave request decisions', hint: 'When your leave is approved, rejected, or cancelled' },
  emailOnAnnouncement: { label: 'New announcements', hint: 'When a company or department announcement is posted' },
  emailOnAssessmentResult: { label: 'Assessment results', hint: 'When you complete a Learning Center assessment' },
  emailOnBirthday: { label: 'Birthday wishes', hint: 'The birthday email everyone gets on their day' },
  emailOnAppraisal: { label: 'Appraisal reminders', hint: 'When your semi-annual self-appraisal is ready and when it is finalized' },
};

// Password + notification preferences + Appearance (the 4-theme picker --
// UserProfileMenu keeps its own one-click quick toggle for switching
// dark/light without opening this modal, see ThemeContext's mode pairing).
// Presence isn't here -- see UserProfileMenu, it's a status, not a setting.
export default function AccountSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, token, isStaff, patchUser } = useAuth();
  const { themeName, setThemeName } = useTheme();
  const { popupsEnabled, setPopupsEnabled, soundEnabled, setSoundEnabled } = useToasts();
  const hasPersonalPrefs = !!user?.notificationPreferences;
  const [tab, setTab] = useState<Tab>(isStaff ? 'password' : 'notifications');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const [savingPref, setSavingPref] = useState<string | null>(null);

  if (!open || !user) return null;

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setPasswordMessage(null);
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: "New passwords don't match", ok: false });
      return;
    }
    setPasswordSubmitting(true);
    try {
      await changeMyPassword(token, currentPassword, newPassword);
      setPasswordMessage({ text: 'Password updated.', ok: true });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMessage({ text: err.message, ok: false });
    } finally {
      setPasswordSubmitting(false);
    }
  }

  async function togglePref(key: keyof NotificationPreferences) {
    const current = user?.notificationPreferences;
    if (!token || !current) return;
    const next = !current[key];
    setSavingPref(key);
    // Optimistic -- these are simple booleans with an obvious undo (flip it
    // back), so there's no need to block the switch on the round trip.
    patchUser({ notificationPreferences: { ...current, [key]: next } });
    try {
      const updated = await updateNotificationPreferences(token, { [key]: next });
      patchUser({ notificationPreferences: updated });
    } catch {
      // Roll back on failure.
      patchUser({ notificationPreferences: { ...current, [key]: !next } });
    } finally {
      setSavingPref(null);
    }
  }

  // Rendered through a portal straight onto <body>, not inline where this
  // component sits in the tree (inside the header, inside UserProfileMenu).
  // Reason: a couple of chrome themes (Aqua Glass) put a real
  // backdrop-filter on the <header> for its frosted-glass look, and per the
  // CSS spec, `backdrop-filter` (like `transform`) turns an element into
  // the *containing block* for any `position: fixed` descendant. Without
  // the portal, this modal's `fixed inset-0` would size itself against the
  // header's own 64px-tall box instead of the viewport -- which is exactly
  // what was reported ("hides the screen, can't reach the close button").
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-slate-900/20 max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Account Settings</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-1 px-5 pt-3">
          {isStaff && (
            <button
              type="button"
              onClick={() => setTab('password')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === 'password'
                  ? 'bg-mitra-accentFrom/10 text-mitra-accentFrom'
                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              <LockIcon className="w-3.5 h-3.5" />
              Password
            </button>
          )}
          <button
            type="button"
            onClick={() => setTab('notifications')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === 'notifications'
                ? 'bg-mitra-accentFrom/10 text-mitra-accentFrom'
                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <BellIcon className="w-3.5 h-3.5" />
            Notifications
          </button>
          <button
            type="button"
            onClick={() => setTab('appearance')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === 'appearance'
                ? 'bg-mitra-accentFrom/10 text-mitra-accentFrom'
                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <SparkleIcon className="w-3.5 h-3.5" />
            Appearance
          </button>
        </div>

        <div className="p-5">
          {tab === 'appearance' && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Pick a look for the sidebar, header, and accent colors across MitraHR. Your tables and forms keep their
                current clean styling either way -- this only reskins the chrome around them.
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {THEME_ORDER.map((id) => {
                  const t = THEMES[id];
                  const selected = themeName === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setThemeName(id)}
                      className={`relative flex flex-col gap-2 rounded-xl border p-3 text-left transition-all ${
                        selected
                          ? 'border-transparent ring-2 ring-offset-2 dark:ring-offset-slate-900'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                      style={selected ? ({ '--tw-ring-color': t.vars['--accent-solid'] } as any) : undefined}
                    >
                      <span
                        className="h-8 w-full rounded-lg"
                        style={{ backgroundImage: `linear-gradient(135deg, ${t.swatch[0]}, ${t.swatch[1]})` }}
                      />
                      <span className="flex items-center justify-between gap-1">
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {t.emoji} {t.label}
                          </span>
                          <span className="block text-[10px] text-slate-400 dark:text-slate-500 truncate">{t.hint}</span>
                        </span>
                        {selected && (
                          <CheckCircleIcon className="w-4 h-4 flex-shrink-0" style={{ color: t.vars['--accent-solid'] }} />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-3">
                Saved on this device/browser only, same as your other display preferences here.
              </p>
            </div>
          )}

          {tab === 'password' && isStaff && (
            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Current password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">New password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Confirm new password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm"
                />
              </div>
              {passwordMessage && (
                <p className={`text-xs ${passwordMessage.ok ? 'text-emerald-600' : 'text-red-500'}`}>{passwordMessage.text}</p>
              )}
              <button
                type="submit"
                disabled={passwordSubmitting}
                className="w-full rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
              >
                {passwordSubmitting ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}

          {tab === 'notifications' && (
            <div className="space-y-1 mb-5 pb-5 border-b border-slate-100 dark:border-slate-800">
              <p className="text-[11px] font-semibold uppercase text-slate-400 dark:text-slate-500 mb-2">
                Pop-up Notifications
              </p>
              <div className="flex items-center justify-between gap-3 py-1.5">
                <div className="min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-200">Enable Pop-up Notifications</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Show floating alerts in the corner of the screen for new notifications while you're using MitraHR
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={popupsEnabled}
                  onClick={() => setPopupsEnabled(!popupsEnabled)}
                  className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors ${
                    popupsEnabled ? 'bg-mitra-accentFrom' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      popupsEnabled ? 'translate-x-4' : ''
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 py-1.5">
                <div className="min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-200">Enable Sound Alerts</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Play a short chime alongside pop-up notifications (your browser may block this until you've clicked
                    somewhere on the page)
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={soundEnabled}
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors ${
                    soundEnabled ? 'bg-mitra-accentFrom' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      soundEnabled ? 'translate-x-4' : ''
                    }`}
                  />
                </button>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-1">
                These are saved on this device/browser only, same as your theme choice — not part of your account.
              </p>
            </div>
          )}

          {tab === 'notifications' &&
            (hasPersonalPrefs ? (
              <div className="space-y-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Choose which of these send you an email. You'll still see all of them in the notification bell either way.
                </p>
                {(Object.keys(PREF_LABELS) as Array<keyof typeof PREF_LABELS>).map((key) => {
                  const meta = PREF_LABELS[key];
                  const checked = !!user.notificationPreferences?.[key as keyof NotificationPreferences];
                  return (
                    <div key={key} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm text-slate-700 dark:text-slate-200">{meta.label}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">{meta.hint}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={checked}
                        disabled={savingPref === key}
                        onClick={() => togglePref(key as keyof NotificationPreferences)}
                        className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors disabled:opacity-50 ${
                          checked ? 'bg-mitra-accentFrom' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                            checked ? 'translate-x-4' : ''
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Notification preferences aren't available on this account — there's no employee record linked to it for these
                emails to go to in the first place.
              </p>
            ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
