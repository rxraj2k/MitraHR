import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { finalizeAppraisal, getAppraisal, saveAppraisalReview } from '../lib/api';
import { AdminAppraisalDetail } from '../types';
import { Avatar } from './Avatar';
import { StarIcon, XIcon, LockIcon, AlertTriangleIcon, CheckCircleIcon } from './icons';
import { PRIMARY_BUTTON_3D } from '../lib/buttonStyles';
import AppraisalLetterView from './AppraisalLetterView';

function formatDate(iso: string | null | undefined) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatMoney(n: number | null | undefined) {
  if (n == null) return '-';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

interface ManagerAnswer {
  rating: number;
  comment: string;
}

// Side-by-side self-vs-manager review, a live weighted-score calculator,
// and the compensation decision block -- everything the spec's "Appraisal
// Review Drawer" asks for, in one panel. UNDER_MANAGER_REVIEW is fully
// editable; COMPLETED renders the same layout read-only with a link to
// the finalized letter.
export default function AppraisalReviewDrawer({
  appraisalId,
  onClose,
  onUpdated,
}: {
  appraisalId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { token } = useAuth();
  const [appraisal, setAppraisal] = useState<AdminAppraisalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [showLetter, setShowLetter] = useState(false);

  const [managerAnswers, setManagerAnswers] = useState<Record<string, ManagerAnswer>>({});
  const [currentCTC, setCurrentCTC] = useState('');
  const [incrementPercent, setIncrementPercent] = useState('');
  const [incrementAmount, setIncrementAmount] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');

  function load() {
    if (!token) return;
    setLoading(true);
    getAppraisal(token, appraisalId)
      .then((a) => {
        setAppraisal(a);
        const answers: Record<string, ManagerAnswer> = {};
        a.criteria.forEach((c) => {
          answers[c.criterionId] = { rating: c.managerRating || 0, comment: c.managerComment || '' };
        });
        setManagerAnswers(answers);
        setCurrentCTC(a.currentCTC != null ? String(a.currentCTC) : '');
        setIncrementPercent(a.incrementPercent != null ? String(a.incrementPercent) : '');
        setIncrementAmount(a.incrementAmount != null ? String(a.incrementAmount) : '');
        setEffectiveDate(a.effectiveDate ? a.effectiveDate.slice(0, 10) : '');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token, appraisalId]);

  const isReadOnly = appraisal?.status === 'COMPLETED';
  const isPending = appraisal?.status === 'PENDING_EMPLOYEE';

  const liveScore = useMemo(() => {
    if (!appraisal) return null;
    const rated = appraisal.criteria.filter((c) => (managerAnswers[c.criterionId]?.rating || 0) > 0);
    if (!rated.length) return null;
    const sum = rated.reduce((acc, c) => acc + (managerAnswers[c.criterionId].rating * c.weight) / 100, 0);
    return Math.round(sum * 100) / 100;
  }, [appraisal, managerAnswers]);

  const ctcNum = Number(currentCTC) || 0;
  const revisedCTC = ctcNum + (Number(incrementAmount) || 0);

  function setRating(criterionId: string, rating: number) {
    setManagerAnswers((prev) => ({ ...prev, [criterionId]: { rating, comment: prev[criterionId]?.comment || '' } }));
  }
  function setComment(criterionId: string, comment: string) {
    setManagerAnswers((prev) => ({ ...prev, [criterionId]: { rating: prev[criterionId]?.rating || 0, comment } }));
  }
  function onPercentChange(value: string) {
    setIncrementPercent(value);
    if (value && ctcNum) {
      setIncrementAmount(String(Math.round((ctcNum * Number(value)) / 100)));
    }
  }
  function onAmountChange(value: string) {
    setIncrementAmount(value);
    if (value && ctcNum) {
      setIncrementPercent(String(Math.round((Number(value) / ctcNum) * 1000) / 10));
    }
  }

  function buildPayload() {
    if (!appraisal) return null;
    return {
      criteriaReviews: appraisal.criteria
        .filter((c) => (managerAnswers[c.criterionId]?.rating || 0) > 0)
        .map((c) => ({
          criterionId: c.criterionId,
          managerRating: managerAnswers[c.criterionId].rating,
          managerComment: managerAnswers[c.criterionId].comment || undefined,
        })),
      currentCTC: currentCTC ? Number(currentCTC) : undefined,
      incrementPercent: incrementPercent ? Number(incrementPercent) : undefined,
      incrementAmount: incrementAmount ? Number(incrementAmount) : undefined,
      effectiveDate: effectiveDate || undefined,
    };
  }

  async function handleSaveDraft() {
    const payload = buildPayload();
    if (!token || !payload) return;
    setSaving(true);
    setError('');
    try {
      await saveAppraisalReview(token, appraisalId, payload);
      onUpdated();
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleFinalize() {
    const payload = buildPayload();
    if (!token || !payload) return;
    setFinalizing(true);
    setError('');
    try {
      await finalizeAppraisal(token, appraisalId, payload);
      onUpdated();
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFinalizing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 h-full w-full max-w-3xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {appraisal && (
              <>
                <Avatar name={appraisal.employee.fullName} photoUrl={appraisal.employee.photoUrl} />
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 truncate">{appraisal.employee.fullName}</h2>
                  <p className="text-xs text-slate-400">
                    {appraisal.cycleLabel} · {appraisal.employee.designation?.name || '-'}
                  </p>
                </div>
              </>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : !appraisal ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : isPending ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-4 text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangleIcon className="w-4 h-4 flex-shrink-0" />
              Waiting on the employee to submit their self-appraisal.
            </div>
          ) : (
            <>
              {isReadOnly && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900 p-3 text-sm text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <LockIcon className="w-4 h-4 flex-shrink-0" /> Finalized {formatDate(appraisal.finalizedAt)} by {appraisal.finalizedByName || 'admin'}
                  </span>
                  <button onClick={() => setShowLetter(true)} className="font-medium underline flex-shrink-0">
                    View Letter
                  </button>
                </div>
              )}

              {/* Live weighted score */}
              <div className="rounded-2xl bg-gradient-to-br from-mitra-accentFrom to-mitra-accentTo text-white p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">Weighted Score</p>
                  <p className="text-2xl font-bold mt-0.5">{liveScore != null ? liveScore.toFixed(1) : '-'} / 5.0</p>
                </div>
                <div className="text-right text-xs opacity-90">
                  <p>Self-Score: {appraisal.selfWeightedScore?.toFixed(1) ?? '-'} / 5.0</p>
                  <p>Submitted {formatDate(appraisal.selfSubmittedAt)}</p>
                </div>
              </div>

              {/* Side-by-side criteria */}
              <div className="space-y-4">
                {appraisal.criteria.map((c) => (
                  <div key={c.criterionId} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 px-4 py-2">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{c.name}</span>
                      <span className="text-xs font-medium text-slate-400">{c.weight}%</span>
                    </div>
                    <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
                      <div className="p-4">
                        <p className="text-[11px] font-semibold uppercase text-slate-400 mb-1.5">Employee Self-Rating</p>
                        <div className="flex items-center gap-0.5 mb-2">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <StarIcon key={n} filled={(c.selfRating || 0) >= n} className={`w-4 h-4 ${(c.selfRating || 0) >= n ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'}`} />
                          ))}
                          <span className="text-xs text-slate-400 ml-1">{c.selfRating || '-'}/5</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap">{c.selfComment || 'No comment provided.'}</p>
                      </div>
                      <div className="p-4">
                        <p className="text-[11px] font-semibold uppercase text-slate-400 mb-1.5">Manager Rating</p>
                        <div className="flex items-center gap-0.5 mb-2">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              disabled={isReadOnly}
                              onClick={() => setRating(c.criterionId, n)}
                              className="disabled:cursor-default"
                            >
                              <StarIcon
                                filled={(managerAnswers[c.criterionId]?.rating || 0) >= n}
                                className={`w-5 h-5 ${(managerAnswers[c.criterionId]?.rating || 0) >= n ? 'text-mitra-accentFrom' : 'text-slate-200 dark:text-slate-700'}`}
                              />
                            </button>
                          ))}
                        </div>
                        <textarea
                          disabled={isReadOnly}
                          value={managerAnswers[c.criterionId]?.comment || ''}
                          onChange={(e) => setComment(c.criterionId, e.target.value)}
                          rows={2}
                          placeholder="Manager feedback..."
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 text-xs disabled:opacity-60"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {(appraisal.careerGoals || appraisal.managementSupport || appraisal.certifications || appraisal.skillsAcquired.length > 0) && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
                  <p className="text-[11px] font-semibold uppercase text-slate-400">Career Goals & Support</p>
                  {appraisal.careerGoals && <p className="text-xs text-slate-600 dark:text-slate-300"><strong>Future goals:</strong> {appraisal.careerGoals}</p>}
                  {appraisal.managementSupport && <p className="text-xs text-slate-600 dark:text-slate-300"><strong>Support needed:</strong> {appraisal.managementSupport}</p>}
                  {appraisal.certifications && <p className="text-xs text-slate-600 dark:text-slate-300"><strong>Certifications:</strong> {appraisal.certifications}</p>}
                  {appraisal.skillsAcquired.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {appraisal.skillsAcquired.map((s) => (
                        <span key={s.id} className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full px-2 py-0.5">
                          {s.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Compensation decision */}
              <div className="rounded-xl border-2 border-dashed border-emerald-200 dark:border-emerald-900 p-4 space-y-3">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Compensation Decision</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Current CTC</label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={currentCTC}
                      onChange={(e) => setCurrentCTC(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Effective Date</label>
                    <input
                      type="date"
                      disabled={isReadOnly}
                      value={effectiveDate}
                      onChange={(e) => setEffectiveDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Increment %</label>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      step={0.5}
                      disabled={isReadOnly}
                      value={incrementPercent || 0}
                      onChange={(e) => onPercentChange(e.target.value)}
                      className="w-full"
                    />
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={incrementPercent}
                      onChange={(e) => onPercentChange(e.target.value)}
                      className="w-full mt-1 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-1.5 text-sm disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Increment Amount</label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={incrementAmount}
                      onChange={(e) => onAmountChange(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm disabled:opacity-60"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2.5">
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Revised CTC</span>
                  <span className="text-base font-bold text-emerald-700 dark:text-emerald-300">{formatMoney(revisedCTC)}</span>
                </div>
              </div>

              {error && <div className="text-sm text-red-600">{error}</div>}
            </>
          )}
        </div>

        {appraisal && !isPending && !isReadOnly && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
            <button
              onClick={handleSaveDraft}
              disabled={saving || finalizing}
              className="text-sm font-medium text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={handleFinalize}
              disabled={saving || finalizing}
              className={`inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl disabled:opacity-50 ${PRIMARY_BUTTON_3D}`}
            >
              <CheckCircleIcon className="w-4 h-4" />
              {finalizing ? 'Finalizing...' : 'Approve & Finalize Appraisal'}
            </button>
          </div>
        )}
      </div>

      {showLetter && appraisal && (
        <AppraisalLetterView
          employeeName={appraisal.employee.fullName}
          employeeCode={appraisal.employee.employeeCode}
          designation={appraisal.employee.designation?.name}
          cycleLabel={appraisal.cycleLabel}
          finalScore={appraisal.managerWeightedScore}
          currentCTC={appraisal.currentCTC}
          incrementPercent={appraisal.incrementPercent}
          incrementAmount={appraisal.incrementAmount}
          revisedCTC={appraisal.revisedCTC}
          effectiveDate={appraisal.effectiveDate}
          finalizedAt={appraisal.finalizedAt}
          onClose={() => setShowLetter(false)}
        />
      )}
    </div>
  );
}
