// Team Topology (Org Chart redesign) — shared helpers kept out of
// OrgChart.tsx so the recursive tree-building/search logic can be read (and
// reasoned about) on its own, separate from rendering/canvas concerns.
import { Employee } from '../types';

export interface TopologyNode {
  employee: Employee;
  children: TopologyNode[];
  depth: number;
  /** Immediate reports only — what the "N Reports" badge shows. */
  directReports: number;
  /** Everyone under this node, direct or not — used for the collapsed "+N" count. */
  totalDescendants: number;
}

/**
 * Same reporting-line logic the previous OrgChart used (guards against a bad
 * manager cycle by tracking ancestors), extended with per-node metrics the
 * redesigned cards/badges need.
 */
export function buildTopologyForest(employees: Employee[]): TopologyNode[] {
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

  function build(emp: Employee, depth: number, ancestors: Set<string>): TopologyNode {
    const nextAncestors = new Set(ancestors);
    nextAncestors.add(emp.id);
    const kids = (childrenOf.get(emp.id) || [])
      .filter((c) => !ancestors.has(c.id))
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map((c) => build(c, depth + 1, nextAncestors));
    const totalDescendants = kids.reduce((sum, k) => sum + 1 + k.totalDescendants, 0);
    return { employee: emp, children: kids, depth, directReports: kids.length, totalDescendants };
  }

  return roots
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .map((r) => build(r, 0, new Set([r.id])));
}

/** Flat list of every node — used for the search-to-focus index. */
export function flattenForest(forest: TopologyNode[]): TopologyNode[] {
  const out: TopologyNode[] = [];
  function walk(n: TopologyNode) {
    out.push(n);
    n.children.forEach(walk);
  }
  forest.forEach(walk);
  return out;
}

/**
 * Every ancestor id above a target node, root-first. Used to auto-expand
 * any collapsed teams standing between the tree root and a search result
 * before panning/scrolling to it.
 */
export function ancestorIdsOf(forest: TopologyNode[], targetId: string): string[] {
  const path: string[] = [];
  function search(nodes: TopologyNode[], trail: string[]): boolean {
    for (const n of nodes) {
      if (n.employee.id === targetId) {
        path.push(...trail);
        return true;
      }
      if (search(n.children, [...trail, n.employee.id])) return true;
    }
    return false;
  }
  search(forest, []);
  return path;
}

export interface DepartmentColor {
  bar: string; // top accent strip
  badge: string; // small dept badge background+text
  dot: string; // legend swatch
}

// A fixed categorical palette, assigned by each department's alphabetical
// rank rather than a hand-maintained name -> color map or a hash — stays
// deterministic and stable as departments are renamed/added, and never
// reassigns a color out from under a department that's already using one
// (new departments simply take the next unused slot, wrapping if there are
// more than 8).
const DEPARTMENT_PALETTE: DepartmentColor[] = [
  { bar: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  { bar: 'bg-purple-500', badge: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  { bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  { bar: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  { bar: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  { bar: 'bg-teal-500', badge: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500' },
  { bar: 'bg-fuchsia-500', badge: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200', dot: 'bg-fuchsia-500' },
  { bar: 'bg-sky-500', badge: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' },
];
const NO_DEPARTMENT_COLOR: DepartmentColor = {
  bar: 'bg-slate-300',
  badge: 'bg-slate-50 text-slate-500 border-slate-200',
  dot: 'bg-slate-300',
};

export function buildDepartmentColorMap(employees: Employee[]): Map<string, DepartmentColor> {
  const names = Array.from(new Set(employees.map((e) => e.department?.name).filter((n): n is string => !!n))).sort(
    (a, b) => a.localeCompare(b),
  );
  const map = new Map<string, DepartmentColor>();
  names.forEach((name, i) => map.set(name, DEPARTMENT_PALETTE[i % DEPARTMENT_PALETTE.length]));
  return map;
}

export function departmentColorFor(map: Map<string, DepartmentColor>, departmentName?: string | null): DepartmentColor {
  if (!departmentName) return NO_DEPARTMENT_COLOR;
  return map.get(departmentName) || NO_DEPARTMENT_COLOR;
}

/**
 * Renders `el` to a PNG (or, wrapped in a single-page PDF, a PDF) and
 * triggers a browser download. Loaded lazily via dynamic import so the
 * ~250KB of html2canvas/jsPDF only ever hits the bundle for someone who
 * actually clicks Export, not on every Team Topology page load.
 */
export async function exportTopologyImage(el: HTMLElement, fileName: string, format: 'png' | 'pdf'): Promise<void> {
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(el, { backgroundColor: '#f8fafc', scale: 2, useCORS: true });

  if (format === 'png') {
    const link = document.createElement('a');
    link.download = `${fileName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    return;
  }

  const { jsPDF } = await import('jspdf');
  const imgData = canvas.toDataURL('image/png');
  const orientation = canvas.width >= canvas.height ? 'l' : 'p';
  const pdf = new jsPDF({ orientation, unit: 'px', format: [canvas.width, canvas.height] });
  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
  pdf.save(`${fileName}.pdf`);
}


/**
 * Returns the subtree rooted at `id` (its own TopologyNode, with children
 * untouched) with every depth re-based to 0 at that node — used by "My
 * Team"'s Team Tree Shortcut to reuse the same OrgChart rendering/toolbar
 * code for a single manager's reporting line instead of the whole company
 * forest. Returns null if `id` isn't found anywhere in `forest` (e.g. an
 * employee with no direct reports would still be found, just with an empty
 * children array).
 */
export function subtreeAt(forest: TopologyNode[], id: string): TopologyNode | null {
  function find(nodes: TopologyNode[]): TopologyNode | null {
    for (const n of nodes) {
      if (n.employee.id === id) return n;
      const found = find(n.children);
      if (found) return found;
    }
    return null;
  }
  const node = find(forest);
  if (!node) return null;

  function reDepth(n: TopologyNode, depth: number): TopologyNode {
    return { ...n, depth, children: n.children.map((c) => reDepth(c, depth + 1)) };
  }
  return reDepth(node, 0);
}
