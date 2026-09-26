import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { getLeaveBalances } from '../lib/api';
import { LeaveBalance } from '../types';
import { ChevronDownIcon } from './icons';
import { cardStyleFor, GENDER_SPECIFIC_CODES, LeaveBalanceCard } from './MyLeavePanel';

interface Props {
  employeeId: string;
  title?: string;
  // Fired when a card is clicked -- the Leaves & Attendance overview tab
  // uses this to jump to the Request Leave & Policy tab with that leave
  // type pre-selected on the form, per the "make my leaves cards clickable"
  // request.
  onSelectLeaveType?: (leaveTypeId: string) => void;
}

// A compact, standalone rendering of just the "My Leaves" balance cards --
// split out of MyLeavePanel so the Leaves & Attendance overview tab can show
// them (clickable, five to a row) without also pulling in the full
// request-form / history / policy content that now lives on its own tab.
// Reuses MyLeavePanel's card component and styling helpers so the two never
// visually drift apart.
export default function MyLeaveBalanceCards({ employeeId, title = 'My Leaves', onSelectLeaveType }: Props) {
  const { token } = useAuth();
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  function load() {
    if (!token || !employeeId) return;
    getLeaveBalances(token, employeeId)
      .then(setBalances)
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token, employeeId]);
  useAutoRefresh(load);

  const primary = useMemo(() => balances.filter((b) => !GENDER_SPECIFIC_CODES.has(b.leaveTypeCode || '')), [balances]);
  const secondary = useMemo(() => balances.filter((b) => GENDER_SPECIFIC_CODES.has(b.leaveTypeCode || '')), [balances]);

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-800 mb-3">{title}</h2>
      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {primary.map((b, i) => (
              <button
                key={b.leaveTypeId}
                type="button"
                onClick={() => onSelectLeaveType?.(b.leaveTypeId)}
                className="text-left rounded-2xl transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-mitra-accentFrom/40"
              >
                <LeaveBalanceCard balance={b} style={cardStyleFor(b.leaveTypeCode, i)} compact />
              </button>
            ))}
            {showAll &&
              secondary.map((b, i) => (
                <button
                  key={b.leaveTypeId}
                  type="button"
                  onClick={() => onSelectLeaveType?.(b.leaveTypeId)}
                  className="text-left rounded-2xl transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-mitra-accentFrom/40"
                >
                  <LeaveBalanceCard balance={b} style={cardStyleFor(b.leaveTypeCode, primary.length + i)} compact />
                </button>
              ))}
          </div>
          {secondary.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-mitra-accentFrom"
            >
              <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${showAll ? 'rotate-180' : ''}`} />
              {showAll ? 'Show fewer leave types' : `Show ${secondary.length} more leave type${secondary.length === 1 ? '' : 's'}`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
