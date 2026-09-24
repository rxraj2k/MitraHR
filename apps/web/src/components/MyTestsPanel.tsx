import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyQuizResults, getMyTraining, getTrackQuizStatus } from '../lib/api';
import { EmployeeTraining, LearningTrack, QuizResultRow, TrainingCategory, TrackQuizStatus } from '../types';
import { CATEGORY_LABELS, CATEGORY_THEME } from '../lib/trainingCategories';
import { AwardIcon, CheckCircleIcon, LockIcon, XCircleIcon } from './icons';
import { PRIMARY_BUTTON_3D } from '../lib/buttonStyles';
import QuizTaker from './QuizTaker';

interface EmployeeIdentity {
  employeeId: string;
  employeeName: string;
  employeeCode?: string | null;
  photoUrl?: string | null;
  departmentName?: string | null;
  designationName?: string | null;
}

// Employee-facing "My Assessments" list for one Learning Center track.
// Mandatory Training has a single track-wide assessment (unlocked once
// EVERY assigned Mandatory course is Completed), so it renders one card;
// IAM Engineering and DevOps Engineering keep the per-course list — each
// assigned course with an active assessment gets its own row, locked until
// that one course is marked Completed.
export default function MyTestsPanel({
  track,
  categories,
  ...identity
}: EmployeeIdentity & {
  track: LearningTrack;
  categories?: TrainingCategory[];
}) {
  if (track === 'MANDATORY') {
    return <TrackAssessmentCard track={track} {...identity} />;
  }
  return <PerCourseAssessmentList categories={categories} {...identity} />;
}

// --- Mandatory Training: one track-wide assessment ---

function TrackAssessmentCard({ track, employeeId, employeeName, employeeCode, photoUrl, departmentName, designationName }: EmployeeIdentity & { track: LearningTrack }) {
  const { token } = useAuth();
  const [status, setStatus] = useState<TrackQuizStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [taking, setTaking] = useState(false);
  const [latest, setLatest] = useState<QuizResultRow | null>(null);

  function load() {
    if (!token || !employeeId) return;
    setLoading(true);
    Promise.all([getTrackQuizStatus(token, track, employeeId), getMyQuizResults(token, employeeId)])
      .then(([s, results]) => {
        setStatus(s);
        setLatest(results.find((r) => r.track === track) || null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token, employeeId, track]);

  if (loading) return <p className="text-sm text-slate-500">Loading assessment...</p>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!status?.quiz) return <p className="text-slate-500 text-sm">No assessment available for this track yet.</p>;

  if (taking) {
    return (
      <div className="space-y-4">
        <button onClick={() => { setTaking(false); load(); }} className="text-xs text-mitra-accentFrom hover:underline">
          &larr; Back to my assessments
        </button>
        <QuizTaker
          key={status.quiz.id}
          quizId={status.quiz.id}
          employeeId={employeeId}
          employeeName={employeeName}
          employeeCode={employeeCode}
          photoUrl={photoUrl}
          departmentName={departmentName}
          designationName={designationName}
          onSubmitted={load}
        />
      </div>
    );
  }

  const locked = !status.unlocked;

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <span className="font-medium text-slate-800 text-sm">{status.quiz.title}</span>
        <p className="text-xs text-slate-500 mt-0.5">
          Covers all {status.totalCourses} Mandatory Training course{status.totalCourses === 1 ? '' : 's'} assigned to you (
          {status.completedCourses}/{status.totalCourses} completed).
        </p>
        {latest && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs">
            {latest.passed ? (
              <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <XCircleIcon className="w-3.5 h-3.5 text-rose-600" />
            )}
            <span className={latest.passed ? 'text-emerald-700' : 'text-rose-700'}>
              Last attempt: {latest.percent}% ({latest.correctCount}/{latest.totalQuestions})
            </span>
          </div>
        )}
      </div>
      {locked ? (
        <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <LockIcon className="w-3.5 h-3.5" /> Finish every course in this track to unlock
        </span>
      ) : (
        <button onClick={() => setTaking(true)} className={`rounded-lg text-xs font-semibold px-4 py-2 flex items-center gap-1.5 ${PRIMARY_BUTTON_3D}`}>
          <AwardIcon className="w-3.5 h-3.5" /> {latest ? 'Retake Assessment' : 'Take Assessment'}
        </button>
      )}
    </div>
  );
}

// --- IAM Engineering / DevOps Engineering: one assessment per course ---

function PerCourseAssessmentList({
  categories,
  employeeId,
  employeeName,
  employeeCode,
  photoUrl,
  departmentName,
  designationName,
}: EmployeeIdentity & { categories?: TrainingCategory[] }) {
  const { token } = useAuth();
  const [items, setItems] = useState<EmployeeTraining[]>([]);
  const [results, setResults] = useState<QuizResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);

  function load() {
    if (!token || !employeeId) return;
    setLoading(true);
    Promise.all([getMyTraining(token, employeeId), getMyQuizResults(token, employeeId, categories)])
      .then(([training, res]) => {
        setItems(training);
        setResults(res);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token, employeeId, categories?.join(',')]);

  const withTests = items.filter((i) => categories?.includes(i.course.category) && i.course.quiz?.active);

  const latestResultByCourse = new Map<string, QuizResultRow>();
  for (const r of results) {
    if (r.courseId && !latestResultByCourse.has(r.courseId)) latestResultByCourse.set(r.courseId, r);
  }

  if (loading) return <p className="text-sm text-slate-500">Loading assessments...</p>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  if (activeCourseId) {
    const item = withTests.find((i) => i.courseId === activeCourseId);
    if (!item?.course.quiz) {
      setActiveCourseId(null);
      return null;
    }
    return (
      <div className="space-y-4">
        <button onClick={() => { setActiveCourseId(null); load(); }} className="text-xs text-mitra-accentFrom hover:underline">
          &larr; Back to my assessments
        </button>
        <QuizTaker
          key={item.course.quiz.id}
          quizId={item.course.quiz.id}
          employeeId={employeeId}
          employeeName={employeeName}
          employeeCode={employeeCode}
          photoUrl={photoUrl}
          departmentName={departmentName}
          designationName={designationName}
          onSubmitted={load}
        />
      </div>
    );
  }

  if (withTests.length === 0) {
    return <p className="text-slate-500 text-sm">No assessments available in this track yet.</p>;
  }

  return (
    <div className="space-y-3">
      {withTests.map((item) => {
        const theme = CATEGORY_THEME[item.course.category];
        const locked = item.status !== 'COMPLETED';
        const latest = latestResultByCourse.get(item.courseId);
        return (
          <div key={item.id} className={`rounded-xl border ${theme.border} ${theme.bg} p-4 flex items-center justify-between gap-4 flex-wrap`}>
            <div>
              <span className={`text-xs px-1.5 py-0.5 rounded mr-2 ${theme.chip}`}>{CATEGORY_LABELS[item.course.category]}</span>
              <span className="font-medium text-slate-800 text-sm">{item.course.title}</span>
              {latest && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                  {latest.passed ? (
                    <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <XCircleIcon className="w-3.5 h-3.5 text-rose-600" />
                  )}
                  <span className={latest.passed ? 'text-emerald-700' : 'text-rose-700'}>
                    Last attempt: {latest.percent}% ({latest.correctCount}/{latest.totalQuestions})
                  </span>
                </div>
              )}
            </div>
            {locked ? (
              <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <LockIcon className="w-3.5 h-3.5" /> Finish the course to unlock
              </span>
            ) : (
              <button onClick={() => setActiveCourseId(item.courseId)} className={`rounded-lg text-xs font-semibold px-4 py-2 flex items-center gap-1.5 ${PRIMARY_BUTTON_3D}`}>
                <AwardIcon className="w-3.5 h-3.5" /> {latest ? 'Retake Assessment' : 'Take Assessment'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
