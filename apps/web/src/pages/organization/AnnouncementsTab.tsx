import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addAnnouncementComment,
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncementComments,
  getAnnouncements,
  likeAnnouncement,
  openAuthedFile,
  unlikeAnnouncement,
  updateAnnouncement,
} from '../../lib/api';
import { FileTextIcon, XIcon } from '../../components/icons';
import { Announcement, AnnouncementAudienceType, AnnouncementComment, Employee, LookupItem } from '../../types';

// Full Zoho-style Announcements: rich-text body (a lightweight
// contentEditable editor — no new dependency), an optional attachment,
// pin-to-top, an expiry date, audience targeting (everyone / specific
// departments / specific employees), likes, and comments. Staff can post,
// pin, and delete; any signed-in employee (or a staff account linked to
// its own Employee record) can like and comment.
export default function AnnouncementsTab({
  token,
  isStaff,
  departments,
  employees,
}: {
  token: string;
  isStaff: boolean;
  departments: LookupItem[];
  employees: Employee[];
}) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [includeExpired, setIncludeExpired] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getAnnouncements(token, includeExpired)
      .then(setAnnouncements)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, includeExpired]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Announcements</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {isStaff ? 'Post an update for the whole company or a specific audience.' : 'Updates from the company that are relevant to you.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isStaff && (
            <label className="flex items-center gap-1.5 text-xs text-slate-500">
              <input type="checkbox" checked={includeExpired} onChange={(e) => setIncludeExpired(e.target.checked)} />
              Show expired
            </label>
          )}
          {isStaff && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-lg bg-mitra-accentFrom px-3 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              + New Announcement
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-rose-600 mb-4">{error}</p>}
      {loading ? (
        <p className="text-sm text-slate-400">Loading announcements…</p>
      ) : announcements.length === 0 ? (
        <p className="text-sm text-slate-400">
          {isStaff ? 'No announcements yet — post the first one.' : 'No announcements right now.'}
        </p>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <AnnouncementCard key={a.id} announcement={a} token={token} isStaff={isStaff} departments={departments} onChanged={load} />
          ))}
        </div>
      )}

      {showForm && (
        <NewAnnouncementModal
          token={token}
          departments={departments}
          employees={employees}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function AnnouncementCard({
  announcement,
  token,
  isStaff,
  departments,
  onChanged,
}: {
  announcement: Announcement;
  token: string;
  isStaff: boolean;
  departments: LookupItem[];
  onChanged: () => void;
}) {
  const [liked, setLiked] = useState(announcement.likedByMe);
  const [likeCount, setLikeCount] = useState(announcement.likeCount);
  const [likeBusy, setLikeBusy] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [comments, setComments] = useState<AnnouncementComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentError, setCommentError] = useState('');

  async function toggleLike() {
    setLikeBusy(true);
    try {
      if (liked) {
        await unlikeAnnouncement(token, announcement.id);
        setLiked(false);
        setLikeCount((c) => Math.max(0, c - 1));
      } else {
        await likeAnnouncement(token, announcement.id);
        setLiked(true);
        setLikeCount((c) => c + 1);
      }
    } catch {
      // Best-effort — most likely cause is a staff account with no linked
      // Employee record, which can't like/comment as anyone. Leave state as-is.
    } finally {
      setLikeBusy(false);
    }
  }

  async function toggleComments() {
    setCommentsOpen((o) => !o);
    if (!commentsLoaded) {
      try {
        setComments(await getAnnouncementComments(token, announcement.id));
      } finally {
        setCommentsLoaded(true);
      }
    }
  }

  async function submitComment() {
    if (!newComment.trim()) return;
    setCommentError('');
    try {
      const created = await addAnnouncementComment(token, announcement.id, newComment.trim());
      setComments((c) => [...c, created]);
      setNewComment('');
    } catch (err: any) {
      setCommentError(err.message || 'Failed to post comment');
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this announcement? This cannot be undone.')) return;
    await deleteAnnouncement(token, announcement.id);
    onChanged();
  }

  async function togglePin() {
    await updateAnnouncement(token, announcement.id, { pinned: !announcement.pinned });
    onChanged();
  }

  const audienceLabel =
    announcement.audienceType === 'DEPARTMENTS'
      ? departments
          .filter((d) => announcement.audienceDepartmentIds.includes(d.id))
          .map((d) => d.name)
          .join(', ') || 'Specific departments'
      : announcement.audienceType === 'INDIVIDUALS'
      ? `${announcement.audienceEmployeeCount} employee${announcement.audienceEmployeeCount === 1 ? '' : 's'}`
      : 'Everyone';

  return (
    <div
      className={`bg-white border rounded-xl p-5 ${
        announcement.pinned ? 'border-mitra-accentFrom/40' : 'border-slate-200'
      } ${announcement.isExpired ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {announcement.pinned && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-mitra-accentFrom/10 text-mitra-accentFrom border border-mitra-accentFrom/30">
              Pinned
            </span>
          )}
          {announcement.category && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{announcement.category}</span>
          )}
          {announcement.isExpired && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">Expired</span>
          )}
          <h3 className="text-sm font-semibold text-slate-800">{announcement.title}</h3>
        </div>
        {isStaff && (
          <div className="flex items-center gap-3 flex-shrink-0">
            <button type="button" onClick={togglePin} className="text-xs text-slate-400 hover:text-slate-600">
              {announcement.pinned ? 'Unpin' : 'Pin'}
            </button>
            <button type="button" onClick={handleDelete} className="text-xs text-rose-400 hover:text-rose-600">
              Delete
            </button>
          </div>
        )}
      </div>
      <p className="text-xs text-slate-400 mb-3">
        {announcement.createdByName} · {new Date(announcement.createdAt).toLocaleDateString()} · To: {audienceLabel}
        {announcement.expiresAt && !announcement.isExpired && <> · Expires {new Date(announcement.expiresAt).toLocaleDateString()}</>}
      </p>
      <div className="text-sm text-slate-700 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: announcement.body }} />
      {announcement.attachmentUrl && (
        <button
          type="button"
          onClick={() => openAuthedFile(token, `/announcements/${announcement.id}/file`)}
          className="mt-3 text-xs text-mitra-accentFrom hover:underline flex items-center gap-1"
        >
          <FileTextIcon className="w-3.5 h-3.5" /> {announcement.attachmentName || 'View attachment'}
        </button>
      )}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={toggleLike}
          disabled={likeBusy}
          className={`text-xs flex items-center gap-1 ${liked ? 'text-mitra-accentFrom font-medium' : 'text-slate-500 hover:text-slate-700'}`}
        >
          👍 {likeCount > 0 ? likeCount : ''} Like{likeCount === 1 ? '' : 's'}
        </button>
        {!announcement.commentsDisabled && (
          <button type="button" onClick={toggleComments} className="text-xs text-slate-500 hover:text-slate-700">
            💬 {announcement.commentCount > 0 ? announcement.commentCount : ''} Comment{announcement.commentCount === 1 ? '' : 's'}
          </button>
        )}
      </div>
      {commentsOpen && !announcement.commentsDisabled && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="text-xs">
              <span className="font-medium text-slate-700">{c.employee.fullName}</span>{' '}
              <span className="text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</span>
              <p className="text-slate-600 mt-0.5">{c.body}</p>
            </div>
          ))}
          {commentError && <p className="text-xs text-rose-600">{commentError}</p>}
          <div className="flex gap-2 mt-2">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitComment()}
              placeholder="Write a comment…"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
            />
            <button type="button" onClick={submitComment} className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200">
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const CATEGORIES = ['General', 'Policy', 'Event', 'Urgent'];

function NewAnnouncementModal({
  token,
  departments,
  employees,
  onClose,
  onCreated,
}: {
  token: string;
  departments: LookupItem[];
  employees: Employee[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);
  const [category, setCategory] = useState('');
  const [pinned, setPinned] = useState(false);
  const [commentsDisabled, setCommentsDisabled] = useState(false);
  const [audienceType, setAudienceType] = useState<AnnouncementAudienceType>('ALL');
  const [audienceDepartmentIds, setAudienceDepartmentIds] = useState<string[]>([]);
  const [audienceEmployeeIds, setAudienceEmployeeIds] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function exec(command: string) {
    document.execCommand(command);
    bodyRef.current?.focus();
  }

  async function handleSubmit() {
    const body = bodyRef.current?.innerHTML.trim() || '';
    if (!title.trim()) return setError('Title is required');
    if (!body || body === '<br>') return setError('Message is required');
    if (audienceType === 'DEPARTMENTS' && audienceDepartmentIds.length === 0) {
      return setError('Select at least one department');
    }
    if (audienceType === 'INDIVIDUALS' && audienceEmployeeIds.length === 0) {
      return setError('Select at least one employee');
    }
    setSubmitting(true);
    setError('');
    try {
      await createAnnouncement(token, {
        title: title.trim(),
        body,
        category: category || undefined,
        pinned,
        commentsDisabled,
        audienceType,
        audienceDepartmentIds,
        audienceEmployeeIds,
        expiresAt: expiresAt || undefined,
        file: file || undefined,
      });
      onCreated();
    } catch (err: any) {
      setError(err.message || 'Failed to post announcement');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">New Announcement</h3>
          <button type="button" onClick={onClose}>
            <XIcon className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        {error && <p className="text-sm text-rose-600 mb-3">{error}</p>}
        <div className="space-y-3">
          <input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <div>
            <div className="flex items-center gap-1 mb-1">
              <button type="button" onClick={() => exec('bold')} className="w-7 h-7 text-xs font-bold border border-slate-200 rounded hover:bg-slate-50">
                B
              </button>
              <button type="button" onClick={() => exec('italic')} className="w-7 h-7 text-xs italic border border-slate-200 rounded hover:bg-slate-50">
                I
              </button>
              <button
                type="button"
                onClick={() => exec('insertUnorderedList')}
                className="px-2 h-7 text-xs border border-slate-200 rounded hover:bg-slate-50"
              >
                • List
              </button>
            </div>
            <div
              ref={bodyRef}
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Write your message…"
              className="w-full min-h-[120px] rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mitra-accentFrom/30 empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400"
            />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white">
            <option value="">No category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Audience</label>
            <select
              value={audienceType}
              onChange={(e) => setAudienceType(e.target.value as AnnouncementAudienceType)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
            >
              <option value="ALL">Everyone</option>
              <option value="DEPARTMENTS">Specific departments</option>
              <option value="INDIVIDUALS">Specific employees</option>
            </select>
          </div>
          {audienceType === 'DEPARTMENTS' && (
            <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
              {departments.map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={audienceDepartmentIds.includes(d.id)}
                    onChange={(e) =>
                      setAudienceDepartmentIds((prev) => (e.target.checked ? [...prev, d.id] : prev.filter((id) => id !== d.id)))
                    }
                  />
                  {d.name}
                </label>
              ))}
            </div>
          )}
          {audienceType === 'INDIVIDUALS' && (
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
              {employees.map((emp) => (
                <label key={emp.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={audienceEmployeeIds.includes(emp.id)}
                    onChange={(e) =>
                      setAudienceEmployeeIds((prev) => (e.target.checked ? [...prev, emp.id] : prev.filter((id) => id !== emp.id)))
                    }
                  />
                  {emp.fullName}
                </label>
              ))}
            </div>
          )}
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-1.5 text-sm text-slate-600">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Pin to top
            </label>
            <label className="flex items-center gap-1.5 text-sm text-slate-600">
              <input type="checkbox" checked={commentsDisabled} onChange={(e) => setCommentsDisabled(e.target.checked)} /> Disable comments
            </label>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Expires on (optional)</label>
            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Attachment (optional)</label>
            <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 text-sm rounded-lg bg-mitra-accentFrom text-white hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Posting…' : 'Post Announcement'}
          </button>
        </div>
      </div>
    </div>
  );
}
