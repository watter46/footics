import { act, fireEvent, render } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanvasCoreHandle } from '@/features/tactical-unified/core';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { TopBar } from '../top-bar';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

function createMockCanvasContext2D(): CanvasRenderingContext2D {
  const gradientStub = { addColorStop: vi.fn() };
  return new Proxy(
    {
      createLinearGradient: vi.fn(() => gradientStub),
      createRadialGradient: vi.fn(() => gradientStub),
      measureText: vi.fn(() => ({ width: 0 })),
    } as Record<string, unknown>,
    {
      get(target, prop) {
        if (typeof prop === 'string' && prop in target) {
          return target[prop];
        }
        if (typeof prop === 'string') {
          target[prop] = vi.fn();
          return target[prop];
        }
        return undefined;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
}

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

    const { getByRole } = render(
      <TacticalStoreProvider>
        <TopBar canvasRef={canvasRef} />
      </TacticalStoreProvider>,
    );

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

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      createMockCanvasContext2D(),
    );
    const toBlobSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation((callback: (blob: Blob | null) => void) => {
        callback(new Blob(['fake-png-data'], { type: 'image/png' }));
      });

    const { getByRole, findByText } = render(
      <TacticalStoreProvider initialSession={{ workspaceMode: 'director' }}>
        <TopBar />
      </TacticalStoreProvider>,
    );

    const copyButton = getByRole('button', { name: /^Copy$/i });
    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(toBlobSpy).toHaveBeenCalledTimes(1);
    expect(writeMock).toHaveBeenCalledTimes(1);
    expect(
      await findByText('📋 画像をクリップボードにコピーしました！'),
    ).toBeDefined();
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

    let capturedCanvasSize: { width: number; height: number } | null = null;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      createMockCanvasContext2D(),
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
      function (
        this: HTMLCanvasElement,
        callback: (blob: Blob | null) => void,
      ) {
        capturedCanvasSize = { width: this.width, height: this.height };
        callback(new Blob(['fake-crop-png'], { type: 'image/png' }));
      },
    );

    const baseProject = createDefaultTacticalProject();
    const firstPhase = baseProject.phases[0]!;
    const domainProject = {
      ...baseProject,
      matchId: 'test',
      phases: [
        {
          ...firstPhase,
          aspectRatio: '16:9' as const,
          boundaryBox: {
            enabled: true,
            x: 10,
            y: 20,
            width: 50,
            height: 40,
          },
        },
      ],
    };

    const { getByRole } = render(
      <TacticalStoreProvider
        initialProject={domainProject}
        initialSession={{
          workspaceMode: 'director',
          activePhaseId: firstPhase.id,
          activeSlideId: firstPhase.slides[0]?.id ?? '',
        }}
      >
        <TopBar />
      </TacticalStoreProvider>,
    );

    const copyButton = getByRole('button', { name: /^Copy$/i });
    await act(async () => {
      fireEvent.click(copyButton);
    });

    // 1920 * 0.5 = 960, 1080 * 0.4 = 432
    expect(capturedCanvasSize).toEqual({ width: 960, height: 432 });
    expect(writeMock).toHaveBeenCalledTimes(1);
  });
});
