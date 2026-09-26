import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { getEmployees, getOfficeWallFeed } from '../../lib/api';
import { Employee, OFFICE_WALL_CATEGORIES, OfficeWallPost } from '../../types';
import OfficeWallComposer from '../../components/officewall/OfficeWallComposer';
import OfficeWallPostCard from '../../components/officewall/OfficeWallPostCard';
import OfficeWallPresence from '../../components/officewall/OfficeWallPresence';
import OfficeWallMilestones from '../../components/officewall/OfficeWallMilestones';
import { CATEGORY_LABELS } from '../../components/officewall/officeWallShared';
import { XIcon } from '../../components/icons';

// The internal social feed: a "Create Post" card + reverse-chron feed on
// the left, live presence + auto-generated milestones on the right. Reuses
// the same UserSession-backed presence signal Admin Center's Live User
// Activity uses, and stays a separate feature from Announcements
// (official, targeted) and Recognition (formal points-based kudos) rather
// than merging into either -- see office-wall.service.ts.
export default function OfficeWall() {
  const { token, user, isStaff } = useAuth();
  const myEmployeeId = user?.employeeId || user?.id || null;
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<OfficeWallPost[] | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [category, setCategory] = useState<string>('');
  const [hashtag, setHashtag] = useState<string>('');
  const [error, setError] = useState('');

  const highlightedPostId = searchParams.get('post');

  function loadFeed() {
    if (!token) return;
    getOfficeWallFeed(token, { category: category || undefined, hashtag: hashtag || undefined })
      .then(setPosts)
      .catch((err: any) => setError(err.message || 'Could not load Office Wall'));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadFeed, [token, category, hashtag]);
  useAutoRefresh(loadFeed, 20000);

  useEffect(() => {
    if (!token) return;
    getEmployees(token)
      .then(setEmployees)
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!highlightedPostId || !posts) return;
    const el = document.getElementById(`office-wall-post-${highlightedPostId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightedPostId, posts]);

  const me = employees.find((e) => e.id === myEmployeeId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Office Wall</h1>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setCategory('')}
            className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${
              !category ? 'bg-mitra-accentFrom text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            All
          </button>
          {OFFICE_WALL_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory((prev) => (prev === c ? '' : c))}
              className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${
                category === c ? 'bg-mitra-accentFrom text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {hashtag && (
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 rounded-full px-3 py-1 font-medium">
            #{hashtag}
            <button onClick={() => setHashtag('')}>
              <XIcon className="w-3 h-3" />
            </button>
          </span>
        </div>
      )}

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        <div className="space-y-4 min-w-0">
          {myEmployeeId && (
            <OfficeWallComposer
              token={token!}
              myEmployeeId={myEmployeeId}
              myName={user?.name || me?.fullName || 'Me'}
              myPhotoUrl={me?.photoUrl}
              employees={employees}
              onPosted={(post) => setPosts((prev) => [post, ...(prev || [])])}
            />
          )}

          {posts === null ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : posts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center dark:bg-slate-900 dark:border-slate-800">
              <p className="text-slate-400 text-sm">Nothing posted yet — be the first to share something with OffshoreMitra.</p>
            </div>
          ) : (
            posts.map((post) => (
              <OfficeWallPostCard
                key={post.id}
                token={token!}
                post={post}
                isStaff={isStaff}
                myEmployeeId={myEmployeeId}
                employees={employees}
                highlighted={highlightedPostId === post.id}
                onChanged={loadFeed}
                onHashtagClick={setHashtag}
              />
            ))
          )}
        </div>

        <div className="space-y-4">
          <OfficeWallPresence />
          <OfficeWallMilestones token={token!} employees={employees} />
        </div>
      </div>
    </div>
  );
}
