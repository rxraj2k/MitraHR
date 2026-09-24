import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { checkIn, checkOut, getAttendanceToday } from '../lib/api';
import { AttendanceToday } from '../types';

// A small daily "mark yourself present" widget. Shown to any session with
// a linked Employee record (OTP employees always; Admins only if linked).
// Clock-out is additive: it never replaces "Mark Present", it's purely so
// the late-arrival/half-day report has an end-of-day timestamp to work with.
export default function AttendanceCheckIn() {
  const { token } = useAuth();
  const [status, setStatus] = useState<AttendanceToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function load() {
    if (!token) return;
    getAttendanceToday(token)
      .then(setStatus)
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token]);
  useAutoRefresh(load);

  async function handleCheckIn() {
    if (!token) return;
    setError('');
    setSubmitting(true);
    try {
      await checkIn(token);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckOut() {
    if (!token) return;
    setError('');
    setSubmitting(true);
    try {
      await checkOut(token);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">Today's Attendance</h2>
        <p className="text-xs text-slate-500 mt-0.5">{today}</p>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>
      {loading ? (
        <span className="text-sm text-slate-400">Loading...</span>
      ) : status?.checkedIn ? (
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-green-100 text-green-700 text-sm font-medium px-4 py-2">
            ✓ Marked present
            {status.markedAt && (
              <span className="text-green-600 font-normal">
                at {new Date(status.markedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </span>
            )}
          </span>
          {status.checkedOut ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 text-slate-600 text-sm font-medium px-4 py-2">
              Clocked out
              {status.checkOutAt && (
                <span className="text-slate-500 font-normal">
                  at {new Date(status.checkOutAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </span>
              )}
            </span>
          ) : (
            <button
              onClick={handleCheckOut}
              disabled={submitting}
              className="rounded-lg border border-slate-200 text-slate-600 text-sm font-medium px-4 py-2 hover:bg-slate-50 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Clock Out'}
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={handleCheckIn}
          disabled={submitting}
          className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-50 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
        >
          {submitting ? 'Marking...' : "Mark Me Present Today"}
        </button>
      )}
    </div>
  );
}
