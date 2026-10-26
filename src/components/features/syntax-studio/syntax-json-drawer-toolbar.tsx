'use client';

import { Check, Copy, Download, Sparkles, Upload } from 'lucide-react';
import type { ChangeEvent } from 'react';

export interface SyntaxJsonDrawerToolbarProps {
  copied: boolean;
  onLoadSample: () => void;
  onFileUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onCopyCurrent: () => void;
  onExportCurrent: () => void;
}

export function SyntaxJsonDrawerToolbar({
  copied,
  onLoadSample,
  onFileUpload,
  onCopyCurrent,
  onExportCurrent,
}: SyntaxJsonDrawerToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onLoadSample}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-gradient-to-r from-cyan-900/60 to-blue-900/60 hover:from-cyan-800/80 hover:to-blue-800/80 text-cyan-200 border border-cyan-700/50 font-medium transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Load 4-Phase Sample
        </button>

        <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer transition-colors">
          <Upload className="w-3.5 h-3.5" />
          Upload .json
          <input
            type="file"
            accept=".json,application/json"
            onChange={onFileUpload}
            className="hidden"
          />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCopyCurrent}
          className="inline-flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          title="Copy current dataset to clipboard"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          {copied ? 'Copied' : 'Copy'}
        </button>

        <button
          type="button"
          onClick={onExportCurrent}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
          title="Download full TuningDataset"
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
      </div>
    </div>
  );
}
