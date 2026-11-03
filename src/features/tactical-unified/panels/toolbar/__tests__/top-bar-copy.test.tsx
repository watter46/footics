import { act, fireEvent, render } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanvasCoreHandle } from '@/features/tactical-unified/core';
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
});
