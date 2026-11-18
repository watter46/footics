import { describe, expect, it } from 'vitest';
import { syncTrajectoryEntryKonva } from '@/features/tactical-unified/core/utils/drag-konva-sync';
import {
  getBezierControlPointPx,
  getBezierMidpoint,
} from '@/lib/tactical/trajectory';
import {
  toScreenNormCoord,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type { DomainPlayerTrajectory } from '@/lib/types/tactical/domain-entities';

describe('ghost-trajectory-curve', () => {
  const stageSize = { width: 1200, height: 800 };

  it('case 1: syncTrajectoryEntryKonva uses custom controlPoint (600, 160) on 1200x800 stage when dragging to (700, 400)', () => {
    const trajectory: DomainPlayerTrajectory = {
      type: 'custom',
      controlPoint: toScreenNormPoint(50, 20, false),
    };

    const startPx = { x: 200, y: 400 };
    const endPx = { x: 700, y: 400 };

    let capturedPoints: number[] = [];
    let handleX = 0;
    let handleY = 0;

    const fakeArrowNode = {
      points: (pts: number[]) => {
        capturedPoints = pts;
      },
      getLayer: () => null,
    };
    const fakeControlHandleNode = {
      position: (pos: { x: number; y: number }) => {
        handleX = pos.x;
        handleY = pos.y;
      },
    };
    const fakeGroupNode = {
      visible: () => {},
      getLayer: () => null,
    };

    syncTrajectoryEntryKonva(
      {
        startPx,
        startPos: toScreenNormPoint(200 / 12, 400 / 8, false),
        trajectory,
        arrowNode: fakeArrowNode as never,
        controlHandleNode: fakeControlHandleNode as never,
        groupNode: fakeGroupNode as never,
      },
      endPx,
      stageSize,
    );

    // 制御点は (50% * 1200, 20% * 800) = (600, 160)
    const expectedCp = { x: 600, y: 160 };
    const expectedMid = getBezierMidpoint(startPx, endPx, expectedCp);

    expect(handleX).toBeCloseTo(expectedMid.x, 2);
    expect(handleY).toBeCloseTo(expectedMid.y, 2);
    expect(capturedPoints.length).toBeGreaterThan(4);
    // 曲線の始点と終点が正しいこと
    expect(capturedPoints[0]).toBeCloseTo(startPx.x, 2);
    expect(capturedPoints[1]).toBeCloseTo(startPx.y, 2);
    expect(capturedPoints[capturedPoints.length - 2]).toBeCloseTo(endPx.x, 2);
    expect(capturedPoints[capturedPoints.length - 1]).toBeCloseTo(endPx.y, 2);
    // 左上 (50, 20) に飛ばず、中間点が y=160 側に引っ張られていること (y < 400)
    expect(expectedMid.y).toBeLessThan(300);
  });

  it('case 2: preserves negative custom controlPoint (50, -15) without clamping in getBezierControlPointPx', () => {
    const negativeCp = toScreenNormPoint(
      toScreenNormCoord(50),
      toScreenNormCoord(-15),
      false,
    );
    expect(negativeCp.y).toBe(-15);

    const trajectory: DomainPlayerTrajectory = {
      type: 'custom',
      controlPoint: negativeCp,
    };

    const cpPx = getBezierControlPointPx(
      { x: 200, y: 400 },
      { x: 800, y: 400 },
      trajectory,
      stageSize,
    );
    expect(cpPx.x).toBeCloseTo(600, 2);
    expect(cpPx.y).toBeCloseTo(-120, 2);
  });
});
