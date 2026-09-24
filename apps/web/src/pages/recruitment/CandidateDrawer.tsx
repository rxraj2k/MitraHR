import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getCandidate,
  updateCandidate,
  deleteCandidate,
  openCandidateResume,
  fetchCandidateResumeBlobUrl,
  convertCandidateToEmployee,
} from '../../lib/api';
import { Candidate, CandidateStage, CANDIDATE_FORWARD_STAGES, JobOpeningEmploymentType, JOB_OPENING_EMPLOYMENT_TYPES, LookupItem } from '../../types';
import { STAGE_LABELS } from './Recruitment';
import { StarIcon } from '../../components/icons';

function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function toDatetimeLocal(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const EMPLOYMENT_TYPE_LABELS: Record<JobOpeningEmploymentType, string> = {
  INTERN: 'Intern',
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACTOR: 'Contract',
};

// One free-text notes field + a 1-5 star rating per real interview step
// (screening call, technical round, client round) rather than a generic
// interview log — matches "free and simple but usable" over building out
// full interview-panel/scorecard tracking.
const STAGE_NOTES_FIELD: Partial<Record<CandidateStage, keyof Candidate>> = {
  SCREENING_CALL: 'screeningNotes',
  TECHNICAL_ROUND: 'technicalNotes',
  FINAL_ROUND: 'finalRoundNotes',
};

function StarRatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? 0 : n)}
          className="text-amber-400 hover:scale-110 transition-transform"
          title={`${n} star${n === 1 ? '' : 's'}`}
        >
          <StarIcon filled={n <= value} className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}

function ConvertToEmployeeSection({
  candidate,
  departments,
  onConverted,
}: {
  candidate: Candidate;
  departments: LookupItem[];
  onConverted: () => void;
}) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(candidate.fullName);
  const [email, setEmail] = useState(candidate.email);
  const [phone, setPhone] = useState(candidate.phone || '');
  const [employmentType, setEmploymentType] = useState<JobOpeningEmploymentType>('FULL_TIME');
  const [departmentId, setDepartmentId] = useState(candidate.jobOpening?.departmentId || '');
  const [dateOfJoining, setDateOfJoining] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (candidate.convertedEmployeeId) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
        <p className="text-sm text-emerald-700 font-medium">
          Converted to Employee: {candidate.convertedEmployee?.fullName}
          {candidate.convertedEmployee?.employeeCode ? ` (${candidate.convertedEmployee.employeeCode})` : ''}
        </p>
        <Link to="/employees" className="text-xs text-emerald-600 hover:underline">
          View in Employees →
        </Link>
      </div>
    );
  }

  if (candidate.stage === 'REJECTED') return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-xs font-medium px-3 py-1.5 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
      >
        Offer &amp; Convert to Employee
      </button>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      await convertCandidateToEmployee(token, candidate.id, {
        fullName,
        email,
        phone: phone || undefined,
        employmentType,
        departmentId: departmentId || undefined,
        dateOfJoining: dateOfJoining || undefined,
      });
      onConverted();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 p-3 space-y-2.5 bg-slate-50">
      {error && <div className="text-xs text-red-600">{error}</div>}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] text-slate-500 mb-1">Full Name</label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2.5 py-1 text-xs"
          />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 mb-1">Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2.5 py-1 text-xs"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] text-slate-500 mb-1">Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2.5 py-1 text-xs"
          />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 mb-1">Employment Type</label>
          <select
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value as JobOpeningEmploymentType)}
            className="w-full rounded-lg border border-slate-300 px-2.5 py-1 text-xs"
          >
            {JOB_OPENING_EMPLOYMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {EMPLOYMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] text-slate-500 mb-1">Department</label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2.5 py-1 text-xs"
          >
            <option value="">No department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 mb-1">Date of Joining</label>
          <input
            type="date"
            value={dateOfJoining}
            onChange={(e) => setDateOfJoining(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2.5 py-1 text-xs"
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-500 px-2 py-1">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
        >
          {saving ? 'Converting...' : 'Confirm & Create Employee'}
        </button>
      </div>
    </form>
  );
}

export default function CandidateDrawer({
  candidateId,
  departments,
  onClose,
  onChanged,
}: {
  candidateId: string;
  departments: LookupItem[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const { token } = useAuth();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [notesForm, setNotesForm] = useState({
    screeningNotes: '',
    technicalNotes: '',
    finalRoundNotes: '',
    screeningRating: 0,
    technicalRating: 0,
    finalRoundRating: 0,
    nextInterviewAt: '',
  });
  const [savingNotes, setSavingNotes] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resumePreviewUrl, setResumePreviewUrl] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    const data = await getCandidate(token, candidateId);
    setCandidate(data);
    setNotesForm({
      screeningNotes: data.screeningNotes || '',
      technicalNotes: data.technicalNotes || '',
      finalRoundNotes: data.finalRoundNotes || '',
      screeningRating: data.screeningRating || 0,
      technicalRating: data.technicalRating || 0,
      finalRoundRating: data.finalRoundRating || 0,
      nextInterviewAt: toDatetimeLocal(data.nextInterviewAt),
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId, token]);

  useEffect(() => {
    let objectUrl: string | null = null;
    async function loadPreview() {
      if (!token || !candidate?.resumeUrl) {
        setResumePreviewUrl(null);
        return;
      }
      const isPdf = (candidate.resumeFileName || '').toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        setResumePreviewUrl(null);
        return;
      }
      try {
        const url = await fetchCandidateResumeBlobUrl(token, candidate.id);
        objectUrl = url;
        setResumePreviewUrl(url);
      } catch {
        setResumePreviewUrl(null);
      }
    }
    loadPreview();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate?.id, candidate?.resumeUrl, token]);

  async function refresh() {
    await load();
    onChanged();
  }

  async function saveNotes(e: FormEvent) {
    e.preventDefault();
    if (!token || !candidate) return;
    setSavingNotes(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        screeningNotes: notesForm.screeningNotes,
        technicalNotes: notesForm.technicalNotes,
        finalRoundNotes: notesForm.finalRoundNotes,
      };
      if (notesForm.screeningRating > 0) payload.screeningRating = notesForm.screeningRating;
      if (notesForm.technicalRating > 0) payload.technicalRating = notesForm.technicalRating;
      if (notesForm.finalRoundRating > 0) payload.finalRoundRating = notesForm.finalRoundRating;
      if (notesForm.nextInterviewAt) payload.nextInterviewAt = new Date(notesForm.nextInterviewAt).toISOString();
      await updateCandidate(token, candidate.id, payload);
      await refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingNotes(false);
    }
  }

  async function setStage(stage: CandidateStage) {
    if (!token || !candidate) return;
    setBusy(true);
    setError('');
    try {
      await updateCandidate(token, candidate.id, { stage });
      await refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!token || !candidate) return;
    const reason = prompt(`Reason for rejecting ${candidate.fullName}? (optional)`) ?? undefined;
    setBusy(true);
    setError('');
    try {
      await updateCandidate(token, candidate.id, { stage: 'REJECTED', rejectionReason: reason || undefined });
      await refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!token || !candidate) return;
    if (!confirm(`Delete ${candidate.fullName} from this pipeline? This can't be undone.`)) return;
    await deleteCandidate(token, candidate.id);
    onChanged();
    onClose();
  }

  const currentIndex = candidate ? CANDIDATE_FORWARD_STAGES.indexOf(candidate.stage) : -1;
  const nextStage =
    candidate && candidate.stage !== 'REJECTED' && currentIndex >= 0 && currentIndex < CANDIDATE_FORWARD_STAGES.length - 1
      ? CANDIDATE_FORWARD_STAGES[currentIndex + 1]
      : null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white h-full shadow-xl overflow-y-auto">
        {!candidate ? (
          <div className="p-6 text-sm text-slate-500">Loading...</div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-800">{candidate.fullName}</div>
                  <div className="text-xs text-slate-500">
                    {candidate.email}
                    {candidate.phone ? ` · ${candidate.phone}` : ''}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Applied {formatDate(candidate.appliedAt)} for {candidate.jobOpening?.title || 'an opening'}
                  </div>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">
                  Close ✕
                </button>
              </div>
              {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* Stage stepper */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Pipeline Stage</h3>
                {candidate.stage === 'REJECTED' ? (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
                    Rejected{candidate.rejectionReason ? `: ${candidate.rejectionReason}` : ''}
                  </div>
                ) : (
                  <div className="flex items-center flex-wrap gap-1.5">
                    {CANDIDATE_FORWARD_STAGES.map((s, i) => (
                      <span
                        key={s}
                        className={`text-xs px-2 py-1 rounded-full ${
                          i < currentIndex
                            ? 'bg-emerald-100 text-emerald-700'
                            : i === currentIndex
                            ? 'bg-mitra-accentFrom text-white'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {STAGE_LABELS[s]}
                      </span>
                    ))}
                  </div>
                )}
                {candidate.stage !== 'REJECTED' && candidate.stage !== 'HIRED' && (
                  <div className="flex items-center gap-3 mt-3">
                    {nextStage && (
                      <button
                        onClick={() => setStage(nextStage)}
                        disabled={busy}
                        className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
                      >
                        Advance to {STAGE_LABELS[nextStage]}
                      </button>
                    )}
                    <button onClick={handleReject} disabled={busy} className="text-xs text-red-500 hover:underline">
                      Reject
                    </button>
                  </div>
                )}
                {candidate.stage === 'HIRED' && (
                  <p className="text-xs text-emerald-600 mt-2">Hired on {formatDate(candidate.hiredAt)}.</p>
                )}
              </div>

              {/* Interview notes & ratings */}
              <form onSubmit={saveNotes} className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Interview Scorecards &amp; Notes
                </h3>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs text-slate-500">Screening Call</label>
                    <StarRatingInput
                      value={notesForm.screeningRating}
                      onChange={(v) => setNotesForm({ ...notesForm, screeningRating: v })}
                    />
                  </div>
                  <textarea
                    value={notesForm.screeningNotes}
                    onChange={(e) => setNotesForm({ ...notesForm, screeningNotes: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs text-slate-500">Technical Round</label>
                    <StarRatingInput
                      value={notesForm.technicalRating}
                      onChange={(v) => setNotesForm({ ...notesForm, technicalRating: v })}
                    />
                  </div>
                  <textarea
                    value={notesForm.technicalNotes}
                    onChange={(e) => setNotesForm({ ...notesForm, technicalNotes: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs text-slate-500">Client Round</label>
                    <StarRatingInput
                      value={notesForm.finalRoundRating}
                      onChange={(v) => setNotesForm({ ...notesForm, finalRoundRating: v })}
                    />
                  </div>
                  <textarea
                    value={notesForm.finalRoundNotes}
                    onChange={(e) => setNotesForm({ ...notesForm, finalRoundNotes: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Next Interview / Follow-up</label>
                  <input
                    type="datetime-local"
                    value={notesForm.nextInterviewAt}
                    onChange={(e) => setNotesForm({ ...notesForm, nextInterviewAt: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingNotes}
                  className="rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-medium px-3 py-1.5 disabled:opacity-50"
                >
                  {savingNotes ? 'Saving...' : 'Save Notes & Ratings'}
                </button>
              </form>

              {/* Resume */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Resume</h3>
                {candidate.resumeUrl ? (
                  <div className="space-y-2">
                    <button
                      onClick={() => token && openCandidateResume(token, candidate.id)}
                      className="text-sm text-mitra-accentFrom hover:underline"
                    >
                      {candidate.resumeFileName || 'Download resume'}
                    </button>
                    {resumePreviewUrl ? (
                      <iframe
                        src={resumePreviewUrl}
                        title="Resume preview"
                        className="w-full h-72 rounded-lg border border-slate-200"
                      />
                    ) : (
                      <p className="text-xs text-slate-400">Preview not available for this file type — download to view.</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No resume attached.</p>
                )}
              </div>

              {/* Offer & convert */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Offer</h3>
                <ConvertToEmployeeSection candidate={candidate} departments={departments} onConverted={refresh} />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button onClick={handleDelete} className="text-xs text-red-500 hover:underline">
                  Delete candidate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
