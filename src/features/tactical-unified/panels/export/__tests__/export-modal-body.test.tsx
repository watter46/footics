import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TacticalUnifiedStoreProvider } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import {
  DEFAULT_BOUNDARY_BOX_4_5,
  type ScreenBackgroundConfig,
} from '@/lib/types/tactical-unified';
import { ExportModalBody } from '../export-modal-body';
import { ExportPreviewPlayer } from '../export-preview-player';
import type { ExportModalState } from '../use-export-modal-state';

vi.mock('../export-preview-player', () => ({
  ExportPreviewPlayer: vi.fn((props: any) => (
    <div
      data-testid="mock-export-preview-player"
      data-screen-bg-type={props.screenBackground?.type}
    />
  )),
}));

describe('ExportModalBody screenBackground transmission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockScreenBackground: ScreenBackgroundConfig = {
    type: 'cinematic',
  };

  const createMockState = (): ExportModalState => ({
    activeTab: 'image',
    setActiveTab: vi.fn(),
    selectedFormat: 'png',
    setSelectedFormat: vi.fn(),
    imageScale: 2,
    setImageScale: vi.fn(),
    exportError: null,
    setExportError: vi.fn(),
    activeSlide: {
      id: 'slide-1',
      index: 0,
      transitionDurationMs: 1000,
      pauseMs: 500,
      players: [],
      arrows: [],
      zones: [],
      texts: [],
      ball: { x: 50, y: 50, visible: true },
      boundaryBox: DEFAULT_BOUNDARY_BOX_4_5,
      pitchTransform: null,
    } as any,
    slides: [],
    aspectRatio: '4:5',
    boundaryBox: DEFAULT_BOUNDARY_BOX_4_5,
    pitchAppearance: undefined,
    isExporting: false,
    closeExportModal: vi.fn(),
    handleExport: vi.fn(),
    share: {
      isCreatingShareLink: false,
      shareUrl: null,
      createShareLink: vi.fn().mockResolvedValue(undefined),
      clearShareLink: vi.fn(),
    },
  });

  it('passes project.screenBackground to ExportPreviewPlayer', () => {
    const initialState = {
      project: {
        id: 'proj-1',
        title: 'Tactics Test',
        version: '2.0.0',
        aspectRatio: '4:5' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activePhaseId: 'phase-1',
        activeSlideId: 'slide-1',
        screenBackground: mockScreenBackground,
        phases: [
          {
            id: 'phase-1',
            name: 'Phase 1',
            slides: [],
          },
        ],
      } as any,
    };

    render(
      <TacticalUnifiedStoreProvider initialState={initialState}>
        <ExportModalBody state={createMockState()} />
      </TacticalUnifiedStoreProvider>,
    );

    expect(vi.mocked(ExportPreviewPlayer).mock.calls[0][0]).toEqual(
      expect.objectContaining({
        screenBackground: mockScreenBackground,
      }),
    );

    const playerEl = screen.getByTestId('mock-export-preview-player');
    expect(playerEl.getAttribute('data-screen-bg-type')).toBe('cinematic');
  });
});
