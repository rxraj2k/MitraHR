import { useState } from 'react';
import {
  addAnnouncementComment,
  deleteAnnouncement,
  getAnnouncementComments,
  likeAnnouncement,
  openAuthedFile,
  unlikeAnnouncement,
  updateAnnouncement,
} from '../lib/api';
import { Announcement, AnnouncementComment, LookupItem } from '../types';
import { isImportantCategory, stickyNoteStyle } from '../lib/stickyNoteColors';
import { FileTextIcon, XIcon } from './icons';

// The full announcement, opened by clicking its sticky note. Keeps every
// bit of behavior the old stacked-card view had (like, comment, staff
// pin/delete) -- only the presentation changed, colored to match the note
// it was opened from so the transition from board to detail feels
// continuous.
export default function AnnouncementDetailModal({
  announcement,
  token,
  isStaff,
  departments,
  onClose,
  onChanged,
}: {
  announcement: Announcement;
  token: string;
  isStaff: boolean;
  departments?: LookupItem[];
  onClose: () => void;
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
  const [pinned, setPinned] = useState(announcement.pinned);
  const [pinBusy, setPinBusy] = useState(false);

  const style = stickyNoteStyle(announcement.color);
  const important = isImportantCategory(announcement.category);

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
      // Best-effort -- most likely a staff account with no linked Employee
      // record, which can't like/comment as anyone. Leave state as-is.
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

  async function togglePin() {
    setPinBusy(true);
    try {
      await updateAnnouncement(token, announcement.id, { pinned: !pinned });
      setPinned((p) => !p);
      onChanged();
    } finally {
      setPinBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this announcement? This cannot be undone.')) return;
    await deleteAnnouncement(token, announcement.id);
    onChanged();
    onClose();
  }

  const audienceLabel =
    announcement.audienceType === 'DEPARTMENTS'
      ? (departments || [])
          .filter((d) => announcement.audienceDepartmentIds.includes(d.id))
          .map((d) => d.name)
          .join(', ') || 'Specific departments'
      : announcement.audienceType === 'INDIVIDUALS'
      ? `${announcement.audienceEmployeeCount} employee${announcement.audienceEmployeeCount === 1 ? '' : 's'}`
      : 'Everyone';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className={`${style.bg} border-b ${style.border} rounded-t-xl px-6 py-4`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {important && (
                <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-rose-600 text-white shadow-sm">
                  Important
                </span>
              )}
              {pinned && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/70 text-slate-700">📌 Pinned</span>
              )}
              {announcement.category && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/70 text-slate-700">{announcement.category}</span>
              )}
              {announcement.isExpired && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/70 text-slate-500">Expired</span>
              )}
            </div>
            <button type="button" onClick={onClose} className="flex-shrink-0">
              <XIcon className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mt-2">{announcement.title}</h3>
          <p className="text-xs text-slate-600 mt-1">
            {announcement.createdByName} · {new Date(announcement.createdAt).toLocaleDateString()} · To: {audienceLabel}
            {announcement.expiresAt && !announcement.isExpired && (
              <> · Expires {new Date(announcement.expiresAt).toLocaleDateString()}</>
            )}
          </p>
        </div>

        <div className="p-6">
          {isStaff && (
            <div className="flex items-center gap-3 mb-4">
              <button
                type="button"
                onClick={togglePin}
                disabled={pinBusy}
                className="text-xs text-slate-500 hover:text-slate-700 disabled:opacity-50"
              >
                {pinned ? 'Unpin' : 'Pin to dashboard'}
              </button>
              <button type="button" onClick={handleDelete} className="text-xs text-rose-500 hover:text-rose-600">
                Delete
              </button>
            </div>
          )}

          <div
            className="text-sm text-slate-700 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: announcement.body }}
          />

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
      </div>
    </div>
  );
}
