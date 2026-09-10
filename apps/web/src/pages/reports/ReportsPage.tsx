import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import TabBar, { TabBarItem } from '../../components/TabBar';
import { SparkleIcon } from '../../components/icons';
import {
  getAbsenteeismReport,
  getAttendanceAnalytics,
  getProjectClosureReports,
  updateAttendanceSettings,
} from '../../lib/api';
import { AbsenteeismRow, AttendanceAnalytics, ProjectClosure } from '../../types';

type TabKey = 'absenteeism' | 'attendance' | 'closures';

const TABS: TabBarItem<TabKey>[] = [
  { key: 'absenteeism', label: 'Absenteeism', color: 'rose' },
  { key: 'attendance', label: 'Late Arrivals & Half Days', color: 'amber' },
  { key: 'closures', label: 'Project Closures', color: 'sky' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function MonthPicker({
  year,
  month,
  onChange,
}: {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}) {
  function shift(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    onChange(y, m);
  }
  return (
    <div className="flex items-center gap-3 mb-4">
      <button
        onClick={() => shift(-1)}
        className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
      >
        ‹
      </button>
      <span className="text-sm font-medium text-slate-700 w-32 text-center">
        {MONTH_NAMES[month - 1]} {year}
      </span>
      <button
        onClick={() => shift(1)}
        className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
      >
        ›
      </button>
    </div>
  );
}

function AbsenteeismTab({ token }: { token: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rows, setRows] = useState<AbsenteeismRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    getAbsenteeismReport(token, year, month)
      .then(setRows)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, year, month]);

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">
        A past working day with no check-in and no approved leave counts as absent — same rule the team attendance
        calendar uses.
      </p>
      <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-500 text-sm">No unexplained absences this month.</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs text-slate-500">
                <th className="px-4 py-2 font-medium">Employee</th>
                <th className="px-4 py-2 font-medium">Absent Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 font-medium text-slate-700">{r.fullName}</td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-rose-100 text-rose-700">
                      {r.absentDays}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AttendanceAnalyticsTab({ token }: { token: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<AttendanceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [form, setForm] = useState({ expectedStartTime: '09:30', graceMinutes: 15, halfDayThresholdHours: 4 });

  function load() {
    setLoading(true);
    getAttendanceAnalytics(token, year, month)
      .then((d) => {
        setData(d);
        setForm({
          expectedStartTime: d.settings.expectedStartTime,
          graceMinutes: d.settings.graceMinutes,
          halfDayThresholdHours: d.settings.halfDayThresholdHours,
        });
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token, year, month]);

  async function saveSettings() {
    setSavingSettings(true);
    setError('');
    try {
      await updateAttendanceSettings(token, form);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">
        "Late" and "half day" are measured against the policy below — anyone who never clocks out simply has no
        half-day signal for that day.
      </p>

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Expected start time</label>
          <input
            type="time"
            value={form.expectedStartTime}
            onChange={(e) => setForm({ ...form, expectedStartTime: e.target.value })}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Grace period (minutes)</label>
          <input
            type="number"
            min={0}
            max={180}
            value={form.graceMinutes}
            onChange={(e) => setForm({ ...form, graceMinutes: parseInt(e.target.value, 10) || 0 })}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-28"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Half-day threshold (hours)</label>
          <input
            type="number"
            min={0}
            max={12}
            step={0.5}
            value={form.halfDayThresholdHours}
            onChange={(e) => setForm({ ...form, halfDayThresholdHours: parseFloat(e.target.value) || 0 })}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-28"
          />
        </div>
        <button
          onClick={saveSettings}
          disabled={savingSettings}
          className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
        >
          {savingSettings ? 'Saving...' : 'Save Policy'}
        </button>
      </div>

      <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : !data || data.rows.length === 0 ? (
        <p className="text-slate-500 text-sm">No attendance records this month.</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs text-slate-500">
                <th className="px-4 py-2 font-medium">Employee</th>
                <th className="px-4 py-2 font-medium">Present Days</th>
                <th className="px-4 py-2 font-medium">Late Arrivals</th>
                <th className="px-4 py-2 font-medium">Half Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 font-medium text-slate-700">{r.fullName}</td>
                  <td className="px-4 py-2 text-slate-500">{r.presentDays}</td>
                  <td className="px-4 py-2">
                    {r.lateDays > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">{r.lateDays}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {r.halfDays > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">{r.halfDays}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProjectClosuresTab({ token }: { token: string }) {
  const [rows, setRows] = useState<ProjectClosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getProjectClosureReports(token)
      .then(setRows)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">
        Every project that's been through the formal "End Project" workflow, with its closing summary and duration.
      </p>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-500 text-sm">No projects have been formally closed out yet.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((p) => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">{p.name}</h3>
                  <p className="text-xs text-slate-500">{p.clientName}</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  {p.startDate && p.endDate && (
                    <p>
                      {new Date(p.startDate).toLocaleDateString()} – {new Date(p.endDate).toLocaleDateString()}
                    </p>
                  )}
                  {p.durationDays != null && <p className="font-medium text-slate-700">{p.durationDays} days</p>}
                </div>
              </div>
              {p.closureSummary && <p className="text-sm text-slate-600 mt-3">{p.closureSummary}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<TabKey>('absenteeism');

  if (!token) return null;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800 mb-1">Reports & Analytics</h1>
      <p className="text-sm text-slate-500 mb-6">Drill-down detail behind the dashboard tiles on Home.</p>

      <Link
        to="/reports-preview"
        className="mb-6 flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700 transition hover:bg-indigo-100"
      >
        <SparkleIcon className="h-4 w-4 flex-shrink-0" />
        <span>
          <span className="font-medium">Preview a redesigned Reports experience</span>
          {' '}&mdash; KPI cards, charts, predictive insights, and deep-dive tables (mock data, UI preview only).
        </span>
      </Link>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'absenteeism' && <AbsenteeismTab token={token} />}
      {tab === 'attendance' && <AttendanceAnalyticsTab token={token} />}
      {tab === 'closures' && <ProjectClosuresTab token={token} />}
    </div>
  );
}
