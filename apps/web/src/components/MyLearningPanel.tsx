import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { getMyTraining, updateTrainingAssignmentStatus } from '../lib/api';
import { CATEGORY_ICONS, CATEGORY_LABELS, CATEGORY_THEME, TRAINING_CATEGORIES } from '../lib/trainingCategories';
import { resourceLinkLabel } from '../lib/resourceLinks';
import { EmployeeTraining, TrainingCategory, TrainingStatus } from '../types';
import { ExternalLinkIcon, TrophyIcon } from './icons';

const STATUS_OPTIONS: { key: TrainingStatus; label: string }[] = [
  { key: 'NOT_STARTED', label: 'Not Started' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
];

const STATUS_PILL: Record<TrainingStatus, string> = {
  NOT_STARTED: 'bg-slate-100 text-slate-500',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-green-100 text-green-700',
};

const STATUS_PILL_ACTIVE: Record<TrainingStatus, string> = {
  NOT_STARTED: 'bg-slate-500 text-white',
  IN_PROGRESS: 'bg-amber-500 text-white',
  COMPLETED: 'bg-green-500 text-white',
};

function motivation(percent: number): string {
  if (percent >= 100) return "All done — great work! You've completed every assigned course.";
  if (percent >= 75) return "Almost there — just a little more to go!";
  if (percent >= 40) return "Nice progress — keep the momentum going!";
  if (percent > 0) return "Good start — keep going, one course at a time.";
  return "Let's get started! Pick any course below whenever you're ready.";
}

export default function MyLearningPanel({ employeeId, title = 'My Learning' }: { employeeId: string; title?: string }) {
  const { token } = useAuth();
  const [items, setItems] = useState<EmployeeTraining[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  function load() {
    if (!token || !employeeId) return;
    getMyTraining(token, employeeId)
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token, employeeId]);
  useAutoRefresh(load);

  async function handleStatusChange(id: string, status: TrainingStatus) {
    if (!token) return;
    setUpdatingId(id);
    setError('');
    try {
      await updateTrainingAssignmentStatus(token, id, status);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  const total = items.length;
  const completed = items.filter((i) => i.status === 'COMPLETED').length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  const byCategory = TRAINING_CATEGORIES.map((cat) => ({
    category: cat,
    items: items.filter((i) => i.course.category === cat),
  })).filter((g) => g.items.length > 0);

  if (loading) return <p className="text-slate-500 text-sm">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo rounded-xl p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-white/90 text-sm mt-1">{motivation(percent)}</p>
          </div>
          {percent >= 100 && total > 0 && <TrophyIcon className="w-10 h-10 flex-shrink-0" />}
        </div>
        {total > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span>
                {completed} of {total} courses completed
              </span>
              <span className="font-semibold">{percent}%</span>
            </div>
            <div className="w-full h-2.5 bg-white/25 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${percent}%` }} />
            </div>
          </div>
        )}
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {total === 0 ? (
        <p className="text-slate-500 text-sm">No training assigned yet.</p>
      ) : (
        byCategory.map(({ category, items: courseItems }) => {
          const theme = CATEGORY_THEME[category];
          const Icon = CATEGORY_ICONS[category];
          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme.chip}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <h3 className={`text-sm font-semibold ${theme.text}`}>{CATEGORY_LABELS[category]}</h3>
                <span className="text-xs text-slate-400">
                  ({courseItems.filter((i) => i.status === 'COMPLETED').length}/{courseItems.length})
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courseItems.map((item) => (
                  <div key={item.id} className={`rounded-xl border ${theme.border} ${theme.bg} p-4`}>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-slate-800 text-sm">{item.course.title}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs flex-shrink-0 ${STATUS_PILL[item.status]}`}>
                        {STATUS_OPTIONS.find((s) => s.key === item.status)?.label}
                      </span>
                    </div>
                    {item.course.description && (
                      <p className="text-xs text-slate-600 mt-2">{item.course.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {item.course.resources.map((r) => (
                        <a
                          key={r.id}
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs bg-white border border-slate-200 rounded-full px-2.5 py-1 text-slate-600 hover:border-mitra-accentFrom hover:text-mitra-accentFrom"
                        >
                          {resourceLinkLabel(r.url, r.label)}
                          <ExternalLinkIcon className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                    <div className="flex gap-1.5 mt-3">
                      {STATUS_OPTIONS.map((s) => (
                        <button
                          key={s.key}
                          disabled={updatingId === item.id}
                          onClick={() => handleStatusChange(item.id, s.key)}
                          className={`text-xs px-2.5 py-1 rounded-full transition-colors disabled:opacity-50 ${
                            item.status === s.key ? STATUS_PILL_ACTIVE[s.key] : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
