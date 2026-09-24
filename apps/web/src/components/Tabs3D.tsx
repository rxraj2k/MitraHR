import { HUE_GRADIENTS, TOGGLE_3D_INACTIVE, toggle3dActive } from '../lib/buttonStyles';

// Tactile 3D pill tab bar — same gradient/shadow/hover-lift language as the
// rest of the app's toggle buttons (lib/buttonStyles), used where a tab
// strip should feel like part of the "stunning, professional" 3D system
// rather than TabBar's flatter colored-pill look. New, standalone component
// rather than an edit to the widely-shared TabBar, so this heavier styling
// only appears where it's actually been asked for (Master Data) and every
// other page keeps its current tab bar untouched.
export type Tab3DColor = keyof typeof HUE_GRADIENTS;

export interface Tab3DItem<K extends string> {
  key: K;
  label: string;
  color: Tab3DColor;
  icon?: (props: { className?: string }) => JSX.Element;
}

export default function Tabs3D<K extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: Tab3DItem<K>[];
  active: K;
  onChange: (key: K) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => {
        const isActive = t.key === active;
        const Icon = t.icon;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold ${
              isActive ? toggle3dActive(HUE_GRADIENTS[t.color]) : TOGGLE_3D_INACTIVE
            }`}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
