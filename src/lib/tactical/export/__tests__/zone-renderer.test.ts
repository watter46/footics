import { describe, expect, it, vi } from 'vitest';
import type {
  InterpolatedArrowState,
  InterpolatedPlayerState,
  InterpolatedZoneState,
} from '@/lib/tactical/unified-interpolation';
import { renderArrows } from '../renderers/arrow-renderer';
import { renderPlayers } from '../renderers/player-renderer';
import {
  type AnyCanvasRenderingContext2D,
  createFrameRenderContext,
} from '../renderers/renderer-context';
import { renderZones } from '../renderers/zone-renderer';

function createMockContext(timeInSlideMs?: number) {
  const alphas: number[] = [];
  let lineDashOffset = 0;
  const strokes: string[] = [];
  const fills: string[] = [];
  const drawnLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const lineDashes: number[][] = [];
  let lastMove = { x: 0, y: 0 };

  const ctx = {
    beginPath: vi.fn(),
    moveTo: vi.fn((x: number, y: number) => {
      lastMove = { x, y };
    }),
    lineTo: vi.fn((x: number, y: number) => {
      drawnLines.push({ x1: lastMove.x, y1: lastMove.y, x2: x, y2: y });
    }),
    stroke: vi.fn(),
    fill: vi.fn(),
    closePath: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    strokeRect: vi.fn(),
    fillRect: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    clip: vi.fn(),
    drawImage: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    setLineDash: vi.fn((d: number[]) => {
      lineDashes.push(d);
    }),
    get lineDashOffset() {
      return lineDashOffset;
    },
    set lineDashOffset(val: number) {
      lineDashOffset = val;
    },
    set globalAlpha(val: number) {
      alphas.push(val);
    },
    get globalAlpha() {
      return alphas[alphas.length - 1] ?? 1;
    },
    set strokeStyle(val: string) {
      strokes.push(val);
    },
    set fillStyle(val: string) {
      fills.push(val);
    },
  } as unknown as AnyCanvasRenderingContext2D;

  const frameCtx = createFrameRenderContext({
    ctx,
    baseWidth: 1000,
    baseHeight: 500,
    aspectRatio: '16:9',
  });
  if (timeInSlideMs !== undefined) {
    frameCtx.timeInSlideMs = timeInSlideMs;
  }

  return {
    ctx,
    frameCtx,
    alphas,
    strokes,
    fills,
    drawnLines,
    lineDashes,
    getLineDashOffset: () => lineDashOffset,
  };
}

describe('zone-renderer - pulse effect', () => {
  it('1. pulse エフェクトを持つゾーンで timeInSlideMs に応じた opacity が適用されること', () => {
    const { frameCtx: frameCtx0, alphas: alphas0 } = createMockContext(0);

    const zones: Record<string, InterpolatedZoneState> = {
      z1: {
        id: 'z1',
        zoneType: 'space',
        shapeType: 'rect',
        x: 20,
        y: 20,
        width: 30,
        height: 20,
        points: [],
        color: '#22c55e',
        opacity: 0.25,
        strokeWidth: 2,
        visible: true,
        effect: {
          type: 'pulse',
          duration: 1.0,
          minOpacity: 0.1,
          maxOpacity: 0.5,
        },
      },
    };

    renderZones(frameCtx0, zones);
    // t=0s: cycle=0, sin(-pi/2) = -1, pulse = 0 -> minOpacity = 0.1
    expect(alphas0).toContain(0.1);

    // t=0.5s: cycle=0.5, sin(pi/2) = 1, pulse = 1 -> maxOpacity = 0.5
    const { frameCtx: frameCtx500, alphas: alphas500 } = createMockContext(500);
    renderZones(frameCtx500, zones);
    expect(alphas500).toContain(0.5);
  });

  it('2. pulse なしの通常ゾーンでは base opacity がそのまま使われること', () => {
    const { frameCtx, alphas } = createMockContext(500);

    const zones: Record<string, InterpolatedZoneState> = {
      z2: {
        id: 'z2',
        zoneType: 'space',
        shapeType: 'ellipse',
        x: 10,
        y: 10,
        width: 20,
        height: 20,
        points: [],
        color: '#3b82f6',
        opacity: 0.35,
        strokeWidth: 0,
        visible: true,
      },
    };

    renderZones(frameCtx, zones);
    expect(alphas).toContain(0.35);
  });
});

describe('arrow-renderer - flow and grow-and-flow dashOffset', () => {
  it('3. dashOffset が指定された矢印で ctx.lineDashOffset が設定されること', () => {
    const { frameCtx, getLineDashOffset } = createMockContext();

    const arrows: Record<string, InterpolatedArrowState> = {
      a1: {
        id: 'a1',
        arrowType: 'pass',
        curveType: 'straight',
        points: [
          { x: 10, y: 10 },
          { x: 50, y: 50 },
        ],
        color: '#38bdf8',
        strokeWidth: 3,
        opacity: 1,
        visible: true,
        dashOffset: -12.5,
      },
    };

    renderArrows(frameCtx, arrows);

    expect(getLineDashOffset()).toBe(-12.5);
  });

  it('4. effect が指定され dashOffset 未指定の場合、context.timeInSlideMs から自動計算されること', () => {
    const { frameCtx, getLineDashOffset } = createMockContext(1000);

    const arrows: Record<string, InterpolatedArrowState> = {
      a2: {
        id: 'a2',
        arrowType: 'pass',
        curveType: 'straight',
        points: [
          { x: 10, y: 10 },
          { x: 50, y: 50 },
        ],
        color: '#38bdf8',
        strokeWidth: 3,
        opacity: 1,
        visible: true,
        ...({
          effect: {
            type: 'flow',
            speed: 25,
          },
        } as any),
      },
    };

    renderArrows(frameCtx, arrows);

    expect(getLineDashOffset()).toBe(-25);
  });
});

describe('player-renderer - trajectoryEffect (ghost track)', () => {
  it('5. trajectoryEffect.enabled の場合、始点マーカーと追従ラインが描画されること', () => {
    const { frameCtx, drawnLines, ctx } = createMockContext();

    const players: Record<string, InterpolatedPlayerState> = {
      p1: {
        id: 'p1',
        name: 'Runner',
        team: 'home',
        x: 60,
        y: 60,
        visible: true,
        opacity: 1,
        area: 'pitch',
        style: {
          color: '#2563eb',
          markerType: 'circle',
          insideContent: 'number',
          bottomLabel: 'name',
          strokeColor: '#ffffff',
          strokeWidth: 2,
          sizeScale: 1,
          numberSizeScale: 1,
          labelSizeScale: 1,
        },
        connectLines: [],
        badges: [],
        startPos: { x: 20, y: 20 },
        endPos: { x: 80, y: 80 },
        trajectoryEffect: {
          enabled: true,
          lineStyle: 'dashed',
          color: '#3b82f6',
          exitAction: 'keep',
        },
      },
    };

    renderPlayers(frameCtx, players);

    // 追従ライン（(20,20)から(60,60)への線分）が引かれている
    expect(drawnLines.length).toBeGreaterThan(0);
    expect(drawnLines[0].x1).toBe(200); // 20% of 1000
    expect(drawnLines[0].y1).toBe(100); // 20% of 500
    expect(drawnLines[0].x2).toBe(600); // 60% of 1000
    expect(drawnLines[0].y2).toBe(300); // 60% of 500

    // 始点マーカー arc が呼ばれている
    expect(ctx.arc).toHaveBeenCalledWith(
      200,
      100,
      expect.any(Number),
      0,
      Math.PI * 2,
    );
  });

  it('6. exitAction === "auto-hide" かつ到着済み（現在位置 === endPos）の場合、軌跡が非表示になること', () => {
    const { frameCtx, drawnLines } = createMockContext();

    const players: Record<string, InterpolatedPlayerState> = {
      p2: {
        id: 'p2',
        name: 'ArrivedRunner',
        team: 'home',
        x: 80,
        y: 80,
        visible: true,
        opacity: 1,
        area: 'pitch',
        style: {
          color: '#2563eb',
          markerType: 'circle',
          insideContent: 'number',
          bottomLabel: 'name',
          strokeColor: '#ffffff',
          strokeWidth: 2,
          sizeScale: 1,
          numberSizeScale: 1,
          labelSizeScale: 1,
        },
        connectLines: [],
        badges: [],
        startPos: { x: 20, y: 20 },
        endPos: { x: 80, y: 80 },
        trajectoryEffect: {
          enabled: true,
          lineStyle: 'dashed',
          color: '#3b82f6',
          exitAction: 'auto-hide',
        },
      },
    };

    renderPlayers(frameCtx, players);

    // 追従ラインは引かれない
    expect(drawnLines.length).toBe(0);
  });
});
