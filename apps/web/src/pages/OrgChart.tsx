import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE, getEmployees } from '../lib/api';
import { Employee } from '../types';

interface TreeNode {
  employee: Employee;
  children: TreeNode[];
}

function buildForest(employees: Employee[]): TreeNode[] {
  const byId = new Map(employees.map((e) => [e.id, e]));
  const childrenOf = new Map<string, Employee[]>();
  const roots: Employee[] = [];

  for (const emp of employees) {
    const managerId = emp.reportingManagerId;
    if (managerId && managerId !== emp.id && byId.has(managerId)) {
      if (!childrenOf.has(managerId)) childrenOf.set(managerId, []);
      childrenOf.get(managerId)!.push(emp);
    } else {
      roots.push(emp);
    }
  }

  function build(emp: Employee, ancestors: Set<string>): TreeNode {
    const nextAncestors = new Set(ancestors);
    nextAncestors.add(emp.id);
    const kids = (childrenOf.get(emp.id) || [])
      .filter((c) => !ancestors.has(c.id)) // guards against a bad manager cycle
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
    return { employee: emp, children: kids.map((c) => build(c, nextAncestors)) };
  }

  return roots
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .map((r) => build(r, new Set([r.id])));
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function NodeCard({
  node,
  isRoot,
  collapsed,
  onToggleCollapse,
}: {
  node: TreeNode;
  isRoot: boolean;
  collapsed: Set<string>;
  onToggleCollapse: (id: string) => void;
}) {
  const navigate = useNavigate();
  const { employee, children } = node;
  const hasChildren = children.length > 0;
  const isCollapsed = collapsed.has(employee.id);

  return (
    <li className={isRoot ? 'org-root' : undefined}>
      <div
        onClick={() => navigate(`/employees/${employee.id}`)}
        className="w-48 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-3 text-center shadow-sm transition-shadow hover:shadow-md hover:border-mitra-accentFrom/50"
      >
        <div className="mx-auto mb-2 h-12 w-12 overflow-hidden rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-500">
          {employee.photoUrl ? (
            <img
              src={`${API_BASE}${employee.photoUrl}`}
              alt={employee.fullName}
              className="h-full w-full object-cover"
            />
          ) : (
            initials(employee.fullName) || '—'
          )}
        </div>
        <p className="truncate text-sm font-semibold text-slate-800">{employee.fullName}</p>
        <p className="truncate text-xs text-slate-500">{employee.designation?.name || '—'}</p>
        {employee.department?.name && (
          <span className="mt-1 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
            {employee.department.name}
          </span>
        )}
      </div>

      {hasChildren && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse(employee.id);
          }}
          className="relative z-10 -mt-2 mb-1 h-5 w-5 rounded-full border border-slate-300 bg-white text-[11px] leading-none text-slate-500 hover:border-mitra-accentFrom hover:text-mitra-accentFrom"
          title={isCollapsed ? 'Expand team' : 'Collapse team'}
        >
          {isCollapsed ? '+' : '−'}
        </button>
      )}

      {hasChildren && !isCollapsed && (
        <ul>
          {children.map((child) => (
            <NodeCard
              key={child.employee.id}
              node={child}
              isRoot={false}
              collapsed={collapsed}
              onToggleCollapse={onToggleCollapse}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function OrgChart() {
  const { token } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!token) return;
    getEmployees(token)
      .then(setEmployees)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const forest = useMemo(() => buildForest(employees), [employees]);

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Org Chart</h1>
          <p className="text-sm text-slate-500 mt-1">
            Click any card to open that employee's profile. Use the − / + button to collapse or expand a team.
          </p>
        </div>
      </div>

      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : employees.length === 0 ? (
        <p className="text-slate-500">No employees yet — onboard your first one to see the chart.</p>
      ) : (
        <div className="overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-8">
          <div className="flex justify-center gap-10">
            {forest.map((root) => (
              <ul key={root.employee.id} className="org-tree">
                <NodeCard node={root} isRoot collapsed={collapsed} onToggleCollapse={toggleCollapse} />
              </ul>
            ))}
          </div>
          {forest.length > 1 && (
            <p className="mt-6 text-center text-xs text-slate-400">
              {forest.length} separate trees shown — set a Reporting Manager on an employee (in Placement &amp;
              Hierarchy) to connect them under one chart.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
