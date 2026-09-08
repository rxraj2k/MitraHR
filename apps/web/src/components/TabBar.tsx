// Shared colorful pill-style tab bar, used by any page that splits a long
// screen into sections (Master Data, Leaves & Attendance, ...). Each tab
// gets its own accent color so the row reads as a set of distinct buttons
// rather than a plain underlined tab strip.
export type TabColor = 'indigo' | 'emerald' | 'sky' | 'amber' | 'rose' | 'fuchsia' | 'teal';

export interface TabBarItem<K extends string> {
  key: K;
  label: string;
  color: TabColor;
}

const COLOR_CLASSES: Record<TabColor, { active: string; inactive: string }> = {
  indigo: {
    active: 'bg-indigo-600 text-white shadow-sm shadow-indigo-200',
    inactive: 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100',
  },
  emerald: {
    active: 'bg-emerald-600 text-white shadow-sm shadow-emerald-200',
    inactive: 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100',
  },
  sky: {
    active: 'bg-sky-600 text-white shadow-sm shadow-sky-200',
    inactive: 'bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100',
  },
  amber: {
    active: 'bg-amber-600 text-white shadow-sm shadow-amber-200',
    inactive: 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100',
  },
  rose: {
    active: 'bg-rose-600 text-white shadow-sm shadow-rose-200',
    inactive: 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100',
  },
  fuchsia: {
    active: 'bg-fuchsia-600 text-white shadow-sm shadow-fuchsia-200',
    inactive: 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200 hover:bg-fuchsia-100',
  },
  teal: {
    active: 'bg-teal-600 text-white shadow-sm shadow-teal-200',
    inactive: 'bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100',
  },
};

export default function TabBar<K extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: TabBarItem<K>[];
  active: K;
  onChange: (key: K) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {tabs.map((t) => {
        const isActive = t.key === active;
        const colors = COLOR_CLASSES[t.color];
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={[
              'px-4 py-2 rounded-full text-sm font-medium transition-colors',
              isActive ? colors.active : colors.inactive,
            ].join(' ')}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
