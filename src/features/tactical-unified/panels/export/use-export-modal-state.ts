'use client';

import { useState } from 'react';
import {
  exportAllSlidesZip,
  exportSingleSlidePng,
} from '@/features/tactical-unified/hooks/konva-export-helpers';
import {
  selectActivePhaseSlides,
  selectActiveSlide,
} from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { useExportShare } from './use-export-share';

export type ExportTab = 'video' | 'image' | 'json';
export type ExportFormat = 'png' | 'zip';

export function useExportModalState() {
  const closeExportModal = useTacticalUnifiedStoreContext(
    (s) => s.closeExportModal,
  );
  const isExporting = useTacticalUnifiedStoreContext((s) => s.isExporting);
  const setIsExporting = useTacticalUnifiedStoreContext(
    (s) => s.setIsExporting,
  );
  const pendingExport = useTacticalUnifiedStoreContext((s) => s.pendingExport);
  const activeSlide = useTacticalUnifiedStoreContext(selectActiveSlide);
  const slides = useTacticalUnifiedStoreContext(selectActivePhaseSlides);
  const aspectRatio = useTacticalUnifiedStoreContext(
    (s) => s.project.aspectRatio,
  );
  const pitchAppearance = useTacticalUnifiedStoreContext(
    (s) => s.project.pitchAppearance,
  );

  const initFmt = pendingExport?.format;
  const [activeTab, setActiveTab] = useState<ExportTab>(
    initFmt === 'png' || initFmt === 'zip' ? 'image' : 'video',
  );
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(
    initFmt === 'zip' ? 'zip' : 'png',
  );
  const [imageScale, setImageScale] = useState<number>(2);
  const [exportError, setExportError] = useState<string | null>(null);

  const share = useExportShare({ onError: setExportError });

  const handleExport = async () => {
    setExportError(null);
    setIsExporting(true);

    try {
      if (selectedFormat === 'png') {
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
        err instanceof Error ? err.message : 'Export failed. Please try again.';
      setExportError(msg);
    } finally {
      setIsExporting(false);
    }
  };

  return {
    activeTab,
    setActiveTab,
    selectedFormat,
    setSelectedFormat,
    imageScale,
    setImageScale,
    exportError,
    setExportError,
    handleExport,
    share,
    isExporting,
    closeExportModal,
    activeSlide,
    slides,
    aspectRatio,
    pitchAppearance,
  };
}
export type ExportModalState = ReturnType<typeof useExportModalState>;
