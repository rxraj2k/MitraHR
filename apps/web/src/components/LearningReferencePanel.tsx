import { useMemo, useState } from 'react';
import { LearningReferenceGroup } from '../types';
import { ChevronDownIcon, ExternalLinkIcon, SearchIcon } from './icons';

// A browsable "what to know" glossary of tools/concepts/protocols — not
// assignable courses, just reference material with optional links out to
// docs/Confluence/GitHub/videos. Grouped and collapsible since there's a
// lot of it; a quick search flattens everything into a match list instead.
const GROUP_THEMES = [
  'from-cyan-500 to-teal-600',
  'from-indigo-500 to-indigo-700',
  'from-rose-500 to-red-600',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-700',
  'from-violet-500 to-purple-700',
  'from-sky-500 to-blue-700',
  'from-fuchsia-500 to-pink-700',
  'from-slate-500 to-slate-700',
  'from-teal-500 to-cyan-700',
  'from-orange-500 to-red-700',
  'from-blue-500 to-indigo-700',
];

export default function LearningReferencePanel({ groups }: { groups: LearningReferenceGroup[] }) {
  const [query, setQuery] = useState('');
  const [openKey, setOpenKey] = useState<string | null>(groups[0]?.key ?? null);

  const filtered = useMemo(() => {
    if (!query.trim()) return groups;
    const q = query.toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        tools: g.tools.filter(
          (t) => t.name.toLowerCase().includes(q) || t.links.some((l) => l.label.toLowerCase().includes(q)),
        ),
      }))
      .filter((g) => g.tools.length > 0);
  }, [groups, query]);

  const searching = query.trim().length > 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h3 className="text-base font-semibold text-slate-800">IAM Tools Reference</h3>
        <div className="relative w-full sm:w-64">
          <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools, protocols..."
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-mitra-accentFrom/40"
          />
        </div>
      </div>

      {filtered.length === 0 && <p className="text-sm text-slate-400">No matches.</p>}

      <div className="space-y-2">
        {filtered.map((group, i) => {
          const isOpen = searching || openKey === group.key;
          const gradient = GROUP_THEMES[i % GROUP_THEMES.length];
          return (
            <div key={group.key} className="rounded-xl border border-slate-100 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenKey(openKey === group.key ? null : group.key)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-white bg-gradient-to-r ${gradient} shadow-[0_4px_12px_-4px_rgba(15,23,42,0.35)]`}
              >
                <span className="text-sm font-semibold">{group.title}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] bg-white/20 rounded-full px-2 py-0.5">{group.tools.length}</span>
                  <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {isOpen && (
                <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2 bg-slate-50/50">
                  {group.tools.map((tool) => (
                    <div key={tool.name} className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-sm font-medium text-slate-700">{tool.name}</p>
                      {tool.links.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {tool.links.map((l) => (
                            <a
                              key={l.url}
                              href={l.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] bg-slate-100 hover:bg-mitra-accentFrom/10 hover:text-mitra-accentFrom text-slate-600 rounded-full px-2 py-0.5"
                            >
                              {l.label}
                              <ExternalLinkIcon className="w-2.5 h-2.5" />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 mt-1.5">No link yet — concept to know.</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
