import { act, fireEvent, render } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanvasCoreHandle } from '@/features/tactical-unified/core';
import { TacticalUnifiedStoreProvider } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { TopBar } from '../top-bar';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('TopBar Copy with Ref Contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('Copyボタンクリック時に window.dispatchEvent を呼ばず、canvasRef.current.copyToClipboard() を呼ぶこと', async () => {
    const copyToClipboardMock = vi.fn().mockResolvedValue(undefined);
    const canvasRef = {
      current: {
        exportPng: vi.fn(),
        copyToClipboard: copyToClipboardMock,
        undo: vi.fn(),
        redo: vi.fn(),
        canUndo: vi.fn().mockReturnValue(false),
        canRedo: vi.fn().mockReturnValue(false),
      } as CanvasCoreHandle,
    } as React.RefObject<CanvasCoreHandle | null>;

    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

    const { getByRole } = render(<TopBar canvasRef={canvasRef} />);

    const copyButton = getByRole('button', { name: /^Copy$/i });
    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(dispatchEventSpy).not.toHaveBeenCalled();
    expect(copyToClipboardMock).toHaveBeenCalledTimes(1);
  });

  it('directorモード時に Copy ボタンを押下するとプレビューキャンバスからクリップボードAPI呼び出しとトースト表示が行われること', async () => {
    const writeMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { write: writeMock },
      configurable: true,
      writable: true,
    });

    class MockClipboardItem {
      constructor(public data: Record<string, Blob>) {}
    }
    vi.stubGlobal('ClipboardItem', MockClipboardItem);

    const canvas = document.createElement('canvas');
    canvas.toBlob = vi.fn((callback: (blob: Blob | null) => void) => {
      callback(new Blob(['fake-png-data'], { type: 'image/png' }));
    });
    document.body.appendChild(canvas);

    const { getByRole, findByText } = render(
      <TacticalUnifiedStoreProvider
        initialState={{ workspaceMode: 'director' }}
      >
        <TopBar />
      </TacticalUnifiedStoreProvider>,
    );

    const copyButton = getByRole('button', { name: /^Copy$/i });
    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(canvas.toBlob).toHaveBeenCalledTimes(1);
    expect(writeMock).toHaveBeenCalledTimes(1);
    expect(
      await findByText('📋 画像をクリップボードにコピーしました！'),
    ).toBeDefined();

    document.body.removeChild(canvas);
  });

  it('directorモード時に境界線が有効な場合、境界線領域をオフスクリーン切り抜きしてクリップボードにコピーすること', async () => {
    const writeMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { write: writeMock },
      configurable: true,
      writable: true,
    });

    class MockClipboardItem {
      constructor(public data: Record<string, Blob>) {}
    }
    vi.stubGlobal('ClipboardItem', MockClipboardItem);

    const drawImageMock = vi.fn();
    const toBlobMock = vi.fn(function (
      this: HTMLCanvasElement,
      callback: (blob: Blob | null) => void,
    ) {
      callback(new Blob(['fake-crop-png'], { type: 'image/png' }));
    });

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: drawImageMock,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
      toBlobMock,
    );

    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 540;
    document.body.appendChild(canvas);

    const mockSlide = {
      id: 'slide-1',
      index: 0,
      name: 'Slide 1',
      boundaryBox: {
        enabled: true,
        x: 10,
        y: 20,
        width: 50,
        height: 40,
      },
    };

    const { getByRole } = render(
      <TacticalUnifiedStoreProvider
        initialState={{
          workspaceMode: 'director',
          activeSlideId: 'slide-1',
          project: {
            id: 'proj-1',
            title: 'Project 1',
            version: '2.0.0',
            matchId: 'test',
            aspectRatio: '16:9',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            activePhaseId: 'phase-1',
            activeSlideId: 'slide-1',
            homeColor: { primary: '#034694' },
            awayColor: { primary: '#ef4444' },
            phases: [
              {
                id: 'phase-1',
                name: 'Phase 1',
                slides: [mockSlide as any],
              },
            ],
          } as any,
        }}
      >
        <TopBar />
      </TacticalUnifiedStoreProvider>,
    );

    const copyButton = getByRole('button', { name: /^Copy$/i });
    await act(async () => {
      fireEvent.click(copyButton);
    });

    // 960 * 0.1 = 96, 540 * 0.2 = 108
    // 960 * 0.5 = 480, 540 * 0.4 = 216
    expect(drawImageMock).toHaveBeenCalledWith(
      canvas,
      96,
      108,
      480,
      216,
      0,
      0,
      480,
      216,
    );
    expect(writeMock).toHaveBeenCalledTimes(1);

    document.body.removeChild(canvas);
  });
});
