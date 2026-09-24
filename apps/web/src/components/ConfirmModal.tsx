import { ReactNode } from 'react';
import { AlertTriangleIcon, XIcon } from './icons';

// Small reusable confirm/delete dialog — replaces every hand-rolled
// `window.confirm(...)` across Master Data (and available to any other
// page that wants the same tactile, on-brand confirmation instead of the
// browser's native dialog).
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  danger = true,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl shadow-slate-900/20 max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              danger ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
            }`}
          >
            <AlertTriangleIcon className="w-5 h-5" />
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-800">{title}</h3>
            <div className="text-sm text-slate-500 mt-1">{message}</div>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 shadow-sm transition-all ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-mitra-accentFrom hover:opacity-90'
            }`}
          >
            {busy ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
