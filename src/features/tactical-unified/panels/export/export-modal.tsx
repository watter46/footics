'use client';

import { Dialog } from '@/components/ui/dialog';
import { ExportBenchmarkOverlay } from './export-benchmark-overlay';
import { ExportModalBody } from './export-modal-body';
import { ExportModalFooter } from './export-modal-footer';
import { ExportModalHeader } from './export-modal-header';
import { ExportVideoPlayer } from './export-video-player';
import { type ExportTab, useExportModalState } from './use-export-modal-state';

export function ExportModal() {
  const state = useExportModalState();
  const {
    activeTab,
    setActiveTab,
    selectedFormat,
    setSelectedFormat,
    completedVideo,
    exportError,
    setExportError,
    benchmark,
    share,
    isExporting,
    closeExportModal,
  } = state;

  const handleTabChange = (tab: ExportTab) => {
    setActiveTab(tab);
    if (
      tab === 'image' &&
      selectedFormat !== 'png' &&
      selectedFormat !== 'zip'
    ) {
      setSelectedFormat('png');
    }
    if (
      tab === 'video' &&
      (selectedFormat === 'png' || selectedFormat === 'zip')
    ) {
      setSelectedFormat('mp4');
    }
  };

  return (
    <Dialog
      open={true}
      onClose={isExporting ? undefined : closeExportModal}
      className="max-w-4xl p-0 overflow-hidden flex flex-col max-h-[90vh] space-y-0 select-none"
    >
      <div className="relative w-full flex flex-col h-full overflow-hidden">
        <ExportModalHeader
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isCompleted={Boolean(completedVideo)}
          isExporting={isExporting}
          onClose={closeExportModal}
        />

        {exportError && !completedVideo && (
          <div className="px-6 py-3 bg-[#EB3B5A]/15 border-b border-[#EB3B5A]/30 text-xs text-[#EB3B5A] flex items-center justify-between">
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

        <ExportBenchmarkOverlay
          isBenchmarking={benchmark.isBenchmarking}
          progress={benchmark.benchmarkProgress}
          report={benchmark.benchmarkReport}
          copiedReport={benchmark.copiedReport}
          onCancel={benchmark.cancelBenchmark}
          onCopyReport={benchmark.copyReport}
          onClearReport={benchmark.clearReport}
        />

        {completedVideo ? (
          <div className="p-6 overflow-y-auto">
            <ExportVideoPlayer
              videoBlob={completedVideo.blob}
              filename={completedVideo.filename}
              onDownload={state.handleDownloadCompletedVideo}
              onReExport={state.handleReExport}
            />
          </div>
        ) : (
          <ExportModalBody state={state} />
        )}

        {!completedVideo && !benchmark.isBenchmarking && (
          <ExportModalFooter state={state} />
        )}
      </div>
    </Dialog>
  );
}
