import { useState } from 'react';
import {
  exportAllSlidesZip,
  exportSingleSlidePng,
} from '@/features/tactical-unified/hooks/konva-export-helpers';
import {
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import { exportMultiSlideVideo } from '@/lib/tactical/export/tactical-video-exporter';
import { useExportBenchmark } from './use-export-benchmark';
import { useExportEventListener } from './use-export-event-listener';
import { useExportShare } from './use-export-share';
import { useVideoMorphingConfig } from './use-video-morphing-config';

export type ExportTab = 'video' | 'image' | 'json';
export type ExportFormat = 'png' | 'zip' | 'mp4' | 'webm';

export function useExportModalState() {
  const closeExportModal = useTacticalUnifiedStore((s) => s.closeExportModal);
  const isExporting = useTacticalUnifiedStore((s) => s.isExporting);
  const setIsExporting = useTacticalUnifiedStore((s) => s.setIsExporting);
  const pendingExport = useTacticalUnifiedStore((s) => s.pendingExport);
  const activeSlide = useTacticalUnifiedStore(selectActiveSlide);
  const slides = useTacticalUnifiedStore((s) => s.project.slides);
  const aspectRatio = useTacticalUnifiedStore((s) => s.project.aspectRatio);

  const initFmt = pendingExport?.format ?? 'mp4';
  const [activeTab, setActiveTab] = useState<ExportTab>(
    initFmt === 'png' || initFmt === 'zip' ? 'image' : 'video',
  );
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(initFmt);
  const [imageScale, setImageScale] = useState<number>(2);
  const [maxQueueSize, setMaxQueueSize] = useState<'60' | '240'>('60');
  const [keyFrameIntervalSec, setKeyFrameIntervalSec] = useState<
    '1' | '2' | '5' | '10'
  >('2');
  const [latencyMode, setLatencyMode] = useState<'realtime' | 'quality'>(
    'realtime',
  );

  const morphing = useVideoMorphingConfig();
  const { completedVideo, setCompletedVideo, exportError, setExportError } =
    useExportEventListener();

  const benchmark = useExportBenchmark({
    slides,
    format: selectedFormat === 'webm' ? 'webm' : 'mp4',
    aspectRatio,
    boundaryBox: activeSlide?.boundaryBox,
    isExporting,
    onError: setExportError,
  });

  const share = useExportShare({ onError: setExportError });

  const handleExport = async () => {
    setCompletedVideo(null);
    setExportError(null);
    setIsExporting(true);

    try {
      if (selectedFormat === 'mp4' || selectedFormat === 'webm') {
        const filename = `tactical-animation-${Date.now()}.${selectedFormat}`;
        const blob = await exportMultiSlideVideo({
          slides,
          format: selectedFormat,
          scale: imageScale,
          aspectRatio,
          boundaryBox: activeSlide?.boundaryBox,
          keyFrameIntervalSec: Number(keyFrameIntervalSec) || 2,
          latencyMode,
          maxQueueSize: Number(maxQueueSize) || 60,
          transitionDurationMs: Math.round(
            Number.parseFloat(morphing.transitionSec) * 1000,
          ),
          pauseMs: Math.round(Number.parseFloat(morphing.pauseSec) * 1000),
          easing: morphing.selectedEasing,
        });
        setCompletedVideo({ blob, filename });
      } else if (selectedFormat === 'png') {
        const slideToExport = activeSlide ?? slides[0];
        if (!slideToExport) throw new Error('No slides available to export');
        await exportSingleSlidePng({
          slide: slideToExport,
          aspectRatio,
          scale: imageScale,
          boundaryBox: slideToExport.boundaryBox,
        });
        closeExportModal();
      } else if (selectedFormat === 'zip') {
        if (slides.length === 0)
          throw new Error('No slides available to export');
        await exportAllSlidesZip({
          slides,
          aspectRatio,
          scale: imageScale,
        });
        closeExportModal();
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Video export failed. Please try again.';
      setExportError(msg);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadCompletedVideo = () => {
    if (!completedVideo) return;
    const url = URL.createObjectURL(completedVideo.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = completedVideo.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReExport = () => {
    setCompletedVideo(null);
    setExportError(null);
    benchmark.clearReport();
  };

  return {
    activeTab,
    setActiveTab,
    selectedFormat,
    setSelectedFormat,
    imageScale,
    setImageScale,
    maxQueueSize,
    setMaxQueueSize,
    keyFrameIntervalSec,
    setKeyFrameIntervalSec,
    latencyMode,
    setLatencyMode,
    morphing,
    completedVideo,
    exportError,
    setExportError,
    handleExport,
    handleDownloadCompletedVideo,
    handleReExport,
    benchmark,
    share,
    isExporting,
    closeExportModal,
    activeSlide,
    slides,
    aspectRatio,
  };
}
export type ExportModalState = ReturnType<typeof useExportModalState>;
