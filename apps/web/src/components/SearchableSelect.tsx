import { useEffect, useRef, useState } from 'react';
import { LookupItem } from '../types';

interface Props {
  options: LookupItem[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  emptyHint?: string;
}

// A type-to-filter combobox for long lookup lists (skills, etc).
// Native <select> relies on the OS's own single-letter jump, which gets
// unreliable once a list has several entries sharing a first letter —
// this filters on every keystroke instead, against the full name.
export default function SearchableSelect({ options, value, onChange, placeholder, emptyHint }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const blurTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const match = options.find((o) => o.id === value);
    setQuery(match ? match.name : '');
  }, [value, options]);

  useEffect(() => () => clearTimeout(blurTimeout.current), []);

  const filtered = options.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase()));

  function select(opt: LookupItem) {
    onChange(opt.id);
    setQuery(opt.name);
    setOpen(false);
  }

  function handleBlur() {
    blurTimeout.current = setTimeout(() => {
      setOpen(false);
      const match = options.find((o) => o.id === value);
      if (query.trim() === '') {
        if (value) onChange('');
      } else if (!match || match.name !== query) {
        setQuery(match ? match.name : '');
      }
    }, 150);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlighted((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && filtered[highlighted]) select(filtered[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlighted(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      {open && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white text-sm shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-slate-400">{emptyHint || 'No match'}</div>
          ) : (
            <ul>
              {filtered.map((opt, i) => (
                <li
                  key={opt.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => select(opt)}
                  className={`cursor-pointer px-3 py-2 ${
                    i === highlighted ? 'bg-mitra-accentFrom/10 text-mitra-accentFrom' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
