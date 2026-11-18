import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TacticalStoreProvider } from '@/features/tactical-unified/stores/tactical-store-provider';
import { normalizeTacticalProject } from '@/lib/tactical/acl/legacy-project-translator';
import * as phaseFrameRenderer from '@/lib/tactical/export/tactical-phase-frame-renderer';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import {
  DEFAULT_BOUNDARY_BOX_4_5,
  DEFAULT_PITCH_APPEARANCE,
} from '@/lib/types/tactical/pitch-config';
import { ExportModalBody } from '../export-modal-body';
import type { ExportModalState } from '../use-export-modal-state';

describe('ExportModalBody & ExportPreviewPlayer camera sync', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const slidePitchTransform: NonNullable<DomainSlide['pitchTransform']> = {
    panX: 120,
    panY: -80,
    zoom: 1.4,
    tilt: 15,
    isLocked: false,
  };

  const createState = (
    pitchTransform: DomainSlide['pitchTransform'],
  ): ExportModalState => {
    const activeSlide: DomainSlide = {
      id: 'slide-1',
      index: 0,
      transitionDurationMs: 1000,
      pauseMs: 0,
      easing: 'ease-in-out',
      players: [],
      arrows: [],
      zones: [],
      texts: [],
      ball: {
        x: 50 as DomainSlide['ball']['x'],
        y: 50 as DomainSlide['ball']['y'],
        visible: true,
      },
      pitchTransform,
    };

    return {
      activeTab: 'video',
      setActiveTab: vi.fn(),
      selectedFormat: 'video' as ExportModalState['selectedFormat'],
      setSelectedFormat: vi.fn(),
      imageScale: 2,
      setImageScale: vi.fn(),
      exportError: null,
      setExportError: vi.fn(),
      activeSlide,
      slides: [activeSlide],
      aspectRatio: '4:5',
      boundaryBox: DEFAULT_BOUNDARY_BOX_4_5,
      pitchAppearance: DEFAULT_PITCH_APPEARANCE,
      isExporting: false,
      closeExportModal: vi.fn(),
      handleExport: vi.fn(),
      exportJson: vi.fn(),
      importJson: vi.fn().mockResolvedValue('Untitled'),
      share: {
        isCreatingShareLink: false,
        shareUrl: null,
        createShareLink: vi.fn().mockResolvedValue(undefined),
        clearShareLink: vi.fn(),
      },
    };
  };

  it('case 1: evaluates directorCamera without pitchTransform override and updates across seek times', () => {
    const renderSpy = vi
      .spyOn(phaseFrameRenderer, 'renderTacticalPhaseFrameToCanvas')
      .mockImplementation(() => {});

    const directorCamera = {
      globalKeyframes: [
        {
          id: 'kf-0',
          timeMs: 0,
          zoom: 1,
          focusPoint: { x: 0.5, y: 0.5 },
          tilt: 0,
          yaw: 0,
        },
        {
          id: 'kf-1',
          timeMs: 1000,
          zoom: 1.2,
          focusPoint: { x: 0.5, y: 0.5 },
          tilt: 35,
          yaw: 0,
        },
      ],
      actionCues: [],
    };

    const bundle = normalizeTacticalProject({
      id: 'proj-cam-sync-1',
      title: 'Camera Sync Test',
      phases: [
        {
          id: 'phase-1',
          name: 'Phase 1',
          aspectRatio: '4:5',
          directorCamera,
          slides: [
            {
              id: 'slide-1',
              index: 0,
              transitionDurationMs: 1000,
              pauseMs: 0,
              pitchTransform: slidePitchTransform,
            },
          ],
        },
      ],
    });

    render(
      <TacticalStoreProvider
        initialProject={bundle.project}
        initialSession={{
          activePhaseId: bundle.activePhaseId,
          activeSlideId: bundle.activeSlideId,
        }}
      >
        <ExportModalBody state={createState(slidePitchTransform)} />
      </TacticalStoreProvider>,
    );

    const normalizedDirectorCamera = bundle.project.phases[0].directorCamera;
    expect(renderSpy).toHaveBeenCalled();
    const firstCall = renderSpy.mock.calls.at(-1)?.[0];
    expect(firstCall?.pitchTransform).toBeNull();
    expect(firstCall?.directorCamera).toEqual(normalizedDirectorCamera);

    const initialCallCount = renderSpy.mock.calls.length;
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '1000' } });

    expect(renderSpy.mock.calls.length).toBeGreaterThan(initialCallCount);
    const seekedCall = renderSpy.mock.calls.at(-1)?.[0];
    expect(seekedCall?.pitchTransform).toBeNull();
    expect(seekedCall?.directorCamera).toEqual(normalizedDirectorCamera);
  });

  it('case 2: preserves activeSlide.pitchTransform when directorCamera is empty', () => {
    const renderSpy = vi
      .spyOn(phaseFrameRenderer, 'renderTacticalPhaseFrameToCanvas')
      .mockImplementation(() => {});

    const bundle = normalizeTacticalProject({
      id: 'proj-cam-sync-2',
      title: 'No Director Camera Test',
      phases: [
        {
          id: 'phase-1',
          name: 'Phase 1',
          aspectRatio: '4:5',
          directorCamera: {
            globalKeyframes: [],
            actionCues: [],
          },
          slides: [
            {
              id: 'slide-1',
              index: 0,
              pitchTransform: slidePitchTransform,
            },
          ],
        },
      ],
    });

    render(
      <TacticalStoreProvider
        initialProject={bundle.project}
        initialSession={{
          activePhaseId: bundle.activePhaseId,
          activeSlideId: bundle.activeSlideId,
        }}
      >
        <ExportModalBody state={createState(slidePitchTransform)} />
      </TacticalStoreProvider>,
    );

    expect(renderSpy).toHaveBeenCalled();
    const lastCall = renderSpy.mock.calls.at(-1)?.[0];
    expect(lastCall?.pitchTransform).toEqual(slidePitchTransform);
  });
});
