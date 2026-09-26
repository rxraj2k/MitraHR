import { useState } from 'react';
import {
  addOfficeWallComment,
  addOfficeWallReaction,
  deleteOfficeWallComment,
  deleteOfficeWallPost,
  getOfficeWallComments,
  removeOfficeWallReaction,
  shareOfficeWallPost,
} from '../../lib/api';
import { Employee, OfficeWallComment, OfficeWallPost, OFFICE_WALL_REACTION_TYPES, OfficeWallReactionType } from '../../types';
import { Avatar } from '../Avatar';
import { API_BASE } from '../../lib/api';
import { MessageCircleIcon, ShareIcon, XIcon } from '../icons';
import SearchableSelect from '../SearchableSelect';
import { CATEGORY_BADGE, CATEGORY_LABELS, REACTION_EMOJI, REACTION_LABELS, segmentBody, timeAgo } from './officeWallShared';

interface Props {
  token: string;
  post: OfficeWallPost;
  isStaff: boolean;
  myEmployeeId: string | null;
  employees: Employee[];
  highlighted?: boolean;
  onChanged: () => void;
  onHashtagClick?: (tag: string) => void;
}

// One feed card: author header (with a live online dot), the post body
// with #hashtags and @mentions highlighted, a photo grid, the reaction
// bar, an inline comment thread, and Share. Reactions are applied
// optimistically (same precedent as the Recognition feed's RecognitionCard)
// and rolled back on failure.
export default function OfficeWallPostCard({ token, post, isStaff, myEmployeeId, employees, highlighted, onChanged, onHashtagClick }: Props) {
  const [reactions, setReactions] = useState(post.reactions);
  const [myReactions, setMyReactions] = useState(post.myReactions);
  const [reactionBusy, setReactionBusy] = useState<string | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [comments, setComments] = useState<OfficeWallComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState('');
  const [shareBusy, setShareBusy] = useState(false);
  const [shareMessage, setShareMessage] = useState('');

  async function toggleReaction(type: OfficeWallReactionType) {
    if (reactionBusy) return;
    const active = myReactions.includes(type);
    setReactionBusy(type);
    setMyReactions((prev) => (active ? prev.filter((t) => t !== type) : [...prev, type]));
    setReactions((prev) => prev.map((r) => (r.type === type ? { ...r, count: Math.max(0, r.count + (active ? -1 : 1)) } : r)));
    try {
      if (active) await removeOfficeWallReaction(token, post.id, type);
      else await addOfficeWallReaction(token, post.id, type);
    } catch {
      setMyReactions((prev) => (active ? [...prev, type] : prev.filter((t) => t !== type)));
      setReactions((prev) => prev.map((r) => (r.type === type ? { ...r, count: Math.max(0, r.count + (active ? 1 : -1)) } : r)));
    } finally {
      setReactionBusy(null);
    }
  }

  async function toggleComments() {
    setCommentsOpen((o) => !o);
    if (!commentsLoaded) {
      try {
        setComments(await getOfficeWallComments(token, post.id));
      } finally {
        setCommentsLoaded(true);
      }
    }
  }

  async function submitComment() {
    if (!newComment.trim()) return;
    const created = await addOfficeWallComment(token, post.id, newComment.trim());
    setComments((c) => [...c, created]);
    setNewComment('');
  }

  async function handleDeleteComment(id: string) {
    await deleteOfficeWallComment(token, id);
    setComments((c) => c.filter((x) => x.id !== id));
  }

  async function handleDelete() {
    if (!window.confirm('Delete this post?')) return;
    await deleteOfficeWallPost(token, post.id);
    onChanged();
  }

  async function handleShare() {
    if (!shareTarget) return;
    setShareBusy(true);
    setShareMessage('');
    try {
      await shareOfficeWallPost(token, post.id, shareTarget);
      setShareMessage('Shared — they’ll get a notification with a link straight to this post.');
      setShareTarget('');
    } catch (err: any) {
      setShareMessage(err.message || 'Could not share this post');
    } finally {
      setShareBusy(false);
    }
  }

  async function copyLink() {
    const url = `${window.location.origin}/office-wall?post=${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareMessage('Link copied to your clipboard.');
    } catch {
      setShareMessage(url);
    }
  }

  const employeeOptions = employees.filter((e) => e.id !== myEmployeeId).map((e) => ({ id: e.id, name: e.fullName }));
  const segments = segmentBody(post.body, post.mentions);

  return (
    <div
      id={`office-wall-post-${post.id}`}
      className={`bg-white border rounded-2xl p-5 transition-shadow dark:bg-slate-900 ${
        highlighted ? 'border-mitra-accentFrom shadow-[0_0_0_3px_rgba(124,111,255,0.25)]' : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <Avatar name={post.author.fullName} photoUrl={post.author.photoUrl} />
            {post.author.online && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {post.author.fullName}
              {post.taggedEmployee && (
                <span className="font-normal text-slate-400"> → {post.taggedEmployee.fullName}</span>
              )}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {post.author.designation?.name || post.author.department?.name || ''} · {timeAgo(post.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${CATEGORY_BADGE[post.category] || CATEGORY_BADGE.GENERAL}`}>
            {CATEGORY_LABELS[post.category] || post.category}
          </span>
          {(isStaff || post.canDelete) && (
            <button onClick={handleDelete} className="text-slate-300 hover:text-red-500 text-xs">
              ✕
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-slate-700 dark:text-slate-200 mt-3 whitespace-pre-wrap break-words">
        {segments.map((s) =>
          s.kind === 'text' ? (
            <span key={s.key}>{s.text}</span>
          ) : s.kind === 'hashtag' ? (
            <button
              key={s.key}
              type="button"
              onClick={() => onHashtagClick?.(s.text.slice(1))}
              className="text-mitra-accentFrom font-medium hover:underline"
            >
              {s.text}
            </button>
          ) : (
            <span key={s.key} className="text-indigo-600 dark:text-indigo-400 font-medium">
              {s.text}
            </span>
          ),
        )}
      </p>

      {post.media.length > 0 && (
        <div className={`mt-3 grid gap-1.5 ${post.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {post.media.map((m) => (
            <a key={m.id} href={`${API_BASE}${m.url}`} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden bg-slate-100">
              <img src={`${API_BASE}${m.url}`} alt="" className="w-full h-48 object-cover" />
            </a>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex-wrap">
        {OFFICE_WALL_REACTION_TYPES.map((type) => {
          const count = reactions.find((r) => r.type === type)?.count || 0;
          const active = myReactions.includes(type);
          return (
            <button
              key={type}
              onClick={() => toggleReaction(type)}
              disabled={!myEmployeeId || reactionBusy === type}
              title={REACTION_LABELS[type]}
              className={`text-xs flex items-center gap-1 px-2.5 py-1 rounded-full border transition-colors disabled:opacity-50 ${
                active ? 'bg-rose-50 border-rose-200 text-rose-600 font-medium dark:bg-rose-950/40 dark:border-rose-900' : 'border-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <span>{REACTION_EMOJI[type]}</span> {count > 0 ? count : ''}
            </button>
          );
        })}
        <button
          onClick={toggleComments}
          className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 px-2.5 py-1 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <MessageCircleIcon className="w-3.5 h-3.5" /> {post.commentCount > 0 ? post.commentCount : ''} Comment{post.commentCount === 1 ? '' : 's'}
        </button>
        <button
          onClick={() => setShareOpen((v) => !v)}
          className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 px-2.5 py-1 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 ml-auto"
        >
          <ShareIcon className="w-3.5 h-3.5" /> Share
        </button>
      </div>

      {shareOpen && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SearchableSelect options={employeeOptions} value={shareTarget} onChange={setShareTarget} placeholder="Notify a colleague…" />
            </div>
            <button
              onClick={handleShare}
              disabled={!shareTarget || shareBusy}
              className="text-xs px-3 py-1.5 rounded-lg bg-mitra-accentFrom text-white disabled:opacity-50"
            >
              {shareBusy ? 'Sharing...' : 'Send'}
            </button>
            <button onClick={copyLink} className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300">
              Copy Link
            </button>
          </div>
          {shareMessage && <p className="text-[11px] text-slate-500">{shareMessage}</p>}
        </div>
      )}

      {commentsOpen && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2 text-xs group">
              <Avatar name={c.employee.fullName} photoUrl={c.employee.photoUrl} size="sm" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-slate-700 dark:text-slate-200">{c.employee.fullName}</span>{' '}
                <span className="text-slate-400">{timeAgo(c.createdAt)}</span>
                <p className="text-slate-600 dark:text-slate-300 mt-0.5 break-words">{c.body}</p>
              </div>
              {(isStaff || c.employee.id === myEmployeeId) && (
                <button
                  onClick={() => handleDeleteComment(c.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 flex-shrink-0"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          {myEmployeeId && (
            <div className="flex gap-2 mt-2">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitComment()}
                placeholder="Write a comment…"
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-1.5 text-xs"
              />
              <button onClick={submitComment} className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300">
                Post
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
