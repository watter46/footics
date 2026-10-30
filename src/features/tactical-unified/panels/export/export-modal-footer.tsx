'use client';

import { Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ExportModalState } from './use-export-modal-state';

interface ExportModalFooterProps {
  state: ExportModalState;
}

export function ExportModalFooter({ state }: ExportModalFooterProps) {
  const {
    activeTab,
    isExporting,
    share,
    closeExportModal,
    handleExport,
    selectedFormat,
  } = state;

  if (activeTab === 'json') return null;

  const isBusy = isExporting || share.isCreatingShareLink;

  return (
    <div className="px-6 py-4 border-t border-white/10 shrink-0 flex items-center justify-between gap-3 bg-white/[0.01]">
      <div className="flex items-center gap-2" />

      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="md"
          onClick={closeExportModal}
          disabled={isBusy}
        >
          Cancel
        </Button>

        {activeTab === 'video' ? (
          <Button
            variant="primary"
            size="md"
            onClick={share.createShareLink}
            disabled={isBusy}
            className="min-w-[140px] bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white"
            icon={
              share.isCreatingShareLink ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Smartphone size={15} />
              )
            }
          >
            {share.isCreatingShareLink ? (
              <span>送信リンク生成中...</span>
            ) : (
              <span>iPhoneに送信</span>
            )}
          </Button>
        ) : (
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
        )}
      </div>
    </div>
  );
}
