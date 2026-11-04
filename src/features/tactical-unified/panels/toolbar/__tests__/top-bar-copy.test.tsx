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
});
