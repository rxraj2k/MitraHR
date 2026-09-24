import { useState } from 'react';
import { SearchIcon } from './icons';
import { ProjectCategory, Technology } from '../types';
import { CATEGORY_STYLES, TECH_PILL_FALLBACK } from '../lib/projectOptions';

interface Props {
  technologies: Technology[];
  category: ProjectCategory | '';
  selectedIds: string[];
  onToggle: (id: string) => void;
}

// Clickable technology tag grid, replacing the old single "pick one tool
// from a dropdown" SearchableSelect with a multi-select — a project can
// now be tagged with several tools (Okta + AWS + Kubernetes, say) instead
// of just one. Filters to the chosen category when set, otherwise shows
// every active technology; a small search box narrows a long list. Shared
// between the Project Management drawer and Project Detail's edit form so
// both stay in sync as the tech catalog grows.
export default function TechStackPicker({ technologies, category, selectedIds, onToggle }: Props) {
  const [query, setQuery] = useState('');
  const pool = category ? technologies.filter((t) => t.category === category) : technologies;
  const filtered = pool.filter((t) => t.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div>
      <div className="relative mb-2">
        <SearchIcon className="w-3.5 h-3.5 text-slate-300 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={category ? 'Search tools in this category...' : 'Search all tools...'}
          className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 text-xs"
        />
      </div>
      {pool.length === 0 ? (
        <p className="text-xs text-slate-400">No technologies in this category yet — add some from Settings.</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-slate-400">No tools match "{query}".</p>
      ) : (
        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-0.5">
          {filtered.map((t) => {
            const active = selectedIds.includes(t.id);
            const style = CATEGORY_STYLES[t.category];
            return (
              <button
                type="button"
                key={t.id}
                onClick={() => onToggle(t.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  active ? style?.pill || TECH_PILL_FALLBACK : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      )}
      {selectedIds.length > 0 && <p className="text-[11px] text-slate-400 mt-1.5">{selectedIds.length} tool{selectedIds.length === 1 ? '' : 's'} selected</p>}
    </div>
  );
}
