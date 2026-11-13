'use client';

import { useState } from 'react';
import {
  exportAllSlidesZip,
  exportSingleSlidePng,
} from '@/features/tactical-unified/hooks/konva-export-helpers';
import {
  exportTacticalProjectToJson,
  importTacticalProjectFromJson,
} from '@/features/tactical-unified/hooks/use-project-json-io';
import {
  selectDomainActiveBoundaryBox,
  selectDomainActivePhase,
  selectDomainActivePhaseAspectRatio,
  selectDomainActivePhaseSlides,
  selectDomainActiveSlide,
} from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { normalizeTacticalProject } from '@/lib/tactical/acl/legacy-project-translator';
import { useExportShare } from './use-export-share';

export type ExportTab = 'video' | 'image' | 'json';
export type ExportFormat = 'png' | 'zip';

export function useExportModalState() {
  const closeExportModal = useSessionStore((s) => s.closeExportModal);
  const isExporting = useSessionStore((s) => s.isExporting);
  const setIsExporting = useSessionStore((s) => s.setIsExporting);
  const pendingExport = useSessionStore((s) => s.pendingExport);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const setActivePhaseId = useSessionStore((s) => s.setActivePhaseId);
  const setActiveSlideId = useSessionStore((s) => s.setActiveSlideId);
  const teamVisibility = useSessionStore((s) => s.teamVisibility);
  const project = useDocumentStore((s) => s.project);
  const loadProject = useDocumentStore((s) => s.loadProject);
  const activeSlide = selectDomainActiveSlide(
    project,
    activePhaseId,
    activeSlideId,
  );
  const activePhase = selectDomainActivePhase(project, activePhaseId);
  const slides = selectDomainActivePhaseSlides(project, activePhaseId);
  const aspectRatio = selectDomainActivePhaseAspectRatio(
    project,
    activePhaseId,
  );
  const boundaryBox = selectDomainActiveBoundaryBox(project, activePhaseId);
  const pitchAppearance = project.pitchAppearance;
  const screenBackground = project.screenBackground;

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
          boundaryBox,
          pitchTransform: activeSlide?.pitchTransform ?? null,
          directorCamera: activePhase?.directorCamera ?? null,
          pitchAppearance,
          screenBackground,
          teamVisibility,
        });
        closeExportModal();
      } else if (selectedFormat === 'zip') {
        if (slides.length === 0)
          throw new Error('No slides available to export');
        await exportAllSlidesZip({
          slides,
          aspectRatio,
          scale: imageScale,
          boundaryBox,
          pitchTransform: activeSlide?.pitchTransform ?? null,
          directorCamera: activePhase?.directorCamera ?? null,
          pitchAppearance,
          screenBackground,
          teamVisibility,
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

  const exportJson = () => {
    exportTacticalProjectToJson(project);
  };

  const importJson = async (file: File) => {
    const imported = await importTacticalProjectFromJson(file, false);
    const bundle = normalizeTacticalProject(imported);
    loadProject(bundle.project);
    setActivePhaseId(bundle.activePhaseId);
    setActiveSlideId(bundle.activeSlideId);
    return bundle.project.title ?? 'Untitled';
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
    exportJson,
    importJson,
    share,
    isExporting,
    closeExportModal,
    activeSlide,
    slides,
    aspectRatio,
    boundaryBox,
    pitchAppearance,
  };
}
export type ExportModalState = ReturnType<typeof useExportModalState>;
