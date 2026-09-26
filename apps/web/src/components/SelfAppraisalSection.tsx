import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyAppraisals } from '../lib/api';
import { MyAppraisal } from '../types';
import AppraisalForm from './AppraisalForm';
import AppraisalLetterView from './AppraisalLetterView';
import { AwardIcon, ClockIcon, CheckCircleIcon } from './icons';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatMoney(n: number) {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

// My Space > Performance & Goals' semi-annual appraisal surface: the
// "6-Month Performance Self-Appraisal Due" banner + card the spec asks
// for, plus a compact history of past cycles (submitted/under review/
// completed with their final score & increment) so an employee doesn't
// lose track of a cycle once it scrolls off the due-now banner.
export default function SelfAppraisalSection() {
  const { token, user } = useAuth();
  const [appraisals, setAppraisals] = useState<MyAppraisal[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFormId, setOpenFormId] = useState<string | null>(null);
  const [letterAppraisal, setLetterAppraisal] = useState<MyAppraisal | null>(null);

  function load() {
    if (!token) return;
    getMyAppraisals(token)
      .then(setAppraisals)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token]);

  if (loading || appraisals.length === 0) return null;

  const pending = appraisals.find((a) => a.status === 'PENDING_EMPLOYEE');
  const inReview = appraisals.filter((a) => a.status === 'UNDER_MANAGER_REVIEW');
  const completed = appraisals.filter((a) => a.status === 'COMPLETED');

  return (
    <>
      {pending && (
        <div className="rounded-2xl p-5 text-white bg-gradient-to-br from-mitra-accentFrom to-mitra-accentTo shadow-[0_10px_30px_-8px_rgba(124,111,255,0.5)] flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="flex-shrink-0 w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
              <AwardIcon className="w-6 h-6" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">Action Required</p>
              <h3 className="font-semibold">{pending.cycleLabel} Self-Appraisal Due</h3>
              <p className="text-xs opacity-90 mt-0.5">Complete it by {formatDate(pending.dueDate)}.</p>
            </div>
          </div>
          <button
            onClick={() => setOpenFormId(pending.id)}
            className="flex-shrink-0 bg-white text-mitra-accentFrom font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm hover:-translate-y-0.5 transition-transform"
          >
            Start Self-Appraisal
          </button>
        </div>
      )}

      {(inReview.length > 0 || completed.length > 0) && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 dark:bg-slate-900 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">My Appraisal History</h2>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {[...inReview, ...completed].map((a) => (
              <li key={a.id} className="flex items-center justify-between py-3 gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  {a.status === 'COMPLETED' ? (
                    <CheckCircleIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <ClockIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{a.cycleLabel}</p>
                    <p className="text-xs text-slate-400">
                      {a.status === 'COMPLETED' ? `Finalized` : 'Submitted — under manager review'}
                    </p>
                  </div>
                </div>
                {a.status === 'COMPLETED' ? (
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-xs text-slate-400">Final Score</p>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{a.managerWeightedScore?.toFixed(1)} / 5.0</p>
                    </div>
                    {a.revisedCTC != null && (
                      <div>
                        <p className="text-xs text-slate-400">Revised CTC</p>
                        <p className="text-sm font-semibold text-emerald-600">₹{formatMoney(a.revisedCTC)}</p>
                      </div>
                    )}
                    <button
                      onClick={() => setLetterAppraisal(a)}
                      className="text-xs font-medium text-mitra-accentFrom hover:underline flex-shrink-0"
                    >
                      View Letter
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 rounded-full px-2.5 py-1">
                    Self-score {a.selfWeightedScore?.toFixed(1) ?? '-'} / 5.0
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {openFormId && (
        <AppraisalForm
          appraisalId={openFormId}
          onClose={() => setOpenFormId(null)}
          onSubmitted={load}
        />
      )}

      {letterAppraisal && (
        <AppraisalLetterView
          employeeName={user?.name || 'Employee'}
          cycleLabel={letterAppraisal.cycleLabel}
          finalScore={letterAppraisal.managerWeightedScore}
          currentCTC={letterAppraisal.currentCTC}
          incrementPercent={letterAppraisal.incrementPercent}
          incrementAmount={letterAppraisal.incrementAmount}
          revisedCTC={letterAppraisal.revisedCTC}
          effectiveDate={letterAppraisal.effectiveDate}
          finalizedAt={letterAppraisal.finalizedAt}
          onClose={() => setLetterAppraisal(null)}
        />
      )}
    </>
  );
}
