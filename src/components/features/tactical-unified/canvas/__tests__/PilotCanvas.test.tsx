import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePilotStore } from '@/stores/pilotStore';
import { PilotCanvas } from '../PilotCanvas';

// Canvas 2D context mock for test environment
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Array(4) })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => []),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    setLineDash: vi.fn(),
    getLineDash: vi.fn(() => []),
    isPointInPath: vi.fn(() => true),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createPattern: vi.fn(),
  });
});

describe('PilotCanvas', () => {
  beforeEach(() => {
    act(() => {
      usePilotStore.getState().reset();
    });
  });

  it('初期状態 (showGrid=false) でレンダリングされ、Konvaコンテナが存在する', () => {
    const { container } = render(<PilotCanvas width={600} height={400} />);
    expect(container).toBeDefined();
    expect(container.querySelector('.konvajs-content')).toBeDefined();
  });

  it('showGrid=true のとき、グリッドが描画される', () => {
    act(() => {
      usePilotStore.getState().setShowGrid(true);
    });

    const { container } = render(<PilotCanvas width={600} height={400} />);
    expect(container.querySelector('.konvajs-content')).toBeDefined();
    expect(usePilotStore.getState().showGrid).toBe(true);
  });

  it('storeのトグル操作によりshowGridの切り替えが反映される', () => {
    const { rerender } = render(<PilotCanvas width={400} height={400} />);
    expect(usePilotStore.getState().showGrid).toBe(false);

    act(() => {
      usePilotStore.getState().toggleGrid();
    });
    rerender(<PilotCanvas width={400} height={400} />);
    expect(usePilotStore.getState().showGrid).toBe(true);

    act(() => {
      usePilotStore.getState().toggleGrid();
    });
    rerender(<PilotCanvas width={400} height={400} />);
    expect(usePilotStore.getState().showGrid).toBe(false);
  });
});
