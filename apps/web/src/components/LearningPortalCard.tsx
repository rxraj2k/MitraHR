import { useState } from 'react';
import { LearningPortalCredential } from '../types';
import { ChevronDownIcon, ExternalLinkIcon, EyeIcon, KeyIcon } from './icons';

// One shared-account login card per learning portal (Udemy, CloudFoundation,
// SecApps...). The password is masked by default — this is a shared team
// credential, not a personal one, so a quick "reveal" toggle beats printing
// it in plain sight on a screen other people may glance at.
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard API unavailable — nothing to fall back to safely */
        }
      }}
      className="text-[11px] font-medium text-slate-400 hover:text-mitra-accentFrom flex-shrink-0"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export default function LearningPortalCard({ portal, theme }: { portal: LearningPortalCredential; theme: { bg: string; shadow: string } }) {
  const [revealed, setRevealed] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const hasNotes = !!portal.notes && portal.notes.length > 0;

  return (
    <div className={`rounded-2xl text-white p-4 ${theme.bg} ${theme.shadow}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <KeyIcon className="w-4 h-4" />
          </span>
          <h4 className="text-sm font-semibold truncate">{portal.name}</h4>
        </div>
        <a
          href={portal.loginUrl || portal.websiteUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-medium bg-white/20 hover:bg-white/30 rounded-full px-2.5 py-1 flex-shrink-0"
        >
          Open <ExternalLinkIcon className="w-3 h-3" />
        </a>
      </div>

      <div className="mt-3 space-y-1.5 bg-white/10 rounded-xl p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-white/70 flex-shrink-0">Username</span>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-mono truncate">{portal.username}</span>
            <CopyButton value={portal.username} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-white/70 flex-shrink-0">Password</span>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-mono truncate">{revealed ? portal.passwordNote : '••••••••••'}</span>
            <button
              type="button"
              onClick={() => setRevealed((r) => !r)}
              className="text-white/70 hover:text-white flex-shrink-0"
              aria-label={revealed ? 'Hide' : 'Reveal'}
            >
              <EyeIcon className="w-3.5 h-3.5" />
            </button>
            {revealed && <CopyButton value={portal.passwordNote} />}
          </div>
        </div>
      </div>

      {hasNotes && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setNotesOpen((o) => !o)}
            className="w-full flex items-center justify-between text-[11px] font-medium text-white/80 hover:text-white"
          >
            <span>How to log in ({portal.notes!.length})</span>
            <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${notesOpen ? 'rotate-180' : ''}`} />
          </button>
          {notesOpen && (
            <ul className="mt-1.5 space-y-0.5">
              {portal.notes!.map((n) => (
                <li key={n} className="text-[11px] text-white/80 flex gap-1">
                  <span>•</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
