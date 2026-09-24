import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE, getAttendanceCalendar, getEmployees } from '../lib/api';
import { Employee } from '../types';
import { DEPLOYMENT_STATUS_BADGE, DEPLOYMENT_STATUS_LABELS } from '../lib/talentDirectory';
import {
  DepartmentColor,
  TopologyNode,
  ancestorIdsOf,
  buildDepartmentColorMap,
  buildTopologyForest,
  departmentColorFor,
  exportTopologyImage,
  flattenForest,
  subtreeAt,
} from '../lib/orgTopology';
import {
  DownloadIcon,
  ListTreeIcon,
  MaximizeIcon,
  MoreVerticalIcon,
  SearchIcon,
  ShareNetworkIcon,
  UsersIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from '../components/icons';
import TalentProfileDrawer from './employees/TalentProfileDrawer';

type ViewMode = 'chart' | 'list';

// 0.7 is the floor below which card text/badges stop being legible — Fit to
// View and the zoom-out button both refuse to go past it, matching the
// spec's own "e.g., 0.7x" minimum-legibility threshold.
const MIN_SCALE = 0.7;
const MAX_SCALE = 2;
const SCALE_STEP = 0.15;
const HIGHLIGHT_MS = 2600;

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

// Quick-action menu on a node card: the spec's "... for slide-over drawer
// vs. full profile navigation" — the drawer stays the primary click target,
// this is a shortcut for either without needing to open it first.
function NodeQuickMenu({ employeeId, onViewProfile }: { employeeId: string; onViewProfile: () => void }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
      >
        <MoreVerticalIcon className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setOpen(false);
                onViewProfile();
              }}
              className="block w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-50"
            >
              View Profile
            </button>
            <button
              onClick={() => {
                setOpen(false);
                navigate(`/employees/${employeeId}`);
              }}
              className="block w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-50"
            >
              Full Profile
            </button>
          </div>
        </>
      )}
    </div>
  );
}

interface NodeRenderProps {
  deptColorMap: Map<string, DepartmentColor>;
  onlineIds: Set<string>;
  collapsed: Set<string>;
  onToggleCollapse: (id: string) => void;
  onOpenDrawer: (id: string) => void;
  registerRef: (id: string, el: HTMLDivElement | null) => void;
  highlightedId: string | null;
}

function ChartNode({ node, isRoot, ...rest }: { node: TopologyNode; isRoot: boolean } & NodeRenderProps) {
  const { deptColorMap, onlineIds, collapsed, onToggleCollapse, onOpenDrawer, registerRef, highlightedId } = rest;
  const { employee, children, directReports, totalDescendants } = node;
  const hasChildren = children.length > 0;
  const isCollapsed = collapsed.has(employee.id);
  const deptColor = departmentColorFor(deptColorMap, employee.department?.name);
  const online = onlineIds.has(employee.id);
  const isHighlighted = highlightedId === employee.id;

  return (
    <li className={isRoot ? 'org-root' : undefined}>
      <div
        ref={(el) => registerRef(employee.id, el)}
        onClick={() => onOpenDrawer(employee.id)}
        className={`topology-card relative w-56 cursor-pointer rounded-xl border bg-white text-left shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg ${
          isHighlighted ? 'border-mitra-accentFrom ring-2 ring-mitra-accentFrom ring-offset-2' : 'border-slate-200'
        }`}
      >
        {/* rounded-t-xl (not overflow-hidden on the card) so the quick-action
            dropdown below isn't clipped by this bar's own rounded corners */}
        <div className={`h-1.5 w-full rounded-t-xl ${deptColor.bar}`} />
        <div className="absolute right-1.5 top-2.5">
          <NodeQuickMenu employeeId={employee.id} onViewProfile={() => onOpenDrawer(employee.id)} />
        </div>
        <div className="px-3 pb-3 pt-2.5">
          <div className="flex items-start gap-2.5">
            <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500">
              {employee.photoUrl ? (
                <img src={`${API_BASE}${employee.photoUrl}`} alt={employee.fullName} className="h-full w-full object-cover" />
              ) : (
                initials(employee.fullName) || '—'
              )}
              <span
                className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${online ? 'bg-emerald-500' : 'bg-slate-300'}`}
                title={online ? 'Checked in today' : 'Not checked in yet'}
              />
            </div>
            <div className="min-w-0 pr-5">
              <p className="truncate text-sm font-semibold text-slate-800">{employee.fullName}</p>
              <p className="truncate text-xs text-slate-500">{employee.designation?.name || '—'}</p>
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${DEPLOYMENT_STATUS_BADGE[employee.deploymentStatus]}`}
            >
              {DEPLOYMENT_STATUS_LABELS[employee.deploymentStatus]}
            </span>
            {hasChildren && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                <UsersIcon className="h-3 w-3" /> {directReports} Report{directReports === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>
      </div>

      {hasChildren && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse(employee.id);
          }}
          className="relative z-10 -mt-2.5 mb-1 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full border border-slate-300 bg-white px-1.5 text-[11px] font-medium leading-none text-slate-500 hover:border-mitra-accentFrom hover:text-mitra-accentFrom"
          title={isCollapsed ? `Expand team (${totalDescendants} hidden)` : 'Collapse team'}
        >
          {isCollapsed ? `+${directReports}` : '−'}
        </button>
      )}

      {hasChildren && !isCollapsed && (
        <ul>
          {children.map((child) => (
            <ChartNode key={child.employee.id} node={child} isRoot={false} {...rest} />
          ))}
        </ul>
      )}
    </li>
  );
}

function ListNode({ node, ...rest }: { node: TopologyNode } & NodeRenderProps) {
  const { deptColorMap, onlineIds, collapsed, onToggleCollapse, onOpenDrawer, registerRef, highlightedId } = rest;
  const { employee, children, directReports, totalDescendants } = node;
  const hasChildren = children.length > 0;
  const isCollapsed = collapsed.has(employee.id);
  const deptColor = departmentColorFor(deptColorMap, employee.department?.name);
  const online = onlineIds.has(employee.id);
  const isHighlighted = highlightedId === employee.id;

  return (
    <div>
      <div
        ref={(el) => registerRef(employee.id, el)}
        onClick={() => onOpenDrawer(employee.id)}
        style={{ paddingLeft: node.depth * 26 }}
        className={`flex cursor-pointer items-center gap-2.5 rounded-lg py-2 pr-2 transition-colors hover:bg-slate-50 ${
          isHighlighted ? 'bg-mitra-accentFrom/5 ring-2 ring-mitra-accentFrom' : ''
        }`}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse(employee.id);
            }}
            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-medium text-slate-500 hover:border-mitra-accentFrom hover:text-mitra-accentFrom"
            title={isCollapsed ? `Expand team (${totalDescendants} hidden)` : 'Collapse team'}
          >
            {isCollapsed ? '+' : '−'}
          </button>
        ) : (
          <span className="h-5 w-5 flex-shrink-0" />
        )}
        <span className={`h-7 w-1 flex-shrink-0 rounded-full ${deptColor.bar}`} />
        <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-semibold text-slate-500">
          {employee.photoUrl ? (
            <img src={`${API_BASE}${employee.photoUrl}`} alt={employee.fullName} className="h-full w-full object-cover" />
          ) : (
            initials(employee.fullName) || '—'
          )}
          <span
            className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-white ${online ? 'bg-emerald-500' : 'bg-slate-300'}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-800">
            {employee.fullName} <span className="font-normal text-slate-400">· {employee.designation?.name || '—'}</span>
          </p>
          <p className="truncate text-xs text-slate-400">{employee.department?.name || 'Unassigned'}</p>
        </div>
        <span
          className={`hidden sm:inline-flex flex-shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${DEPLOYMENT_STATUS_BADGE[employee.deploymentStatus]}`}
        >
          {DEPLOYMENT_STATUS_LABELS[employee.deploymentStatus]}
        </span>
        {hasChildren && (
          <span className="hidden md:inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            <UsersIcon className="h-3 w-3" /> {directReports}
          </span>
        )}
        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <NodeQuickMenu employeeId={employee.id} onViewProfile={() => onOpenDrawer(employee.id)} />
        </div>
      </div>
      {hasChildren && !isCollapsed && (
        <div>
          {children.map((child) => (
            <ListNode key={child.employee.id} node={child} {...rest} />
          ))}
        </div>
      )}
    </div>
  );
}

// `rootEmployeeId` re-roots the chart to just one manager's reporting line
// (see subtreeAt) — used by My Team's "Team Tree Shortcut" to reuse this
// entire component (toolbar, zoom, search, export, the drawer) instead of
// duplicating tree-drawing logic for a single-manager view.
export default function OrgChart({
  hideHeader = false,
  rootEmployeeId,
}: { hideHeader?: boolean; rootEmployeeId?: string } = {}) {
  const { token, isStaff } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('chart');
  const [drawerEmployeeId, setDrawerEmployeeId] = useState<string | null>(null);

  // Zoom is a plain scale factor; panning is native browser scrolling on
  // scrollRef (restored per feedback — the canvas used to be a CSS
  // translate/scale drag-pan surface with no real scrollbars). naturalSize
  // is the tree's own unscaled footprint (measured off chartContentRef,
  // which `transform: scale()` never affects) — it drives an inner sizing
  // box so the *outer* scrollable area's width/height keep matching the
  // zoomed-in/out canvas instead of staying fixed at 100%.
  const [scale, setScale] = useState(1);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  // Set right before a scale change that should re-center on something once
  // the resulting layout settles (a manual zoom keeps the current viewport
  // center; Fit to View recenters on the first root) — consumed by the
  // useLayoutEffect below, keyed on `scale`.
  const pendingScaleActionRef = useRef<{ type: 'anchor'; x: number; y: number } | { type: 'root' } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>();

  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const chartContentRef = useRef<HTMLDivElement>(null);
  const listContentRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    if (!token) return;
    getEmployees(token)
      .then(setEmployees)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    const now = new Date();
    getAttendanceCalendar(token, now.getUTCFullYear(), now.getUTCMonth() + 1)
      .then(({ days }) => {
        const todayStr = now.toISOString().slice(0, 10);
        const today = days.find((d) => d.date.slice(0, 10) === todayStr);
        setOnlineIds(new Set((today?.present || []).map((e) => e.id)));
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => () => clearTimeout(highlightTimer.current), []);

  const fullForest = useMemo(() => buildTopologyForest(employees), [employees]);
  const forest = useMemo(() => {
    if (!rootEmployeeId) return fullForest;
    const sub = subtreeAt(fullForest, rootEmployeeId);
    return sub ? [sub] : [];
  }, [fullForest, rootEmployeeId]);
  const flat = useMemo(() => flattenForest(forest), [forest]);
  const deptColorMap = useMemo(() => buildDepartmentColorMap(employees), [employees]);

  // Re-measure the tree's natural (unscaled) footprint whenever the tree
  // itself changes shape — expanding/collapsing a team, or the data
  // reloading. scrollWidth/scrollHeight are unaffected by the `transform:
  // scale()` on this same element, so this is accurate at any zoom level.
  useLayoutEffect(() => {
    if (viewMode !== 'chart') return;
    const el = chartContentRef.current;
    if (!el) return;
    setNaturalSize({ w: el.scrollWidth, h: el.scrollHeight });
  }, [forest, collapsed, viewMode]);

  // Runs after any scale change has been committed to the DOM (the sizing
  // box's width/height are naturalSize*scale, so by the time this fires the
  // scrollable area already reflects the new zoom level) and repositions
  // the scroll offset per whichever action requested the zoom change.
  useLayoutEffect(() => {
    const action = pendingScaleActionRef.current;
    if (!action) return;
    pendingScaleActionRef.current = null;
    const viewport = scrollRef.current;
    if (!viewport) return;
    if (action.type === 'anchor') {
      viewport.scrollLeft = action.x * scale - viewport.clientWidth / 2;
      viewport.scrollTop = action.y * scale - viewport.clientHeight / 2;
    } else if (action.type === 'root' && forest[0]) {
      scrollNodeIntoView(forest[0].employee.id, 'auto');
    }
  }, [scale]);

  /** Screen-space centering, independent of the current zoom/scroll state —
   * works by converting the target's current on-screen position back into
   * "scrolled content" coordinates (adding the viewport's own scroll offset
   * back in), then asking the browser to scroll to put that point in the
   * center. Used by both search-to-focus and Fit to View's root-centering. */
  function scrollNodeIntoView(id: string, behavior: ScrollBehavior) {
    const viewport = scrollRef.current;
    const el = nodeRefs.current.get(id);
    if (!viewport || !el) return;
    const viewportRect = viewport.getBoundingClientRect();
    const targetRect = el.getBoundingClientRect();
    const targetCenterX = targetRect.left + targetRect.width / 2 - viewportRect.left + viewport.scrollLeft;
    const targetCenterY = targetRect.top + targetRect.height / 2 - viewportRect.top + viewport.scrollTop;
    viewport.scrollTo({
      left: targetCenterX - viewport.clientWidth / 2,
      top: targetCenterY - viewport.clientHeight / 2,
      behavior,
    });
  }

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return flat
      .filter(
        (n) =>
          n.employee.fullName.toLowerCase().includes(q) ||
          (n.employee.designation?.name || '').toLowerCase().includes(q) ||
          (n.employee.department?.name || '').toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [flat, searchQuery]);

  function registerRef(id: string, el: HTMLDivElement | null) {
    if (el) nodeRefs.current.set(id, el);
    else nodeRefs.current.delete(id);
  }

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setCollapsed(new Set());
  }

  function collapseAll() {
    const ids = new Set<string>();
    flat.forEach((n) => {
      if (n.children.length > 0) ids.add(n.employee.id);
    });
    setCollapsed(ids);
  }

  // Search-to-focus: expand any collapsed teams standing between the root
  // and the match, highlight the card/row briefly, then bring it to the
  // center of the viewport — a native `scrollIntoView`/`scrollTo` in both
  // view modes now, rather than the old CSS-translate pan.
  function focusOn(id: string) {
    const toExpand = ancestorIdsOf(forest, id);
    if (toExpand.length > 0) {
      setCollapsed((prev) => {
        const next = new Set(prev);
        toExpand.forEach((a) => next.delete(a));
        return next;
      });
    }
    setHighlightedId(id);
    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightedId(null), HIGHLIGHT_MS);

    // Wait a couple of frames for any newly-expanded teams to actually
    // paint before measuring positions — expanding ancestors above changes
    // layout, and we need the settled layout, not the pre-expand one.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (viewMode === 'list') {
          nodeRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          scrollNodeIntoView(id, 'smooth');
        }
      });
    });
  }

  function zoomBy(delta: number) {
    const viewport = scrollRef.current;
    if (viewport) {
      // Keep whatever's currently centered in view still centered after the
      // zoom, instead of jumping the visible area back to the top-left.
      const naturalCenterX = (viewport.scrollLeft + viewport.clientWidth / 2) / scale;
      const naturalCenterY = (viewport.scrollTop + viewport.clientHeight / 2) / scale;
      pendingScaleActionRef.current = { type: 'anchor', x: naturalCenterX, y: naturalCenterY };
    }
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round((s + delta) * 100) / 100)));
  }

  function fitToView() {
    const viewport = scrollRef.current;
    const content = chartContentRef.current;
    if (!viewport || !content || content.scrollWidth === 0 || content.scrollHeight === 0) {
      setScale(1);
      return;
    }
    const vw = viewport.clientWidth - 48;
    const vh = viewport.clientHeight - 48;
    const bestFit = Math.min(1, vw / content.scrollWidth, vh / content.scrollHeight);
    // Never shrink past the legibility floor — a very large org simply
    // won't fit entirely on screen at a readable scale, and that's the
    // right trade-off (that's what the scrollbars are for).
    pendingScaleActionRef.current = { type: 'root' };
    setScale(Math.max(MIN_SCALE, Math.round(bestFit * 100) / 100));
  }

  // Plain wheel/trackpad scrolling is left alone (native, both axes, for
  // free from `overflow: auto` on scrollRef) — only a held Ctrl/Cmd+wheel
  // (the standard trackpad-pinch-to-zoom / "zoom, not pan" convention)
  // drives the zoom level instead.
  function handleWheel(e: React.WheelEvent) {
    if (viewMode !== 'chart' || !(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    zoomBy(e.deltaY > 0 ? -0.08 : 0.08);
  }

  async function handleExport(format: 'png' | 'pdf') {
    const el = viewMode === 'chart' ? chartContentRef.current : listContentRef.current;
    if (!el) return;
    setExportMenuOpen(false);
    setExporting(true);
    setError('');
    const prevTransform = el.style.transform;
    const prevTransition = el.style.transition;
    if (viewMode === 'chart') {
      el.style.transition = 'none';
      el.style.transform = 'none';
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    try {
      await exportTopologyImage(el, 'team-topology', format);
    } catch {
      setError('Export failed — please try again.');
    } finally {
      if (viewMode === 'chart') {
        el.style.transform = prevTransform;
        el.style.transition = prevTransition;
      }
      setExporting(false);
    }
  }

  const nodeRenderProps: NodeRenderProps = {
    deptColorMap,
    onlineIds,
    collapsed,
    onToggleCollapse: toggleCollapse,
    onOpenDrawer: setDrawerEmployeeId,
    registerRef,
    highlightedId,
  };

  return (
    <div>
      {/* Suppressed when embedded elsewhere (Organization > Employee Tree)
          so this reads as that tab's content, not a page called in from a
          differently-named feature. */}
      {!hideHeader && (
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Team Topology</h1>
            <p className="text-sm text-slate-500 mt-1">
              Interactive reporting map — search, zoom, or switch to the nested list to explore the org. Click any
              card to open the read-only Talent Profile drawer.
            </p>
          </div>
        </div>
      )}

      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : employees.length === 0 ? (
        <p className="text-slate-500">No employees yet — onboard your first one to see the chart.</p>
      ) : (
        <div>
          {deptColorMap.size > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
              <span className="font-medium text-slate-400">Departments:</span>
              {Array.from(deptColorMap.entries()).map(([name, color]) => (
                <span key={name} className="inline-flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${color.dot}`} /> {name}
                </span>
              ))}
            </div>
          )}

          <div className="relative h-[560px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {/* Floating canvas controls */}
            <div className="absolute inset-x-3 top-3 z-20 flex flex-wrap items-center gap-2">
              {viewMode === 'chart' && (
                <div className="flex items-center gap-0.5 rounded-lg border border-slate-300 bg-white/95 backdrop-blur p-0.5 shadow-sm">
                  <button
                    type="button"
                    onClick={() => zoomBy(-SCALE_STEP)}
                    title="Zoom out"
                    className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
                  >
                    <ZoomOutIcon className="w-4 h-4" />
                  </button>
                  <span className="w-11 text-center text-xs text-slate-500">{Math.round(scale * 100)}%</span>
                  <button
                    type="button"
                    onClick={() => zoomBy(SCALE_STEP)}
                    title="Zoom in"
                    className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
                  >
                    <ZoomInIcon className="w-4 h-4" />
                  </button>
                  <div className="mx-0.5 h-4 w-px bg-slate-200" />
                  <button
                    type="button"
                    onClick={fitToView}
                    title="Fit to View / Reset"
                    className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
                  >
                    <MaximizeIcon className="w-4 h-4" />
                  </button>
                </div>
              )}

              <button type="button" onClick={expandAll} className="text-xs text-slate-500 hover:text-mitra-accentFrom hover:underline">
                Expand all
              </button>
              <button type="button" onClick={collapseAll} className="text-xs text-slate-500 hover:text-mitra-accentFrom hover:underline">
                Collapse all
              </button>

              <div className="ml-auto flex flex-wrap items-center gap-2">
                {/* Search Member */}
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSearchOpen(true);
                    }}
                    onFocus={() => setSearchOpen(true)}
                    onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                    placeholder="Search member..."
                    className="w-40 sm:w-56 rounded-lg border border-slate-300 bg-white/95 backdrop-blur py-1.5 pl-8 pr-2 text-xs shadow-sm"
                  />
                  {searchOpen && searchQuery.trim() && (
                    <div className="absolute right-0 top-full z-30 mt-1 w-64 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white text-sm shadow-lg">
                      {searchResults.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-slate-400">No match</p>
                      ) : (
                        searchResults.map((n) => (
                          <button
                            key={n.employee.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setSearchQuery('');
                              setSearchOpen(false);
                              focusOn(n.employee.id);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                          >
                            <span
                              className={`h-2 w-2 flex-shrink-0 rounded-full ${departmentColorFor(deptColorMap, n.employee.department?.name).dot}`}
                            />
                            <span className="min-w-0 flex-1 truncate">
                              <span className="font-medium text-slate-700">{n.employee.fullName}</span>
                              <span className="text-xs text-slate-400"> · {n.employee.designation?.name || '—'}</span>
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Export Topology */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setExportMenuOpen((o) => !o)}
                    disabled={exporting}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white/95 backdrop-blur px-2.5 py-1.5 text-xs text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    <DownloadIcon className="w-3.5 h-3.5" /> {exporting ? 'Exporting...' : 'Export'}
                  </button>
                  {exportMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)} />
                      <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 text-xs">
                        <button
                          onClick={() => handleExport('png')}
                          className="block w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                        >
                          Download PNG
                        </button>
                        <button
                          onClick={() => handleExport('pdf')}
                          className="block w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                        >
                          Download PDF
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Layout Toggle */}
                <div className="flex items-center rounded-lg border border-slate-300 overflow-hidden text-xs bg-white/95 backdrop-blur shadow-sm">
                  <button
                    type="button"
                    onClick={() => setViewMode('chart')}
                    className={`px-2.5 py-1.5 flex items-center gap-1 ${viewMode === 'chart' ? 'bg-slate-800 text-white' : 'text-slate-600'}`}
                  >
                    <ShareNetworkIcon className="w-3.5 h-3.5" /> Org Chart
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`px-2.5 py-1.5 flex items-center gap-1 ${viewMode === 'list' ? 'bg-slate-800 text-white' : 'text-slate-600'}`}
                  >
                    <ListTreeIcon className="w-3.5 h-3.5" /> Nested List
                  </button>
                </div>
              </div>
            </div>

            {/* Canvas — a real scrollable element (native scrollbars, wheel,
                trackpad, drag-the-thumb) rather than a CSS-transform pan
                surface. The chart view's inner sizing box is sized to
                naturalSize*scale so the scrollbars' own range grows/shrinks
                with the zoom level instead of staying pinned at 100%. */}
            <div ref={scrollRef} onWheel={handleWheel} className="topology-scroll h-full w-full overflow-auto">
              {viewMode === 'chart' ? (
                <div
                  style={{
                    width: naturalSize.w > 0 ? naturalSize.w * scale : '100%',
                    height: naturalSize.h > 0 ? naturalSize.h * scale : '100%',
                    minWidth: '100%',
                    minHeight: '100%',
                  }}
                  className="flex items-start justify-center"
                >
                  <div
                    ref={chartContentRef}
                    style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
                    className="flex select-none gap-10 p-16 pt-20"
                  >
                    {forest.map((root) => (
                      <ul key={root.employee.id} className="org-tree">
                        <ChartNode node={root} isRoot {...nodeRenderProps} />
                      </ul>
                    ))}
                  </div>
                </div>
              ) : (
                <div ref={listContentRef} className="space-y-0.5 p-4 pt-16">
                  {forest.map((root) => (
                    <ListNode key={root.employee.id} node={root} {...nodeRenderProps} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {forest.length > 1 && (
            <p className="mt-3 text-center text-xs text-slate-400">
              {forest.length} separate trees shown — set a Reporting Manager on an employee (in Placement &amp;
              Hierarchy) to connect them under one chart.
            </p>
          )}
        </div>
      )}

      {drawerEmployeeId && (
        <TalentProfileDrawer employeeId={drawerEmployeeId} isStaff={isStaff} onClose={() => setDrawerEmployeeId(null)} />
      )}
    </div>
  );
}
