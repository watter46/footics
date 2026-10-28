'use client';

import { FlaskConical, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
            <Button
              variant="outline"
              size="sm"
              onClick={share.createShareLink}
              disabled={isBusy}
              title="iPhone（PWA）にプロジェクトを送信し、iPhone側で高速出力"
              icon={
                share.isCreatingShareLink ? (
                  <span className="w-3 h-3 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
                ) : (
                  <Smartphone size={14} />
                )
              }
              className="border-emerald-500/30 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-300 hover:text-emerald-200"
            >
              <span>iPhoneに送信</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => benchmark.runBenchmark('quick')}
              disabled={isBusy}
              title="上位有力4パターンを高速計測"
              icon={<FlaskConical size={14} />}
              className="border-blue-500/30 bg-blue-600/10 hover:bg-blue-600/20 text-blue-300 hover:text-blue-200"
            >
              <span>⚡ Quick Test</span>
            </Button>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="md"
          onClick={closeExportModal}
          disabled={isBusy}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleExport}
          disabled={isBusy}
          className="min-w-[140px]"
          icon={
            isExporting ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : undefined
          }
        >
          {isExporting ? (
            <span>Exporting...</span>
          ) : (
            <span>Start {selectedFormat.toUpperCase()} Export</span>
          )}
        </Button>
      </div>
    </div>
  );
}
