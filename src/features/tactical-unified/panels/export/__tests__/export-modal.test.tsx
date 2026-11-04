import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as konvaExportHelpers from '@/features/tactical-unified/hooks/konva-export-helpers';
import { TacticalUnifiedStoreProvider } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { ExportModal } from '../export-modal';

vi.mock('@/features/tactical-unified/hooks/konva-export-helpers', () => ({
  exportSingleSlidePng: vi.fn().mockResolvedValue(undefined),
  exportAllSlidesZip: vi.fn().mockResolvedValue(undefined),
}));

function createMock2DContext(): Partial<CanvasRenderingContext2D> {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    strokeRect: vi.fn(),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 50 }),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    drawImage: vi.fn(),
    clip: vi.fn(),
    setLineDash: vi.fn(),
    getLineDash: vi.fn().mockReturnValue([]),
  };
}

describe('ExportModal Fullscreen & Compact Bottom Bar', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    const mockCtx = createMock2DContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      mockCtx as unknown as CanvasRenderingContext2D,
    );
  });

  const baseSlide = {
    id: 'slide-1',
    index: 0,
    name: 'Slide 1',
    durationMs: 2000,
    boundaryBox: null,
    pitchTransform: null,
    players: [],
    balls: [],
    zones: [],
    arrows: [],
    texts: [],
  };

  const createInitialState = (slideOverrides = {}) => {
    const slide = { ...baseSlide, ...slideOverrides };
    return {
      isExportModalOpen: true,
      pendingExport: {
        format: 'png' as const,
        scope: 'current' as const,
        scale: 2,
      },
      activeSlideId: slide.id,
      project: {
        id: 'proj-1',
        title: 'Tactics A',
        version: '2.0.0',
        matchId: 'match-1',
        aspectRatio: '16:9' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activePhaseId: 'phase-1',
        activeSlideId: slide.id,
        phases: [
          {
            id: 'phase-1',
            name: 'Phase 1',
            slides: [slide as any],
          },
        ],
      } as any,
    };
  };

  it('完全全画面スタイル (w-screen h-screen rounded-none 等) を持つダイアログとしてレンダリングされること', async () => {
    let renderResult: any;
    await act(async () => {
      renderResult = render(
        <TacticalUnifiedStoreProvider initialState={createInitialState()}>
          <ExportModal />
        </TacticalUnifiedStoreProvider>,
      );
    });

    const dialog = renderResult.baseElement.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog?.className).toContain('w-screen');
    expect(dialog?.className).toContain('max-w-none');
    expect(dialog?.className).toContain('h-screen');
    expect(dialog?.className).toContain('max-h-none');
    expect(dialog?.className).toContain('rounded-none');
    expect(dialog?.className).toContain('border-none');

    // 左右分割 (grid-cols-12, md:col-span-6) が撤廃されていること
    expect(
      renderResult.baseElement.querySelector('.md\\:col-span-6'),
    ).toBeNull();
  });

  it('境界線有効時にプレビュー枠のアスペクト比スタイルが連動し、Boundary Croppedバッジが表示されること', async () => {
    let renderResult: any;
    await act(async () => {
      renderResult = render(
        <TacticalUnifiedStoreProvider
          initialState={createInitialState({
            boundaryBox: {
              enabled: true,
              x: 20,
              y: 10,
              width: 40,
              height: 30,
            },
          })}
        >
          <ExportModal />
        </TacticalUnifiedStoreProvider>,
      );
    });

    // Boundary Croppedバッジ
    expect(renderResult.getByText('Boundary Cropped')).toBeDefined();

    // プレビュー枠の aspectRatio が 768 / 328 (1920*0.4 / 8px-aligned(1080*0.3)) に連動していること
    const previewContainer = renderResult.baseElement.querySelector(
      '[data-testid="export-preview-viewport"]',
    );
    expect(previewContainer).toBeTruthy();
    expect((previewContainer as HTMLElement).style.aspectRatio).toBe(
      '768 / 328',
    );
  });

  it('下部1行バーからフォーマット切替（ZIP）と解像度変更（4x）を行いエクスポートを実行できること', async () => {
    const exportZipSpy = vi.spyOn(konvaExportHelpers, 'exportAllSlidesZip');

    let renderResult: any;
    await act(async () => {
      renderResult = render(
        <TacticalUnifiedStoreProvider initialState={createInitialState()}>
          <ExportModal />
        </TacticalUnifiedStoreProvider>,
      );
    });

    // 下部バーに再生/シークバーが存在すること
    expect(
      renderResult.getByRole('button', { name: /play preview/i }),
    ).toBeDefined();

    // フォーマットを ZIP に変更
    const zipBtn = renderResult.getByRole('button', { name: /zip/i });
    await act(async () => {
      fireEvent.click(zipBtn);
    });

    // 解像度を 4x に変更
    const scale4xBtn = renderResult.getByRole('button', { name: /4x/i });
    await act(async () => {
      fireEvent.click(scale4xBtn);
    });

    // エクスポート実行ボタン
    const exportBtn = renderResult.getByRole('button', {
      name: /Start ZIP Export/i,
    });
    await act(async () => {
      fireEvent.click(exportBtn);
    });

    expect(exportZipSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        scale: 4,
      }),
    );
  });
});
