'use client';

import { FlaskConical, Smartphone } from 'lucide-react';
import type { ExportModalState } from './use-export-modal-state';

interface ExportModalFooterProps {
  state: ExportModalState;
}

export function ExportModalFooter({ state }: ExportModalFooterProps) {
  const {
    activeTab,
    isExporting,
    benchmark,
    share,
    closeExportModal,
    handleExport,
    selectedFormat,
  } = state;

  if (activeTab === 'json') return null;

  const isBusy =
    isExporting || benchmark.isBenchmarking || share.isCreatingShareLink;

  return (
    <div className="px-6 py-4 border-t border-white/10 shrink-0 flex items-center justify-between gap-3 bg-white/[0.01]">
      <div className="flex items-center gap-2">
        {activeTab === 'video' && (
          <>
            <button
              type="button"
              onClick={share.createShareLink}
              disabled={isBusy}
              title="iPhoneでQRコードを読み取り、HWエンコーダで高速出力"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-600/10 hover:bg-emerald-600/20 text-xs text-emerald-300 font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {share.isCreatingShareLink ? (
                <span className="w-3 h-3 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
              ) : (
                <Smartphone size={14} />
              )}
              <span>iPhone Export</span>
            </button>
            <button
              type="button"
              onClick={() => benchmark.runBenchmark('quick')}
              disabled={isBusy}
              title="上位有力4パターンを高速計測"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-500/30 bg-blue-600/10 hover:bg-blue-600/20 text-xs text-blue-300 font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FlaskConical size={14} />
              <span>⚡ Quick Test</span>
            </button>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={closeExportModal}
          disabled={isBusy}
          className="px-5 py-2.5 rounded-xl border border-white/15 text-xs font-medium text-white/70 hover:text-white hover:border-white/30 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={isBusy}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs text-white font-semibold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 min-w-[140px]"
        >
          {isExporting ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Exporting...</span>
            </>
          ) : (
            <span>Start {selectedFormat.toUpperCase()} Export</span>
          )}
        </button>
      </div>
    </div>
  );
}
