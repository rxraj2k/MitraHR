import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { globalSearch, SearchResultGroup, SearchResultItem } from '../lib/api';
import { Avatar } from './Avatar';
import { SearchIcon, XIcon } from './icons';

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;

// Flattened view of the grouped results, purely for keyboard up/down/enter
// navigation -- the dropdown itself still renders grouped by category.
function flatten(groups: SearchResultGroup[]): SearchResultItem[] {
  return groups.flatMap((g) => g.results);
}

export default function GlobalSearch() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<SearchResultGroup[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (!token || q.length < MIN_QUERY_LENGTH) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const result = await globalSearch(token, q);
        if (requestId.current === id) setGroups(result);
      } catch {
        // best-effort -- a failed search shouldn't disrupt the page
        if (requestId.current === id) setGroups([]);
      } finally {
        if (requestId.current === id) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, token]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [groups]);

  function closeAndReset() {
    setOpen(false);
    setQuery('');
    setGroups([]);
    setActiveIndex(-1);
  }

  function goTo(item: SearchResultItem) {
    closeAndReset();
    navigate(item.link);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const flat = flatten(groups);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flat.length) setActiveIndex((i) => (i + 1) % flat.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flat.length) setActiveIndex((i) => (i <= 0 ? flat.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && flat[activeIndex]) goTo(flat[activeIndex]);
    } else if (e.key === 'Escape') {
      closeAndReset();
      inputRef.current?.blur();
    }
  }

  const flat = flatten(groups);
  const showDropdown = open && query.trim().length >= MIN_QUERY_LENGTH;
  let runningIndex = -1;

  const rootRef = useRef<HTMLDivElement>(null);
  // Outside-click closing via a document listener + ref (not a `fixed
  // inset-0` invisible catcher div) -- a catcher div's `position: fixed`
  // sizes itself against the nearest ancestor with a transform or
  // backdrop-filter (one of the chrome themes puts a real blur on the
  // header this search box lives in), which would shrink it down to the
  // header's own box instead of the full page.
  useEffect(() => {
    if (!showDropdown) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [showDropdown]);

  return (
    <div className="relative w-56 lg:w-72" ref={rootRef}>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search employees, clients, projects..."
          className="w-full rounded-full border border-indigo-100 bg-indigo-50/80 py-2 pl-9 pr-8 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-mitra-accentFrom/40 focus:border-mitra-accentFrom focus:bg-white dark:border-slate-600 dark:bg-slate-700/70 dark:text-slate-200 dark:placeholder:text-slate-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            aria-label="Clear search"
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 sm:right-auto sm:w-96 mt-2 max-h-[28rem] overflow-y-auto bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-xl shadow-xl z-20 animate-[dropdownIn_0.15s_ease-out]">
            {loading && flat.length === 0 && (
              <p className="text-sm text-slate-400 dark:text-slate-500 px-4 py-6 text-center">Searching...</p>
            )}
            {!loading && groups.length === 0 && (
              <p className="text-sm text-slate-400 dark:text-slate-500 px-4 py-6 text-center">
                No results for &ldquo;{query.trim()}&rdquo;.
              </p>
            )}
            {groups.map((group) => (
              <div key={group.category}>
                <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 sticky top-0 bg-white dark:bg-slate-900">
                  {group.category}
                </p>
                <ul>
                  {group.results.map((item) => {
                    runningIndex += 1;
                    const isActive = runningIndex === activeIndex;
                    return (
                      <li key={`${group.category}-${item.id}`}>
                        <button
                          type="button"
                          onMouseEnter={() => setActiveIndex(runningIndex)}
                          onClick={() => goTo(item)}
                          className={`w-full text-left px-4 py-2.5 flex items-center gap-3 ${
                            isActive ? 'bg-slate-50 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <Avatar name={item.title} photoUrl={item.photoUrl} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm text-slate-700 dark:text-slate-200 font-medium truncate">{item.title}</p>
                            {item.subtitle && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.subtitle}</p>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
      )}
    </div>
  );
}
