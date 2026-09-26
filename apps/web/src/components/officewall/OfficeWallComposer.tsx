import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { addOfficeWallMedia, createOfficeWallPost } from '../../lib/api';
import { Employee, OFFICE_WALL_CATEGORIES, OfficeWallPost } from '../../types';
import { Avatar } from '../Avatar';
import { CameraIcon, XIcon } from '../icons';
import SearchableSelect from '../SearchableSelect';
import { CATEGORY_LABELS } from './officeWallShared';

interface Props {
  token: string;
  myEmployeeId: string;
  myName: string;
  myPhotoUrl?: string | null;
  employees: Employee[];
  onPosted: (post: OfficeWallPost) => void;
}

const MAX_PHOTOS = 4;

// The "Create Post" card: a plain textarea (not a full rich-text editor --
// this app's other rich content, Announcements, uses a raw contentEditable
// div; a textarea keeps mentions/hashtags simple and avoids any HTML
// sanitization concerns) with a lightweight @mention autocomplete, up to 4
// photos, a category picker, and an optional "tag colleague" field for a
// Shoutout/Kudos post.
export default function OfficeWallComposer({ token, myEmployeeId, myName, myPhotoUrl, employees, onPosted }: Props) {
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<string>('GENERAL');
  const [taggedEmployeeId, setTaggedEmployeeId] = useState('');
  const [mentioned, setMentioned] = useState<{ id: string; fullName: string }[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previews = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos]);
  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [previews]);

  const otherEmployees = employees.filter((e) => e.id !== myEmployeeId);
  const mentionMatches =
    mentionQuery === null ? [] : otherEmployees.filter((e) => e.fullName.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6);

  function handleBodyChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setBody(value);
    const cursor = e.target.selectionStart ?? value.length;
    const uptoCursor = value.slice(0, cursor);
    const match = /(?:^|\s)@(\w*)$/.exec(uptoCursor);
    setMentionQuery(match ? match[1] : null);
  }

  function pickMention(employee: Employee) {
    const value = body;
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const uptoCursor = value.slice(0, cursor);
    const match = /(?:^|\s)@(\w*)$/.exec(uptoCursor);
    if (!match) return;
    const start = match.index + (match[0].startsWith(' ') ? 1 : 0);
    const before = value.slice(0, start);
    const after = value.slice(cursor);
    const insertion = `@${employee.fullName} `;
    const next = `${before}${insertion}${after}`;
    setBody(next);
    setMentioned((prev) => (prev.some((m) => m.id === employee.id) ? prev : [...prev, { id: employee.id, fullName: employee.fullName }]));
    setMentionQuery(null);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      const pos = before.length + insertion.length;
      textareaRef.current?.setSelectionRange(pos, pos);
    });
  }

  function handlePhotoSelect(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).slice(0, MAX_PHOTOS - photos.length);
    setPhotos((p) => [...p, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit() {
    if (!body.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      // Only keep mentions whose "@Full Name" text is still actually
      // present -- if the text was edited after picking a suggestion, a
      // stale id shouldn't quietly tag someone no longer named in the post.
      const mentionedEmployeeIds = mentioned.filter((m) => body.includes(`@${m.fullName}`)).map((m) => m.id);
      const post = await createOfficeWallPost(token, {
        body: body.trim(),
        category,
        taggedEmployeeId: taggedEmployeeId || undefined,
        mentionedEmployeeIds,
      });
      let finalPost = post;
      for (const file of photos) {
        const media = await addOfficeWallMedia(token, post.id, file);
        finalPost = { ...finalPost, media };
      }
      onPosted(finalPost);
      setBody('');
      setCategory('GENERAL');
      setTaggedEmployeeId('');
      setMentioned([]);
      setPhotos([]);
    } catch (err: any) {
      setError(err.message || 'Could not publish your post');
    } finally {
      setSubmitting(false);
    }
  }

  const employeeOptions = otherEmployees.map((e) => ({ id: e.id, name: e.fullName }));

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 dark:bg-slate-900 dark:border-slate-800">
      <div className="flex items-start gap-3">
        <Avatar name={myName} photoUrl={myPhotoUrl} />
        <div className="flex-1 min-w-0 relative">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={handleBodyChange}
            rows={3}
            placeholder="Share an update, shoutout, or project win with OffshoreMitra... use # for topics and @ to tag a colleague"
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mitra-accentFrom/30 resize-none"
          />
          {mentionMatches.length > 0 && (
            <div className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
              {mentionMatches.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => pickMention(e)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <Avatar name={e.fullName} photoUrl={e.photoUrl} size="sm" />
                  <span className="text-slate-700 dark:text-slate-200">{e.fullName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3 ml-[52px]">
          {previews.map((url, i) => (
            <div key={url} className="relative">
              <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-700 text-white flex items-center justify-center"
              >
                <XIcon className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-2 ml-[52px]">{error}</p>}

      <div className="flex flex-wrap items-center gap-2 mt-3 ml-[52px]">
        <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handlePhotoSelect} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={photos.length >= MAX_PHOTOS}
          className="text-xs flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
        >
          <CameraIcon className="w-3.5 h-3.5" /> Add Photo
        </button>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 px-2.5 py-1.5 text-slate-600 dark:text-slate-300"
        >
          {OFFICE_WALL_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <div className="w-44">
          <SearchableSelect options={employeeOptions} value={taggedEmployeeId} onChange={setTaggedEmployeeId} placeholder="🏷️ Tag colleague…" />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!body.trim() || submitting}
          className="ml-auto rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-50 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 transition-all duration-150"
        >
          {submitting ? 'Publishing...' : 'Publish Post'}
        </button>
      </div>
    </div>
  );
}
