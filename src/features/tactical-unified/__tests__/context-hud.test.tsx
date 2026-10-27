import { describe, expect, it } from 'vitest';
import type {
  ArrowAnnotation,
  Player,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import { resolveHudTarget } from '../core/components/hud/hud-targets';
import { computeClampedHudPos } from '../core/components/hud/use-hud-position';
import {
  type ArrowNodeEntry,
  type CanvasNodesRegistry,
  createCanvasNodesRegistry,
} from '../core/utils/canvas-registry';

function createMockRegistry(
  partial: Partial<CanvasNodesRegistry>,
): CanvasNodesRegistry {
  return {
    ...createCanvasNodesRegistry(),
    ...partial,
  };
}

describe('Context HUD Positioning and Target Resolution', () => {
  const stageSize = { width: 1000, height: 800 };
  const offset = { x: 0, y: 0, width: 1000, height: 800 };

  describe('resolveHudTarget - Arrow', () => {
    it('曲線矢印で制御点単体ではなく外接矩形の中心と全高を返す', () => {
      const arrow = {
        id: 'arrow-1',
        annotationType: 'arrow',
        points: [
          { x: 10, y: 20 },
          { x: 50, y: 20 },
        ],
        controlPoint: { x: 30, y: 80 },
        color: '#ffffff',
        arrowType: 'pass',
        curveType: 'curved',
      } as unknown as ArrowAnnotation;

      const target = resolveHudTarget({
        selected: { kind: 'arrow', id: 'arrow-1' },
        offset,
        data: {
          markers: [],
          arrows: [arrow],
          zones: [],
          texts: [],
        },
      });

      expect(target).not.toBeNull();
      // minX = 10% (100px), maxX = 50% (500px) -> centerX = 300px
      expect(target?.x).toBe(300);
      // minY = 20% (160px), maxY = 80% (640px) -> centerY = 400px (controlPointの640pxではない)
      expect(target?.y).toBe(400);
      // height = maxY - minY = 480px
      expect(target?.height).toBe(480);
    });

    it('直線矢印でも外接矩形の中心と全高を返す', () => {
      const arrow = {
        id: 'arrow-2',
        annotationType: 'arrow',
        points: [
          { x: 20, y: 30 },
          { x: 40, y: 50 },
        ],
        color: '#ffffff',
        arrowType: 'pass',
        curveType: 'straight',
      } as unknown as ArrowAnnotation;

      const target = resolveHudTarget({
        selected: { kind: 'arrow', id: 'arrow-2' },
        offset,
        data: {
          markers: [],
          arrows: [arrow],
          zones: [],
          texts: [],
        },
      });

      expect(target).not.toBeNull();
      // minX = 200, maxX = 400 -> centerX = 300
      expect(target?.x).toBe(300);
      // minY = 240, maxY = 400 -> centerY = 320
      expect(target?.y).toBe(320);
      // height = max(400 - 240, 24) = 160
      expect(target?.height).toBe(160);
    });

    it('Konva node が存在する場合、中心Yと全高（最低24px）を返す', () => {
      const arrow = {
        id: 'arrow-node',
        annotationType: 'arrow',
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
        color: '#ffffff',
        arrowType: 'pass',
        curveType: 'straight',
      } as unknown as ArrowAnnotation;

      const mockRegistry = createMockRegistry({
        arrowNodes: new Map<string, ArrowNodeEntry>([
          [
            'arrow-node',
            {
              node: {
                getClientRect: () => ({
                  x: 100,
                  y: 100,
                  width: 200,
                  height: 10,
                }),
              } as unknown as ArrowNodeEntry['node'],
            },
          ],
        ]),
      });

      const target = resolveHudTarget({
        selected: { kind: 'arrow', id: 'arrow-node' },
        offset,
        nodesRegistryRef: { current: mockRegistry },
        data: {
          markers: [],
          arrows: [arrow],
          zones: [],
          texts: [],
        },
      });

      expect(target).toEqual({
        x: 200, // 100 + 200 / 2
        y: 105, // rect.y + rect.height / 2 (中心Y)
        height: 24, // Math.max(10, 24)
      });
    });
  });

  describe('resolveHudTarget - Zone', () => {
    it('フォールバック時、中心X・中心Y・高さを正しく計算して返す', () => {
      const zone = {
        id: 'zone-1',
        annotationType: 'zone',
        zoneType: 'generic',
        x: 20,
        y: 30,
        width: 40,
        height: 20,
        color: 'rgba(255,0,0,0.2)',
        opacity: 0.2,
        strokeWidth: 2,
        points: [],
      } as unknown as ZoneAnnotation;

      const target = resolveHudTarget({
        selected: { kind: 'zone', id: 'zone-1' },
        offset,
        data: {
          markers: [],
          arrows: [],
          zones: [zone],
          texts: [],
        },
      });

      expect(target).not.toBeNull();
      // pxW = (40 / 100) * 1000 = 400
      // pxH = (20 / 100) * 800 = 160
      // centerX = 0 + (20 / 100) * 1000 + 400 / 2 = 200 + 200 = 400
      // centerY = 0 + (30 / 100) * 800 + 160 / 2 = 240 + 80 = 320
      expect(target?.x).toBe(400);
      expect(target?.y).toBe(320);
      expect(target?.height).toBe(160);
    });

    it('Konva node が存在する場合、中心X・中心Y・全高（最低30px）を返す', () => {
      const zone = {
        id: 'zone-node',
        annotationType: 'zone',
        zoneType: 'generic',
        color: '#ff0000',
        opacity: 0.2,
        strokeWidth: 2,
        points: [],
      } as unknown as ZoneAnnotation;

      const mockRegistry = createMockRegistry({
        zoneNodes: new Map([
          [
            'zone-node',
            {
              getClientRect: () => ({
                x: 100,
                y: 200,
                width: 150,
                height: 20,
              }),
            } as unknown as import('konva/lib/Shape').Shape,
          ],
        ]),
      });

      const target = resolveHudTarget({
        selected: { kind: 'zone', id: 'zone-node' },
        offset,
        nodesRegistryRef: { current: mockRegistry },
        data: {
          markers: [],
          arrows: [],
          zones: [zone],
          texts: [],
        },
      });

      expect(target).toEqual({
        x: 175, // 100 + 150 / 2
        y: 210, // 200 + 20 / 2 (中心Y)
        height: 30, // Math.max(20, 30)
      });
    });
  });

  describe('resolveHudTarget - Player', () => {
    it('Konva node が存在する場合、中心Yを返す', () => {
      const player = {
        id: 'player-1',
        x: 50,
        y: 50,
        team: 'home',
        area: 'pitch',
        style: {
          markerType: 'circle',
          insideContent: 'number',
          bottomLabel: 'none',
          color: '#ff0000',
          strokeColor: '#000000',
          strokeWidth: 2,
          sizeScale: 1,
          numberSizeScale: 1,
          labelSizeScale: 1,
        },
        connectLines: [],
        badges: [],
      } as unknown as Player;

      const mockRegistry = createMockRegistry({
        playerNodes: new Map([
          [
            'player-1',
            {
              getClientRect: () => ({
                x: 300,
                y: 400,
                width: 32,
                height: 32,
              }),
            } as unknown as import('konva/lib/Group').Group,
          ],
        ]),
      });

      const target = resolveHudTarget({
        selected: { kind: 'player', id: 'player-1' },
        offset,
        nodesRegistryRef: { current: mockRegistry },
        data: {
          markers: [player],
          arrows: [],
          zones: [],
          texts: [],
        },
      });

      expect(target).toEqual({
        x: 316, // 300 + 32 / 2
        y: 416, // 400 + 32 / 2 (中心Y)
        height: 32,
      });
    });
  });

  describe('computeClampedHudPos', () => {
    it('外接矩形を基準に上部へ十分なマージンを持って配置される', () => {
      // 画面中央付近のオブジェクト (中心Y: 400, 高さ: 100 -> targetTop: 350, targetBottom: 450)
      const pos = computeClampedHudPos(500, 400, 100, stageSize);

      expect(pos.isBelow).toBe(false);
      // targetTop (350) - MARGIN (32) = 318
      expect(pos.clampedY).toBe(318);
    });

    it('画面上部に近くて上部スペースが不足する場合、下部に退避配置される', () => {
      // 上端近く (中心Y: 50, 高さ: 60 -> targetTop: 20, targetBottom: 80)
      const pos = computeClampedHudPos(500, 50, 60, stageSize);

      expect(pos.isBelow).toBe(true);
      // targetBottom (80) + MARGIN (32) = 112
      expect(pos.clampedY).toBe(112);
    });
  });
});
