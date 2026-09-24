import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTrainingCourses } from '../lib/api';
import { TRACK_LABELS } from '../lib/trainingTracks';
import { LearningTrack, TrainingCategory, TrainingCourse } from '../types';
import { ChevronDownIcon } from './icons';
import QuizEditor from './QuizEditor';

// Staff authoring for one track's assessment content. Mandatory Training
// has a single track-wide assessment, so it renders one QuizEditor
// directly; IAM Engineering and DevOps Engineering keep the per-course
// accordion — expand a row to author/edit that course's assessment. Shared
// by Learning Center's Assessments > Manage tab and Master Data's
// Assessments tab, so there is exactly one place this authoring logic
// lives — separate from TestResultsTable (which shows who's taken what),
// so authoring and results never compete for space.
export default function ManageAssessmentsPanel({
  track,
  categories,
  searchQuery,
}: {
  track: LearningTrack;
  categories?: TrainingCategory[];
  searchQuery?: string;
}) {
  if (track === 'MANDATORY') {
    return (
      <div className="border border-slate-200 rounded-xl p-4">
        <QuizEditor scope={{ kind: 'track', track: 'MANDATORY', subjectTitle: TRACK_LABELS.MANDATORY }} />
      </div>
    );
  }
  return <PerCourseManagePanel categories={categories} searchQuery={searchQuery} />;
}

function PerCourseManagePanel({ categories, searchQuery }: { categories?: TrainingCategory[]; searchQuery?: string }) {
  const { token } = useAuth();
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openCourseId, setOpenCourseId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getTrainingCourses(token, true)
      .then(setCourses)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const q = (searchQuery ?? '').trim().toLowerCase();
  const scoped = courses
    .filter((c) => (categories ? categories.includes(c.category) : true))
    .filter((c) => (q ? c.title.toLowerCase().includes(q) : true));

  if (loading) return <p className="text-sm text-slate-500">Loading courses...</p>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (scoped.length === 0) return <p className="text-sm text-slate-500">No courses match.</p>;

  return (
    <div className="space-y-2">
      {scoped.map((c) => (
        <div key={c.id} className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setOpenCourseId(openCourseId === c.id ? null : c.id)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
          >
            <span className="text-sm font-medium text-slate-700">{c.title}</span>
            <span className="flex items-center gap-2">
              {c.quiz?.active ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Assessment added</span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">No assessment yet</span>
              )}
              <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform ${openCourseId === c.id ? 'rotate-180' : ''}`} />
            </span>
          </button>
          {openCourseId === c.id && (
            <div className="px-4 pb-5 pt-1 border-t border-slate-100">
              <QuizEditor scope={{ kind: 'course', courseId: c.id, subjectTitle: c.title }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
