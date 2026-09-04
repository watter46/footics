'use client';

import { CheckCircle2, Copy, FlaskConical, X } from 'lucide-react';
import type { BenchmarkProgress } from '@/lib/tactical/export/auto-benchmark-engine';

interface ExportBenchmarkOverlayProps {
  isBenchmarking: boolean;
  progress: BenchmarkProgress | null;
  report: string | null;
  copiedReport: boolean;
  onCancel: () => void;
  onCopyReport: () => void;
  onClearReport: () => void;
}

export function ExportBenchmarkOverlay({
  isBenchmarking,
  progress,
  report,
  copiedReport,
  onCancel,
  onCopyReport,
  onClearReport,
}: ExportBenchmarkOverlayProps) {
  if (isBenchmarking && progress) {
    return (
      <div className="p-6 space-y-4 bg-blue-950/20 border-b border-blue-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical size={18} className="text-blue-400 animate-pulse" />
            <span className="text-sm font-semibold text-white">
              Running Auto Matrix Benchmark...
            </span>
          </div>
          <span className="text-xs font-mono text-blue-300">
            Pattern {progress.currentIndex} / {progress.totalPatterns} (
            {progress.currentPercent}%)
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300 rounded-full"
            style={{ width: `${progress.currentPercent}%` }}
          />
        </div>
        <p className="text-xs text-white/70 font-mono">
          {progress.statusMessage}
        </p>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 text-xs hover:bg-red-500/10 cursor-pointer"
          >
            Stop Benchmark
          </button>
        </div>
      </div>
    );
  }

  if (report && !isBenchmarking) {
    return (
      <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh] bg-black/40 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              Auto Benchmark Complete!
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCopyReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium cursor-pointer transition-colors shadow"
            >
              <Copy size={14} />
              <span>
                {copiedReport ? 'Copied to Clipboard!' : 'Copy Markdown Report'}
              </span>
            </button>
            <button
              type="button"
              onClick={onClearReport}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-black/80 border border-white/10 text-xs font-mono text-white/90 whitespace-pre-wrap leading-relaxed select-text overflow-x-auto max-h-[400px]">
          {report}
        </div>
      </div>
    );
  }

  return null;
}
