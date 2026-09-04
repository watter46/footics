'use client';

import { ExportBenchmarkOverlay } from './export-benchmark-overlay';
import { ExportModalBody } from './export-modal-body';
import { ExportModalFooter } from './export-modal-footer';
import { ExportModalHeader } from './export-modal-header';
import { ExportShareOverlay } from './export-share-overlay';
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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm select-none p-4"
      onClick={(e) =>
        !isExporting && e.target === e.currentTarget && closeExportModal()
      }
      onKeyDown={(e) =>
        !isExporting && e.key === 'Escape' && closeExportModal()
      }
    >
      <div className="relative w-full max-w-4xl rounded-2xl bg-[#121212] border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <ExportModalHeader
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isCompleted={Boolean(completedVideo)}
          isExporting={isExporting}
          onClose={closeExportModal}
        />

        {exportError && !completedVideo && (
          <div className="px-6 py-3 bg-red-500/15 border-b border-red-500/30 text-xs text-red-300 flex items-center justify-between">
            <span>⚠️ {exportError}</span>
            <button
              type="button"
              onClick={() => setExportError(null)}
              className="text-red-300/70 hover:text-red-200 text-[11px] underline ml-3 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <ExportShareOverlay
          shareUrl={share.shareUrl}
          qrCodeDataUrl={share.qrCodeDataUrl}
          onClose={share.clearShareLink}
        />
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

        {!completedVideo && !benchmark.isBenchmarking && !share.shareUrl && (
          <ExportModalFooter state={state} />
        )}
      </div>
    </div>
  );
}
