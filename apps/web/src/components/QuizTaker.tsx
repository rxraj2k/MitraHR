import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getQuizToTake, submitQuiz } from '../lib/api';
import { QuizSubmitResult, QuizToTake } from '../types';
import { PRIMARY_BUTTON_3D } from '../lib/buttonStyles';
import { CheckCircleIcon, XCircleIcon } from './icons';
import CertificateCard from './CertificateCard';

// Employee-facing assessment-taking flow for one quiz — either course-
// scoped (unlocked once that course is COMPLETED) or track-scoped
// (unlocked once every assigned course in the track is COMPLETED); the
// server enforces this either way (QuizzesService.assertUnlocked). Renders
// the MCQ form, then the graded certificate + a per-question review once
// submitted.
export default function QuizTaker({
  quizId,
  employeeId,
  employeeName,
  employeeCode,
  photoUrl,
  departmentName,
  designationName,
  onSubmitted,
}: {
  quizId: string;
  employeeId: string;
  employeeName: string;
  employeeCode?: string | null;
  photoUrl?: string | null;
  departmentName?: string | null;
  designationName?: string | null;
  onSubmitted?: () => void;
}) {
  const { token } = useAuth();
  const [quiz, setQuiz] = useState<QuizToTake | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<QuizSubmitResult | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    setResult(null);
    setAnswers({});
    getQuizToTake(token, quizId, employeeId)
      .then(setQuiz)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, quizId, employeeId]);

  async function handleSubmit() {
    if (!token || !quiz) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await submitQuiz(token, quizId, {
        employeeId,
        answers: quiz.questions.map((q) => ({ questionId: q.id, selectedOptionId: answers[q.id] })),
      });
      setResult(res);
      onSubmitted?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading assessment...</p>;
  if (error && !quiz) return <div className="text-sm text-red-600">{error}</div>;
  if (!quiz) return null;

  if (result) {
    return (
      <div className="space-y-5">
        <CertificateCard
          employeeName={employeeName}
          employeeCode={employeeCode}
          photoUrl={photoUrl}
          departmentName={departmentName}
          designationName={designationName}
          subjectTitle={result.subjectTitle}
          totalQuestions={result.totalQuestions}
          correctCount={result.correctCount}
          incorrectCount={result.incorrectCount}
          percent={result.percent}
          passed={result.passed}
          passPercent={result.passPercent}
          date={result.submittedAt}
        />
        <p className="text-xs text-slate-500 text-center">
          A copy of this result has been emailed to you and to the admin team.
        </p>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-700">Review</h4>
          {result.review.map((q, qi) => (
            <div key={q.id} className="rounded-xl border border-slate-200 p-3">
              <p className="text-sm text-slate-700 mb-2">
                {qi + 1}. {q.text}
              </p>
              <div className="space-y-1">
                {q.options.map((o) => {
                  const wasSelected = q.selectedOptionId === o.id;
                  const cls = o.isCorrect
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : wasSelected
                    ? 'text-rose-700 bg-rose-50 border-rose-200'
                    : 'text-slate-500 border-slate-200';
                  return (
                    <div key={o.id} className={`flex items-center gap-2 text-xs rounded-lg border px-2.5 py-1.5 ${cls}`}>
                      {o.isCorrect ? (
                        <CheckCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                      ) : wasSelected ? (
                        <XCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                      ) : (
                        <span className="w-3.5 h-3.5 flex-shrink-0" />
                      )}
                      <span>{o.text}</span>
                      {wasSelected && <span className="ml-auto text-[10px] uppercase font-semibold">Your answer</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const unanswered = quiz.questions.filter((q) => !answers[q.id]).length;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-slate-800">{quiz.title}</h3>
        <p className="text-xs text-slate-500">
          {quiz.subjectTitle} &middot; {quiz.questions.length} question{quiz.questions.length === 1 ? '' : 's'} &middot; passing score{' '}
          {quiz.passPercent}%
        </p>
      </div>

      <div className="space-y-4">
        {quiz.questions.map((q, qi) => (
          <div key={q.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-800 mb-3">
              {qi + 1}. {q.text}
            </p>
            <div className="space-y-2">
              {q.options.map((o) => (
                <label
                  key={o.id}
                  className={`flex items-center gap-2 text-sm rounded-lg border px-3 py-2 cursor-pointer bg-white ${
                    answers[q.id] === o.id ? 'border-mitra-accentFrom ring-1 ring-mitra-accentFrom/40' : 'border-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={answers[q.id] === o.id}
                    onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: o.id }))}
                    className="w-4 h-4 accent-mitra-accentFrom"
                  />
                  {o.text}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {unanswered > 0 && (
        <p className="text-xs text-amber-600">
          {unanswered} question{unanswered === 1 ? '' : 's'} left unanswered.
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className={`rounded-lg text-sm font-medium px-6 py-2.5 disabled:opacity-50 ${PRIMARY_BUTTON_3D}`}
      >
        {submitting ? 'Submitting...' : 'Submit Assessment'}
      </button>
    </div>
  );
}
