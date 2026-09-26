import { XIcon, DownloadIcon } from './icons';

function formatDate(iso: string | null | undefined) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatMoney(n: number | null | undefined) {
  if (n == null) return '-';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

// The "official Appraisal Letter" from the spec, rendered as a printable
// on-screen letter (Print > Save as PDF) rather than a server-generated
// PDF file -- this sandbox has no network access to install a PDF library,
// so this ships a fully working version today; a real backend-rendered
// PDF is a straightforward follow-up once that dependency can be added.
export default function AppraisalLetterView({
  employeeName,
  employeeCode,
  designation,
  cycleLabel,
  finalScore,
  currentCTC,
  incrementPercent,
  incrementAmount,
  revisedCTC,
  effectiveDate,
  finalizedAt,
  onClose,
}: {
  employeeName: string;
  employeeCode?: string | null;
  designation?: string | null;
  cycleLabel: string;
  finalScore: number | null;
  currentCTC: number | null;
  incrementPercent: number | null;
  incrementAmount: number | null;
  revisedCTC: number | null;
  effectiveDate: string | null;
  finalizedAt?: string | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 print:bg-white print:p-0" onClick={onClose}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #appraisal-letter-printable, #appraisal-letter-printable * { visibility: visible; }
          #appraisal-letter-printable { position: absolute; top: 0; left: 0; width: 100%; box-shadow: none !important; }
        }
      `}</style>
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto print:max-h-none print:shadow-none print:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3 print:hidden">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Appraisal Letter</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-mitra-accentFrom hover:underline"
            >
              <DownloadIcon className="w-4 h-4" /> Print / Save as PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div id="appraisal-letter-printable" className="px-8 py-8">
          <div className="border-2 border-slate-800 dark:border-slate-200 rounded-lg p-8">
            <div className="text-center border-b-2 border-slate-800 dark:border-slate-200 pb-4 mb-6">
              <h1 className="text-xl font-bold tracking-wide text-slate-900 dark:text-white">OFFSHORE MITRA</h1>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Performance Appraisal Letter</p>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-200 mb-4">Date: {formatDate(finalizedAt)}</p>
            <p className="text-sm text-slate-700 dark:text-slate-200 mb-1">Dear {employeeName.split(' ')[0]},</p>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              This letter confirms the outcome of your <strong>{cycleLabel}</strong>
              {employeeCode ? ` (Employee Code: ${employeeCode})` : ''}
              {designation ? `, ${designation}` : ''}.
            </p>

            <table className="w-full text-sm mb-4">
              <tbody>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <td className="py-2 text-slate-500">Overall Weighted Score</td>
                  <td className="py-2 text-right font-semibold text-slate-800 dark:text-slate-100">{finalScore != null ? `${finalScore.toFixed(1)} / 5.0` : '-'}</td>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <td className="py-2 text-slate-500">Current CTC</td>
                  <td className="py-2 text-right font-semibold text-slate-800 dark:text-slate-100">{formatMoney(currentCTC)}</td>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <td className="py-2 text-slate-500">Increment</td>
                  <td className="py-2 text-right font-semibold text-emerald-600">
                    {incrementPercent != null ? `${incrementPercent}%` : ''}
                    {incrementAmount != null ? ` (+${formatMoney(incrementAmount)})` : ''}
                  </td>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <td className="py-2 text-slate-500">Revised CTC</td>
                  <td className="py-2 text-right font-bold text-slate-900 dark:text-white">{formatMoney(revisedCTC)}</td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-500">Effective Date</td>
                  <td className="py-2 text-right font-semibold text-slate-800 dark:text-slate-100">{formatDate(effectiveDate)}</td>
                </tr>
              </tbody>
            </table>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              We appreciate your contributions over this period and look forward to your continued growth with OffshoreMitra.
            </p>

            <p className="text-sm text-slate-700 dark:text-slate-200">Warm regards,</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">Management, Offshore Mitra</p>
          </div>
        </div>
      </div>
    </div>
  );
}
