import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE, getStaffingSandboxBoard, placeSandboxEmployee, resetStaffingSandbox } from '../../lib/api';
import { SandboxEmployeeCard, StaffingSandboxBoard } from '../../types';

// A rough "what if" planning surface. It reads the real roster and real
// open projects, but every drag only moves a row in a separate sandbox
// table — it never creates a real project assignment or notifies anyone.
// Once a shuffle looks right, make it official on the Project detail page.

const COLUMN_ACCENTS = [
  { header: 'bg-indigo-50 border-indigo-200 text-indigo-700', chip: 'bg-indigo-100' },
  { header: 'bg-emerald-50 border-emerald-200 text-emerald-700', chip: 'bg-emerald-100' },
  { header: 'bg-amber-50 border-amber-200 text-amber-700', chip: 'bg-amber-100' },
  { header: 'bg-sky-50 border-sky-200 text-sky-700', chip: 'bg-sky-100' },
  { header: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700', chip: 'bg-fuchsia-100' },
  { header: 'bg-rose-50 border-rose-200 text-rose-700', chip: 'bg-rose-100' },
  { header: 'bg-teal-50 border-teal-200 text-teal-700', chip: 'bg-teal-100' },
];

function EmployeeCard({
  card,
  draggingId,
  onDragStart,
  onDragEnd,
}: {
  card: SandboxEmployeeCard;
  draggingId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', card.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(card.id);
      }}
      onDragEnd={onDragEnd}
      className={`bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm cursor-grab active:cursor-grabbing select-none ${
        draggingId === card.id ? 'opacity-40' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        {card.photoUrl ? (
          <img src={`${API_BASE}${card.photoUrl}`} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
        ) : (
          <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold flex items-center justify-center flex-shrink-0">
            {card.fullName.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-700 truncate">{card.fullName}</p>
          <p className="text-xs text-slate-400 truncate">
            {[card.designationName, card.departmentName].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function StaffingSandbox() {
  const { token } = useAuth();
  const [board, setBoard] = useState<StaffingSandboxBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const draggingRef = useRef(false);

  function load() {
    if (!token || draggingRef.current) return;
    getStaffingSandboxBoard(token)
      .then(setBoard)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token]);

  function findCurrentColumn(employeeId: string): { key: string; card: SandboxEmployeeCard } | null {
    if (!board) return null;
    for (const key of Object.keys(board.columns)) {
      const card = board.columns[key].find((c) => c.id === employeeId);
      if (card) return { key, card };
    }
    return null;
  }

  async function handleDrop(targetKey: string) {
    setDragOverKey(null);
    const employeeId = draggingId;
    draggingRef.current = false;
    setDraggingId(null);
    if (!employeeId || !board || !token) return;

    const found = findCurrentColumn(employeeId);
    if (!found || found.key === targetKey) return;

    // Optimistic move so the drop feels instant; reload on failure.
    const nextColumns = { ...board.columns };
    nextColumns[found.key] = nextColumns[found.key].filter((c) => c.id !== employeeId);
    nextColumns[targetKey] = [...nextColumns[targetKey], found.card];
    setBoard({ ...board, columns: nextColumns });

    try {
      await placeSandboxEmployee(token, employeeId, targetKey === 'bench' ? null : targetKey);
    } catch (e: any) {
      setError(e.message);
      load();
    }
  }

  async function handleReset() {
    if (!token) return;
    setResetting(true);
    setError('');
    try {
      await resetStaffingSandbox(token);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setResetting(false);
    }
  }

  const projects = board?.projects || [];

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-1">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Staffing Sandbox</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Drag anyone between columns to try out a shuffle. This is a rough planning space only — it never creates
            a real project assignment or notifies anyone. Once a plan looks right, make it official on that
            project's page.
          </p>
        </div>
        <button
          onClick={handleReset}
          disabled={resetting || loading}
          className="rounded-lg border border-slate-200 text-slate-600 text-sm font-medium px-4 py-2 hover:bg-slate-50 disabled:opacity-50 flex-shrink-0"
        >
          {resetting ? 'Resetting...' : 'Reset Board'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      {loading ? (
        <p className="text-slate-500 text-sm mt-6">Loading...</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 mt-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverKey('bench');
            }}
            onDragLeave={() => setDragOverKey((k) => (k === 'bench' ? null : k))}
            onDrop={() => handleDrop('bench')}
            className={`flex-shrink-0 w-64 rounded-xl border ${
              dragOverKey === 'bench' ? 'border-slate-400 bg-slate-100' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div className="px-3 py-2.5 border-b border-slate-200 rounded-t-xl bg-slate-100 text-slate-600">
              <p className="text-sm font-semibold">Bench / Unassigned</p>
              <p className="text-xs text-slate-400">{board?.columns.bench.length ?? 0} people</p>
            </div>
            <div className="p-2.5 space-y-2 min-h-[120px]">
              {(board?.columns.bench || []).map((card) => (
                <EmployeeCard
                  key={card.id}
                  card={card}
                  draggingId={draggingId}
                  onDragStart={(id) => {
                    draggingRef.current = true;
                    setDraggingId(id);
                  }}
                  onDragEnd={() => {
                    draggingRef.current = false;
                    setDraggingId(null);
                    setDragOverKey(null);
                  }}
                />
              ))}
            </div>
          </div>

          {projects.map((project, i) => {
            const accent = COLUMN_ACCENTS[i % COLUMN_ACCENTS.length];
            const cards = board?.columns[project.id] || [];
            return (
              <div
                key={project.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverKey(project.id);
                }}
                onDragLeave={() => setDragOverKey((k) => (k === project.id ? null : k))}
                onDrop={() => handleDrop(project.id)}
                className={`flex-shrink-0 w-64 rounded-xl border ${
                  dragOverKey === project.id ? 'border-slate-400 bg-slate-100' : 'border-slate-200 bg-white'
                }`}
              >
                <div className={`px-3 py-2.5 border-b rounded-t-xl ${accent.header}`}>
                  <p className="text-sm font-semibold truncate">{project.name}</p>
                  <p className="text-xs opacity-70 truncate">
                    {project.clientName} · {cards.length} people
                  </p>
                </div>
                <div className="p-2.5 space-y-2 min-h-[120px]">
                  {cards.map((card) => (
                    <EmployeeCard
                      key={card.id}
                      card={card}
                      draggingId={draggingId}
                      onDragStart={(id) => {
                        draggingRef.current = true;
                        setDraggingId(id);
                      }}
                      onDragEnd={() => {
                        draggingRef.current = false;
                        setDraggingId(null);
                        setDragOverKey(null);
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {projects.length === 0 && (
            <p className="text-slate-500 text-sm">No active or on-hold projects to shuffle people onto right now.</p>
          )}
        </div>
      )}
    </div>
  );
}
