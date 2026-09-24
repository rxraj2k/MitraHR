import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getQuizDashboardStats, getQuizResults } from '../lib/api';
import { QuizDashboardStats, QuizResultRow, TrainingCategory } from '../types';
import { Avatar } from './Avatar';
import MetricTile from './MetricTile';
import { TILE_THEMES, tileWrapperClass } from '../lib/tileThemes';
import { AwardIcon, CheckCircleIcon, ClipboardListIcon, XCircleIcon } from './icons';

// Admin "Results" panel inside Learning Center > Assessments — a small
// dashboard (aggregate stat tiles) plus the full attempt list, scoped to
// whichever track (Mandatory / IAM / DevOps) categories are passed in.
// Rows may be course-scoped or (Mandatory) track-scoped; subjectTitle
// covers both so this table never needs to branch on which.
export default function TestResultsTable({ categories }: { categories?: TrainingCategory[] }) {
  const { token } = useAuth();
  const [rows, setRows] = useState<QuizResultRow[]>([]);
  const [stats, setStats] = useState<QuizDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([getQuizResults(token, categories), getQuizDashboardStats(token, categories)])
      .then(([r, s]) => {
        setRows(r);
        setStats(s);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, categories?.join(',')]);

  if (loading) return <p className="text-sm text-slate-500">Loading results...</p>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={tileWrapperClass(TILE_THEMES[0])}>
            <MetricTile icon={ClipboardListIcon} label="Assessments Taken" value={stats.totalAttempts} />
          </div>
          <div className={tileWrapperClass(TILE_THEMES[3])}>
            <MetricTile icon={CheckCircleIcon} label="Passed" value={stats.passedCount} />
          </div>
          <div className={tileWrapperClass(TILE_THEMES[2])}>
            <MetricTile icon={AwardIcon} label="Pass Rate" value={`${stats.passRatePercent}%`} />
          </div>
          <div className={tileWrapperClass(TILE_THEMES[5])}>
            <MetricTile icon={AwardIcon} label="Certificates Issued" value={stats.certificatesIssued} sub={`avg score ${stats.avgPercent}%`} />
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500 p-6 text-center">No assessments taken yet in this track.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="px-4 py-2.5 font-medium">Employee</th>
                  <th className="px-4 py-2.5 font-medium">Course / Track</th>
                  <th className="px-4 py-2.5 font-medium">Score</th>
                  <th className="px-4 py-2.5 font-medium">Result</th>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={r.employeeName} photoUrl={r.employeePhotoUrl} size="sm" />
                        <div>
                          <p className="font-medium text-slate-700">{r.employeeName}</p>
                          <p className="text-xs text-slate-400">{[r.designationName, r.departmentName].filter(Boolean).join(' · ')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{r.subjectTitle}</td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {r.correctCount}/{r.totalQuestions} &middot; {r.percent}%
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {r.passed ? <CheckCircleIcon className="w-3 h-3" /> : <XCircleIcon className="w-3 h-3" />}
                        {r.passed ? 'Passed' : 'Not Passed'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{new Date(r.submittedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
