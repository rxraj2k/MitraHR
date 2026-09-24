import { useMemo, useState } from 'react';
import { Employee } from '../types';
import { SearchIcon, XIcon } from './icons';
import { Avatar } from './Avatar';

const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';

// A searchable employee combobox with avatars — the shared "pick a person"
// control used anywhere a plain alphabetic <select> of names would feel
// out of step with the rest of the app (Asset Management's assignment
// form, Document Management's upload drawer, ...). Matches by name,
// department, or designation.
export function EmployeePicker({
  employees,
  value,
  onChange,
  placeholder = 'Search employees by name...',
}: {
  employees: Employee[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const selected = employees.find((e) => e.id === value) || null;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q
      ? employees.filter(
          (e) =>
            e.fullName.toLowerCase().includes(q) ||
            (e.department?.name || '').toLowerCase().includes(q) ||
            (e.designation?.name || '').toLowerCase().includes(q),
        )
      : employees;
    return pool.slice(0, 8);
  }, [employees, query]);

  if (selected && !open) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-300 px-3 py-2 bg-white">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar name={selected.fullName} photoUrl={selected.photoUrl} size="sm" />
          <div className="min-w-0">
            <p className="text-sm text-slate-700 truncate">{selected.fullName}</p>
            <p className="text-[11px] text-slate-400 truncate">
              {[selected.designation?.name, selected.department?.name].filter(Boolean).join(' · ') || '—'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange('');
            setQuery('');
            setOpen(true);
          }}
          className="text-slate-400 hover:text-slate-600 flex-shrink-0"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`${inputClass} pl-9`}
        />
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
            {matches.length === 0 ? (
              <p className="text-xs text-slate-400 px-3 py-2">No employees match.</p>
            ) : (
              matches.map((e) => (
                <button
                  type="button"
                  key={e.id}
                  onClick={() => {
                    onChange(e.id);
                    setQuery('');
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left"
                >
                  <Avatar name={e.fullName} photoUrl={e.photoUrl} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700 truncate">{e.fullName}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {[e.designation?.name, e.department?.name].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
