import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TacticalStoreProvider } from '@/features/tactical-unified/stores/tactical-store-provider';
import { normalizeTacticalProject } from '@/lib/tactical/acl/legacy-project-translator';
import {
  DEFAULT_BOUNDARY_BOX_4_5,
  DEFAULT_PITCH_APPEARANCE,
  type ScreenBackgroundConfig,
} from '@/lib/types/tactical/pitch-config';
import { ExportModalBody } from '../export-modal-body';
import type { ExportModalState } from '../use-export-modal-state';

function createMock2DContext() {
  const gradientStub = { addColorStop: vi.fn() };
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    shadowColor: 'rgba(0, 0, 0, 0)',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    drawImage: vi.fn(),
    createLinearGradient: vi.fn(() => gradientStub),
    createRadialGradient: vi.fn(() => gradientStub),
    setLineDash: vi.fn(),
    getLineDash: vi.fn(() => []),
  };
}

describe('ExportModalBody screenBackground transmission', () => {
  let mockCtx: ReturnType<typeof createMock2DContext>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCtx = createMock2DContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      mockCtx as unknown as CanvasRenderingContext2D,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockScreenBackground: ScreenBackgroundConfig = {
    type: 'cinematic',
  };

  const createMockState = (): ExportModalState => {
    const activeSlide = {
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
    } as any;
    return {
      activeTab: 'image',
      setActiveTab: vi.fn(),
      selectedFormat: 'png',
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

  it('passes project.screenBackground to ExportPreviewPlayer', () => {
    const bundle = normalizeTacticalProject({
      id: 'proj-1',
      title: 'Tactics Test',
      screenBackground: mockScreenBackground,
      phases: [
        {
          id: 'phase-1',
          name: 'Phase 1',
          aspectRatio: '4:5',
          slides: [{ id: 'slide-1', index: 0 }],
        },
      ],
    });

    const { container } = render(
      <TacticalStoreProvider
        initialProject={bundle.project}
        initialSession={{
          activePhaseId: bundle.activePhaseId,
          activeSlideId: bundle.activeSlideId,
        }}
      >
        <ExportModalBody state={createMockState()} />
      </TacticalStoreProvider>,
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(mockCtx.createRadialGradient).toHaveBeenCalled();
    expect(mockCtx.fillRect).toHaveBeenCalled();
  });
});
