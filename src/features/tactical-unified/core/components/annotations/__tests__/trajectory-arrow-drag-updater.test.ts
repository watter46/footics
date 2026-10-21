import type Konva from 'konva';
import { describe, expect, it, vi } from 'vitest';
import type { TrajectoryArrowNodeEntry } from '../../../utils/canvas-registry';
import { updateTrajectoryArrowPositions } from '../trajectory-arrow-drag-updater';

describe('updateTrajectoryArrowPositions', () => {
  it('ドラッグ中の座標に合わせて直線ゴースト矢印の points とハンドル座標を更新する', () => {
    const mockArrow = {
      points: vi.fn(),
      getLayer: () => ({ batchDraw: vi.fn() }),
    } as unknown as Konva.Arrow;

    const mockHandle = {
      position: vi.fn(),
    } as unknown as Konva.Circle;

    const mockGroup = {
      visible: vi.fn(),
    } as unknown as Konva.Group;

    const map = new Map<string, TrajectoryArrowNodeEntry>();
    map.set('p-1', {
      arrowNode: mockArrow,
      controlHandleNode: mockHandle,
      groupNode: mockGroup,
      startPos: { x: 20, y: 30 },
      startPx: { x: 100, y: 150 },
      trajectory: { type: 'straight' },
    });

    updateTrajectoryArrowPositions(map, 'p-1', 300, 250, 500, 500);

    expect(mockArrow.points).toHaveBeenCalledWith([100, 150, 300, 250]);
    expect(mockHandle.position).toHaveBeenCalledWith({ x: 200, y: 200 });
    expect(mockGroup.visible).toHaveBeenCalledWith(true);
  });

  it('距離が4px未満の場合は groupNode.visible(false) を設定する', () => {
    const mockArrow = {
      points: vi.fn(),
      getLayer: () => ({ batchDraw: vi.fn() }),
    } as unknown as Konva.Arrow;

    const mockGroup = {
      visible: vi.fn(),
    } as unknown as Konva.Group;

    const map = new Map<string, TrajectoryArrowNodeEntry>();
    map.set('p-1', {
      arrowNode: mockArrow,
      groupNode: mockGroup,
      startPos: { x: 20, y: 20 },
      startPx: { x: 100, y: 100 },
      trajectory: { type: 'straight' },
    });

    updateTrajectoryArrowPositions(map, 'p-1', 101, 101, 500, 500);

    expect(mockGroup.visible).toHaveBeenCalledWith(false);
  });

  it('custom軌道の場合、ベジェ曲線の点列と中間頂点ハンドルを正しく更新する', () => {
    const mockArrow = {
      points: vi.fn(),
      getLayer: () => ({ batchDraw: vi.fn() }),
    } as unknown as Konva.Arrow;

    const mockHandle = {
      position: vi.fn(),
    } as unknown as Konva.Circle;

    const map = new Map<string, TrajectoryArrowNodeEntry>();
    map.set('p-1', {
      arrowNode: mockArrow,
      controlHandleNode: mockHandle,
      startPos: { x: 10, y: 10 },
      startPx: { x: 50, y: 50 },
      trajectory: {
        type: 'custom',
        controlPoint: { x: 30, y: 10 },
      },
    });

    updateTrajectoryArrowPositions(map, 'p-1', 250, 250, 500, 500);

    expect(mockArrow.points).toHaveBeenCalled();
    const calledPts = (mockArrow.points as any).mock.calls[0][0];
    expect(Array.isArray(calledPts)).toBe(true);
    expect(calledPts.length).toBeGreaterThan(4); // 曲線点列
    expect(mockHandle.position).toHaveBeenCalled();
  });
});
