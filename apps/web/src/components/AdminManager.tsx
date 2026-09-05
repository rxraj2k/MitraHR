import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAdmins, inviteAdmin } from '../lib/api';
import { AdminAccount } from '../types';

export default function AdminManager() {
  const { token } = useAuth();
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [inviting, setInviting] = useState(false);

  function load() {
    if (!token) return;
    getAdmins(token)
      .then(setAdmins)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [token]);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError('');
    setInfo('');
    setInviting(true);
    try {
      await inviteAdmin(token, name, email);
      setInfo(`Invite sent to ${email}.`);
      setName('');
      setEmail('');
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-slate-700 mb-3">Admins</h2>

      {error && <div className="text-xs text-red-600 mb-3">{error}</div>}
      {info && <div className="text-xs text-emerald-600 mb-3">{info}</div>}

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : (
        <ul className="divide-y divide-slate-100 mb-4">
          {admins.map((a) => (
            <li key={a.id} className="py-2 flex items-center justify-between text-sm">
              <div>
                <p className="text-slate-700 font-medium">{a.name}</p>
                <p className="text-slate-400 text-xs">{a.email}</p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  a.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {a.status === 'ACTIVE' ? 'Active' : 'Invite pending'}
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleInvite} className="space-y-2 pt-2 border-t border-slate-100">
        <p className="text-xs text-slate-500 pt-2">Invite a new admin — they'll get an email to set their own password.</p>
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
        <button
          type="submit"
          disabled={inviting}
          className="w-full rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium py-2 disabled:opacity-60"
        >
          {inviting ? 'Sending invite...' : '+ Invite Admin'}
        </button>
      </form>
    </div>
  );
}
