'use client';

import { Dialog } from '@/components/ui/dialog';
import { ExportModalBody } from './export-modal-body';
import { ExportModalHeader } from './export-modal-header';
import { type ExportTab, useExportModalState } from './use-export-modal-state';

export function ExportModal() {
  const state = useExportModalState();
  const {
    activeTab,
    setActiveTab,
    selectedFormat,
    setSelectedFormat,
    exportError,
    setExportError,
    share,
    isExporting,
    closeExportModal,
  } = state;

  const isBusy = isExporting || share.isCreatingShareLink;

  const handleTabChange = (tab: ExportTab) => {
    setActiveTab(tab);
    if (
      tab === 'image' &&
      selectedFormat !== 'png' &&
      selectedFormat !== 'zip'
    ) {
      setSelectedFormat('png');
    }
  };

  return (
    <Dialog
      open={true}
      onClose={isBusy ? undefined : closeExportModal}
      className="w-screen max-w-none h-screen max-h-none p-0 m-0 rounded-none border-none overflow-hidden flex flex-col space-y-0 select-none"
    >
      <div className="relative w-full flex flex-col h-full overflow-hidden">
        <ExportModalHeader
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isCompleted={false}
          isExporting={isBusy}
          onClose={closeExportModal}
        />

        {exportError && (
          <div className="px-6 py-3 bg-[#EB3B5A]/15 border-b border-[#EB3B5A]/30 text-xs text-[#EB3B5A] flex items-center justify-between shrink-0">
            <span>⚠️ {exportError}</span>
            <button
              type="button"
              onClick={() => setExportError(null)}
              className="text-[#EB3B5A]/70 hover:text-[#EB3B5A] text-[11px] underline ml-3 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <ExportModalBody state={state} />
      </div>
    </Dialog>
  );
}
