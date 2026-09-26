import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyAppraisal, getSkills, submitAppraisal } from '../lib/api';
import { MyAppraisal } from '../types';
import { LookupItem } from '../types';
import { HUE_GRADIENTS, PRIMARY_BUTTON_3D } from '../lib/buttonStyles';
import { StarIcon, XIcon, CheckCircleIcon } from './icons';

const STEP_GRADIENTS = [
  HUE_GRADIENTS.indigo,
  HUE_GRADIENTS.emerald,
  HUE_GRADIENTS.amber,
  HUE_GRADIENTS.rose,
  HUE_GRADIENTS.violet,
  HUE_GRADIENTS.sky,
  HUE_GRADIENTS.fuchsia,
  HUE_GRADIENTS.lime,
];

interface CriterionAnswer {
  rating: number;
  comment: string;
}

// Guided, multi-step self-appraisal submission — one step per active
// weighted criterion (Client & Project Performance, Technical Skills,
// etc, whatever Master Data > Appraisal Criteria currently defines),
// plus a final non-weighted "Career Goals & Support" step with a skills
// picker. Deliberately colorful/interactive per the spec ("make this form
// nice, colorful and interactive") rather than one long static page.
export default function AppraisalForm({
  appraisalId,
  onClose,
  onSubmitted,
}: {
  appraisalId: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { token } = useAuth();
  const [appraisal, setAppraisal] = useState<MyAppraisal | null>(null);
  const [skills, setSkills] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);

  const [answers, setAnswers] = useState<Record<string, CriterionAnswer>>({});
  const [careerGoals, setCareerGoals] = useState('');
  const [managementSupport, setManagementSupport] = useState('');
  const [certifications, setCertifications] = useState('');
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);

  useEffect(() => {
    if (!token) return;
    Promise.all([getMyAppraisal(token, appraisalId), getSkills(token)])
      .then(([a, s]) => {
        setAppraisal(a);
        setSkills(s);
        setCareerGoals(a.careerGoals || '');
        setManagementSupport(a.managementSupport || '');
        setCertifications(a.certifications || '');
        setSelectedSkillIds(a.skillsAcquired.map((sk) => sk.id));
        const initialAnswers: Record<string, CriterionAnswer> = {};
        a.criteria.forEach((c) => {
          initialAnswers[c.criterionId] = { rating: c.selfRating || 0, comment: c.selfComment || '' };
        });
        setAnswers(initialAnswers);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, appraisalId]);

  const criteria = appraisal?.criteria ?? [];
  const totalSteps = criteria.length + 1;
  const isFinalStep = step === criteria.length;
  const currentCriterion = !isFinalStep ? criteria[step] : null;
  const gradient = STEP_GRADIENTS[step % STEP_GRADIENTS.length];

  const canAdvance = useMemo(() => {
    if (!currentCriterion) return true;
    return (answers[currentCriterion.criterionId]?.rating || 0) > 0;
  }, [answers, currentCriterion]);

  function setRating(criterionId: string, rating: number) {
    setAnswers((prev) => ({ ...prev, [criterionId]: { rating, comment: prev[criterionId]?.comment || '' } }));
  }
  function setComment(criterionId: string, comment: string) {
    setAnswers((prev) => ({ ...prev, [criterionId]: { rating: prev[criterionId]?.rating || 0, comment } }));
  }
  function toggleSkill(id: string) {
    setSelectedSkillIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  async function handleSubmit() {
    if (!token || !appraisal) return;
    setSubmitting(true);
    setError('');
    try {
      await submitAppraisal(token, appraisal.id, {
        criteriaScores: criteria.map((c) => ({
          criterionId: c.criterionId,
          selfRating: answers[c.criterionId]?.rating || 1,
          selfComment: answers[c.criterionId]?.comment || undefined,
        })),
        careerGoals: careerGoals || undefined,
        managementSupport: managementSupport || undefined,
        certifications: certifications || undefined,
        skillIds: selectedSkillIds,
      });
      onSubmitted();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-slate-900/30 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        <div className={`h-1.5 ${gradient}`} />
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {appraisal ? appraisal.cycleLabel : 'Self-Appraisal'}
            </p>
            {/* This is the label employees actually need to read at a glance --
                which criterion they're rating right now -- so it gets the
                large, dark, high-contrast treatment rather than a small muted
                caption (per his feedback that the criteria names were too
                light/small to read comfortably). */}
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 leading-snug">
              {loading ? 'Loading...' : isFinalStep ? 'Career Goals & Support' : currentCriterion?.name}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Step dots */}
        {!loading && appraisal && (
          <div className="flex items-center gap-1.5 px-6 py-3">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? STEP_GRADIENTS[i % STEP_GRADIENTS.length] : 'bg-slate-100 dark:bg-slate-800'
                }`}
              />
            ))}
          </div>
        )}

        <div className="px-6 py-4 overflow-y-auto flex-1">
          {loading ? (
            <p className="text-sm text-slate-500">Loading your appraisal form...</p>
          ) : error && !appraisal ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : !appraisal ? null : isFinalStep ? (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Certifications & Skills Acquired
                </label>
                <p className="text-xs text-slate-400 mb-2">Pick any skills you've grown in over this period.</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {skills.map((s) => {
                    const selected = selectedSkillIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSkill(s.id)}
                        className={`text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${
                          selected
                            ? 'bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white border-transparent'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-mitra-accentFrom dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
                <textarea
                  value={certifications}
                  onChange={(e) => setCertifications(e.target.value)}
                  rows={2}
                  placeholder="Courses completed, certifications earned..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Future Goals
                </label>
                <p className="text-xs text-slate-400 mb-2">What skills/roles do you want to target over the next 6 months?</p>
                <textarea
                  value={careerGoals}
                  onChange={(e) => setCareerGoals(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Management Support
                </label>
                <p className="text-xs text-slate-400 mb-2">How can management or OffshoreMitra support your growth?</p>
                <textarea
                  value={managementSupport}
                  onChange={(e) => setManagementSupport(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
                />
              </div>
            </div>
          ) : currentCriterion ? (
            <div className="space-y-4">
              <div className={`rounded-2xl p-4 text-white ${gradient}`}>
                <p className="text-[11px] font-semibold uppercase tracking-wide opacity-90">{currentCriterion.weight}% of your score</p>
                <h3 className="text-lg font-bold mt-0.5 drop-shadow-sm">{currentCriterion.name}</h3>
                {currentCriterion.description && <p className="text-sm opacity-95 mt-1">{currentCriterion.description}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Self-Rating</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(currentCriterion.criterionId, n)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <StarIcon
                        filled={(answers[currentCriterion.criterionId]?.rating || 0) >= n}
                        className={`w-8 h-8 ${
                          (answers[currentCriterion.criterionId]?.rating || 0) >= n ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'
                        }`}
                      />
                    </button>
                  ))}
                  {(answers[currentCriterion.criterionId]?.rating || 0) > 0 && (
                    <span className="ml-2 text-sm font-medium text-slate-500">
                      {answers[currentCriterion.criterionId].rating} / 5
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Key Achievements & Impact
                </label>
                <textarea
                  value={answers[currentCriterion.criterionId]?.comment || ''}
                  onChange={(e) => setComment(currentCriterion.criterionId, e.target.value)}
                  rows={4}
                  placeholder="Describe what you did, the impact it had, and any feedback you received..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
                />
              </div>
            </div>
          ) : null}

          {error && appraisal && <div className="text-sm text-red-600 mt-3">{error}</div>}
        </div>

        {!loading && appraisal && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="text-sm font-medium text-slate-500 px-4 py-2 rounded-lg disabled:opacity-30"
            >
              Back
            </button>
            {isFinalStep ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={`inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl disabled:opacity-50 ${PRIMARY_BUTTON_3D}`}
              >
                <CheckCircleIcon className="w-4 h-4" />
                {submitting ? 'Submitting...' : 'Submit Self-Appraisal'}
              </button>
            ) : (
              <button
                onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
                disabled={!canAdvance}
                className={`text-sm font-semibold px-5 py-2.5 rounded-xl disabled:opacity-40 ${PRIMARY_BUTTON_3D}`}
              >
                Next
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
