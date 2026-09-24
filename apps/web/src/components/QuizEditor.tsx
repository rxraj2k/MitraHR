import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  deleteCourseQuiz,
  deleteTrackQuiz,
  getCourseQuiz,
  getTrackQuiz,
  saveCourseQuiz,
  saveTrackQuiz,
} from '../lib/api';
import { LearningTrack, QuizStaff } from '../types';
import { PlusCircleIcon, TrashIcon } from './icons';
import { PRIMARY_BUTTON_3D } from '../lib/buttonStyles';
import ConfirmModal from './ConfirmModal';

interface DraftOption {
  text: string;
  isCorrect: boolean;
}
interface DraftQuestion {
  text: string;
  options: DraftOption[];
}

// Either scope hits the same UpsertQuizDto shape server-side — course-scoped
// for IAM/DevOps assessments, track-scoped for Mandatory Training's single
// assessment. subjectTitle is just what to show in the heading.
export type QuizEditorScope =
  | { kind: 'course'; courseId: string; subjectTitle: string }
  | { kind: 'track'; track: LearningTrack; subjectTitle: string };

function blankQuestion(): DraftQuestion {
  return {
    text: '',
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
  };
}

function fromQuiz(quiz: QuizStaff): { title: string; passPercent: number; questions: DraftQuestion[] } {
  return {
    title: quiz.title,
    passPercent: quiz.passPercent,
    questions: quiz.questions.map((q) => ({
      text: q.text,
      options: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
    })),
  };
}

// Staff-facing authoring UI for one assessment — Learning Center >
// Assessments > Manage. Questions/options are always saved wholesale (see
// QuizzesService.saveQuiz), so this component keeps the full draft in local
// state and PUTs it all on Save.
export default function QuizEditor({ scope }: { scope: QuizEditorScope }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('Knowledge Check');
  const [passPercent, setPassPercent] = useState(70);
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [hasQuiz, setHasQuiz] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const scopeKey = scope.kind === 'course' ? `course:${scope.courseId}` : `track:${scope.track}`;

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    setMessage('');
    const fetchQuiz = scope.kind === 'course' ? getCourseQuiz(token, scope.courseId) : getTrackQuiz(token, scope.track);
    fetchQuiz
      .then((quiz) => {
        if (quiz) {
          setHasQuiz(true);
          const draft = fromQuiz(quiz);
          setTitle(draft.title);
          setPassPercent(draft.passPercent);
          setQuestions(draft.questions);
        } else {
          setHasQuiz(false);
          setTitle('Knowledge Check');
          setPassPercent(70);
          setQuestions([blankQuestion()]);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, scopeKey]);

  function updateQuestionText(qi: number, text: string) {
    setQuestions((prev) => prev.map((q, i) => (i === qi ? { ...q, text } : q)));
  }
  function updateOptionText(qi: number, oi: number, text: string) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? { ...o, text } : o)) } : q)),
    );
  }
  function setCorrect(qi: number, oi: number) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qi ? { ...q, options: q.options.map((o, j) => ({ ...o, isCorrect: j === oi })) } : q)),
    );
  }
  function addOption(qi: number) {
    setQuestions((prev) => prev.map((q, i) => (i === qi ? { ...q, options: [...q.options, { text: '', isCorrect: false }] } : q)));
  }
  function removeOption(qi: number, oi: number) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qi || q.options.length <= 2) return q;
        const options = q.options.filter((_, j) => j !== oi);
        if (!options.some((o) => o.isCorrect)) options[0].isCorrect = true;
        return { ...q, options };
      }),
    );
  }
  function addQuestion() {
    setQuestions((prev) => [...prev, blankQuestion()]);
  }
  function removeQuestion(qi: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== qi));
  }

  function validate(): string | null {
    if (questions.length === 0) return 'Add at least one question.';
    for (const q of questions) {
      if (!q.text.trim()) return 'Every question needs text.';
      if (q.options.filter((o) => o.text.trim()).length < 2) return 'Every question needs at least 2 answer choices.';
      if (!q.options.some((o) => o.isCorrect && o.text.trim())) return 'Every question needs one correct answer marked.';
    }
    return null;
  }

  async function handleSave() {
    if (!token) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const data = {
        title: title.trim() || 'Knowledge Check',
        passPercent,
        active: true,
        questions: questions.map((q) => ({
          text: q.text.trim(),
          options: q.options.filter((o) => o.text.trim()).map((o) => ({ text: o.text.trim(), isCorrect: o.isCorrect })),
        })),
      };
      if (scope.kind === 'course') {
        await saveCourseQuiz(token, scope.courseId, data);
      } else {
        await saveTrackQuiz(token, scope.track, data);
      }
      setHasQuiz(true);
      setMessage('Assessment saved.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!token) return;
    setDeleting(true);
    try {
      if (scope.kind === 'course') {
        await deleteCourseQuiz(token, scope.courseId);
      } else {
        await deleteTrackQuiz(token, scope.track);
      }
      setHasQuiz(false);
      setTitle('Knowledge Check');
      setPassPercent(70);
      setQuestions([blankQuestion()]);
      setConfirmDelete(false);
      setMessage('Assessment removed.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500 px-1">Loading assessment...</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{scope.subjectTitle}</h3>
          <p className="text-xs text-slate-500">
            {scope.kind === 'course'
              ? 'Multiple-choice assessment, unlocked once the course is marked Completed.'
              : 'Multiple-choice assessment covering the whole track, unlocked once every assigned course in it is Completed.'}
          </p>
        </div>
        {hasQuiz && (
          <button onClick={() => setConfirmDelete(true)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
            <TrashIcon className="w-3.5 h-3.5" /> Remove assessment
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Assessment title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Passing score (%)</label>
          <input
            type="number"
            min={1}
            max={100}
            value={passPercent}
            onChange={(e) => setPassPercent(Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 0)))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((q, qi) => (
          <div key={qi} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-2 mb-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center justify-center mt-1">
                {qi + 1}
              </span>
              <input
                value={q.text}
                onChange={(e) => updateQuestionText(qi, e.target.value)}
                placeholder="Question text"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              />
              {questions.length > 1 && (
                <button onClick={() => removeQuestion(qi)} className="text-slate-400 hover:text-red-500 mt-1.5">
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="space-y-2 ml-8">
              {q.options.map((o, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={o.isCorrect}
                    onChange={() => setCorrect(qi, oi)}
                    title="Mark as correct answer"
                    className="w-4 h-4 accent-emerald-600"
                  />
                  <input
                    value={o.text}
                    onChange={(e) => updateOptionText(qi, oi, e.target.value)}
                    placeholder={`Option ${oi + 1}`}
                    className={`flex-1 rounded-lg border px-3 py-1.5 text-sm bg-white ${
                      o.isCorrect ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-300'
                    }`}
                  />
                  {q.options.length > 2 && (
                    <button onClick={() => removeOption(qi, oi)} className="text-slate-400 hover:text-red-500">
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => addOption(qi)} className="text-xs text-mitra-accentFrom hover:underline">
                + Add option
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addQuestion}
        className="flex items-center gap-1.5 text-sm font-medium text-mitra-accentFrom hover:underline"
      >
        <PlusCircleIcon className="w-4 h-4" /> Add question
      </button>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {message && <div className="text-sm text-emerald-600">{message}</div>}

      <button onClick={handleSave} disabled={saving} className={`rounded-lg text-sm font-medium px-5 py-2 disabled:opacity-50 ${PRIMARY_BUTTON_3D}`}>
        {saving ? 'Saving...' : 'Save Assessment'}
      </button>

      <ConfirmModal
        open={confirmDelete}
        title="Remove this assessment?"
        message="Employees will no longer be able to take this assessment. Past results are kept."
        confirmLabel="Remove"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
