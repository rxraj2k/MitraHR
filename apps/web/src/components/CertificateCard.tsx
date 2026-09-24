import { Avatar } from './Avatar';
import { AwardIcon } from './icons';

// Decorative "certificate" card — same gradient-border treatment as the
// result email (QuizzesService.buildCertificateHtml on the backend) so the
// in-app result screen and "My Assessment Results" history read as the
// same document. Used right after an assessment submission and in results
// listings. subjectTitle/subjectLabel cover both a course-scoped and the
// track-wide Mandatory Training assessment.
export default function CertificateCard({
  employeeName,
  employeeCode,
  photoUrl,
  departmentName,
  designationName,
  subjectTitle,
  subjectLabel = 'Course',
  totalQuestions,
  correctCount,
  incorrectCount,
  percent,
  passed,
  passPercent,
  date,
}: {
  employeeName: string;
  employeeCode?: string | null;
  photoUrl?: string | null;
  departmentName?: string | null;
  designationName?: string | null;
  subjectTitle: string;
  subjectLabel?: string;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  percent: number;
  passed: boolean;
  passPercent?: number;
  date: string;
}) {
  return (
    <div className="rounded-2xl p-[3px] bg-gradient-to-br from-mitra-accentFrom to-mitra-accentTo shadow-[0_16px_36px_-12px_rgba(124,111,255,0.45)]">
      <div className="rounded-[14px] bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600">
            <AwardIcon className="w-4 h-4" />
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-mitra-accentFrom font-bold">MitraHR &middot; Certificate</p>
            <h3 className="text-base font-semibold text-slate-800 -mt-0.5">Assessment Result</h3>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <Avatar name={employeeName} photoUrl={photoUrl} size="md" />
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {employeeName}
              {employeeCode ? <span className="text-slate-400 font-normal"> ({employeeCode})</span> : null}
            </p>
            <p className="text-xs text-slate-500">{[designationName, departmentName].filter(Boolean).join(' · ') || '—'}</p>
          </div>
        </div>

        <p className="text-sm text-slate-700 mb-4">
          <span className="text-slate-400">{subjectLabel}: </span>
          <span className="font-medium">{subjectTitle}</span>
        </p>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-xl bg-slate-50 p-3 text-center">
            <div className="text-xl font-bold text-slate-800">{totalQuestions}</div>
            <div className="text-[10px] uppercase text-slate-400 font-semibold">Attempted</div>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 text-center">
            <div className="text-xl font-bold text-emerald-600">{correctCount}</div>
            <div className="text-[10px] uppercase text-slate-400 font-semibold">Correct</div>
          </div>
          <div className="rounded-xl bg-rose-50 p-3 text-center">
            <div className="text-xl font-bold text-rose-600">{incorrectCount}</div>
            <div className="text-[10px] uppercase text-slate-400 font-semibold">Incorrect</div>
          </div>
        </div>

        <div className="text-center">
          <span
            className={`inline-block rounded-full px-6 py-2 text-lg font-bold ${
              passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}
          >
            {percent}% &mdash; {passed ? 'PASSED' : 'NOT PASSED'}
          </span>
          {typeof passPercent === 'number' && <p className="text-[11px] text-slate-400 mt-1.5">Pass mark: {passPercent}%</p>}
          <p className="text-[11px] text-slate-400 mt-1">{new Date(date).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
