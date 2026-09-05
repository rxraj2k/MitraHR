import { FormEvent, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setPassword } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const inputClass =
  'w-full rounded-lg bg-white/10 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mitra-accentFrom placeholder:text-slate-500';

// Landing page for an admin invite link (?token=...). Public route — the
// person isn't logged in yet, that's the whole point of this page.
export default function SetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { setToken } = useAuth();
  const navigate = useNavigate();

  const [password, setPasswordValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      const result = await setPassword(token, password);
      setToken(result.accessToken);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Could not set password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-mitra-navy to-mitra-navyLight flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold">
            <span className="bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo bg-clip-text text-transparent">
              MitraHR
            </span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm">Set your admin password</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur">
          {!token ? (
            <p className="text-sm text-red-300">
              This link is missing its invite token — check you copied the full link from your email.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm text-slate-300 mb-1">New password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  className={inputClass}
                  placeholder="At least 8 characters"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Confirm password</label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={inputClass}
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white font-medium py-2 text-sm disabled:opacity-60"
              >
                {busy ? 'Setting password...' : 'Set password & sign in'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
