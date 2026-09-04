'use client';

import { useState } from 'react';
import {
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import type { ExportTarget } from '@/lib/types/tactical-unified';
import { buildExportTarget } from './export-target-builder';
import { useExportBenchmark } from './use-export-benchmark';
import { useExportEventListener } from './use-export-event-listener';
import { useExportShare } from './use-export-share';
import { useVideoMorphingConfig } from './use-video-morphing-config';

export type ExportTab = 'video' | 'image' | 'json';
export type ExportFormat = ExportTarget['format'];

export function useExportModalState() {
  const closeExportModal = useTacticalUnifiedStore((s) => s.closeExportModal);
  const isExporting = useTacticalUnifiedStore((s) => s.isExporting);
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

  const handleExport = () => {
    setCompletedVideo(null);
    setExportError(null);
    const detail = buildExportTarget({
      format: selectedFormat,
      scale: imageScale,
      keyFrameIntervalSec,
      latencyMode,
      maxQueueSize,
    });
    window.dispatchEvent(new CustomEvent('tactical:export', { detail }));
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
