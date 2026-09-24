import { DragEvent, useRef, useState } from 'react';
import { UploadCloudIcon, XIcon } from './icons';

interface Props {
  file: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  hint?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// A styled drag-and-drop dropzone standing in for a plain <input type=file>
// — used for optional supporting-document uploads (Leaves & Attendance
// polish round). Still a real file input underneath (click-to-browse works
// identically); once a file is chosen it swaps to a compact preview with a
// remove button instead of the drop target.
export default function FileDropzone({ file, onChange, accept, hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) onChange(dropped);
  }

  if (file) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <UploadCloudIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-slate-700 truncate">{file.name}</p>
            <p className="text-xs text-slate-400">{formatSize(file.size)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            if (inputRef.current) inputRef.current.value = '';
          }}
          className="text-slate-400 hover:text-red-500 flex-shrink-0"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-5 text-center cursor-pointer transition-colors ${
        dragActive ? 'border-mitra-accentFrom bg-mitra-accentFrom/5' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
      }`}
    >
      <UploadCloudIcon className={`w-5 h-5 ${dragActive ? 'text-mitra-accentFrom' : 'text-slate-400'}`} />
      <p className="text-xs text-slate-500">
        <span className="font-medium text-mitra-accentFrom">Click to upload</span> or drag and drop
      </p>
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
    </div>
  );
}
