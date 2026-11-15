import { render } from '@testing-library/react';
import Konva from 'konva';
import React from 'react';
import { Layer, Stage } from 'react-konva';
import { describe, expect, it, vi } from 'vitest';
import { ZonePolygonNode } from '@/features/tactical-unified/core/components/zones/ZonePolygonNode';
import { ZoneShapeNode } from '@/features/tactical-unified/core/components/zones/ZoneShapeNode';
import { computeTransformedZonePatch } from '@/features/tactical-unified/core/components/zones/zone-geometry';
import * as PlayerComponents from '@/features/tactical-unified/objects/player/components';
import { TacticalStoreProvider } from '@/features/tactical-unified/stores/tactical-store-provider';
import type { ResolvedZonePrimitive } from '@/lib/tactical/compiler/scene-graph-dto';
import {
  type StagePixel,
  toScreenNormCoord,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type {
  EllipseZone,
  PolygonZone,
  RectZone,
} from '@/lib/types/tactical/domain-entities';

describe('Player components exports', () => {
  it('does not export dead player components', () => {
    expect('PlayerMarker' in PlayerComponents).toBe(false);
    expect('PlayerConnectLines' in PlayerComponents).toBe(false);
    expect('PlayerBadge' in PlayerComponents).toBe(false);
    expect('PlayerOnionskin' in PlayerComponents).toBe(false);
  });

  it('exports active player components', () => {
    expect(PlayerComponents.PlayerFocusSpotlight).toBeDefined();
    expect(PlayerComponents.PlayerGhostTrajectory).toBeDefined();
    expect(PlayerComponents.PlayerMarkerCircle).toBeDefined();
    expect(PlayerComponents.PlayerMarkerLabel).toBeDefined();
    expect(PlayerComponents.PlayerMarkerRing).toBeDefined();
    expect(PlayerComponents.PlayerVisionCone).toBeDefined();
    expect(PlayerComponents.PlayerVisionConeHandles).toBeDefined();
  });
});

describe('ZoneObject Dumb View (ResolvedZonePrimitive)', () => {
  it('ZoneShapeNode uses resolvedZone when provided', () => {
    const nodesRegistryRef = {
      current: {
        zoneNodes: new Map<string, Konva.Shape>(),
      } as any,
    };
    const resolvedZone: ResolvedZonePrimitive = {
      id: 'z1',
      shapeType: 'rect',
      xPx: 120 as StagePixel,
      yPx: 80 as StagePixel,
      widthPx: 200,
      heightPx: 100,
      rotationDeg: 15,
      color: '#ef4444',
      opacity: 1,
      strokeColor: '#ef4444',
      strokeOpacity: 0.8,
      strokeWidthPx: 4,
      visible: true,
      selected: false,
    };
    const zone: RectZone = {
      id: 'z1',
      annotationType: 'zone',
      zoneType: 'generic',
      shapeType: 'rect',
      x: toScreenNormCoord(0),
      y: toScreenNormCoord(0),
      width: 50,
      height: 50,
      color: '#000000',
      opacity: 0.5,
      strokeWidth: 3,
    };

    render(
      React.createElement(
        TacticalStoreProvider,
        null,
        React.createElement(
          Stage,
          { width: 800, height: 600 },
          React.createElement(
            Layer,
            null,
            React.createElement(ZoneShapeNode, {
              zone,
              stageSize: { width: 800, height: 600 },
              isSelected: false,
              isInteractive: true,
              onSelect: vi.fn(),
              updateZone: vi.fn(),
              nodesRegistryRef,
              resolvedZone,
            }),
          ),
        ),
      ),
    );

    const shape = nodesRegistryRef.current.zoneNodes.get('z1');
    expect(shape).toBeDefined();
    expect(shape?.x()).toBe(220);
    expect(shape?.y()).toBe(130);
    expect(shape?.width()).toBe(200);
    expect(shape?.height()).toBe(100);
    expect(shape?.rotation()).toBe(15);
    expect(shape?.fill()).toBe('#ef4444');
    expect(shape?.stroke()).toBe('#ef4444');
    expect(shape?.strokeWidth()).toBe(4);
  });

  it('ZoneShapeNode uses resolvedZone for ellipse', () => {
    const nodesRegistryRef = {
      current: {
        zoneNodes: new Map<string, Konva.Shape>(),
      } as any,
    };
    const resolvedZone: ResolvedZonePrimitive = {
      id: 'z-ellipse',
      shapeType: 'ellipse',
      xPx: 100 as StagePixel,
      yPx: 50 as StagePixel,
      widthPx: 160,
      heightPx: 80,
      rotationDeg: 30,
      color: '#10b981',
      opacity: 1,
      strokeColor: '#047857',
      strokeOpacity: 0.9,
      strokeWidthPx: 2,
      visible: false,
      selected: false,
    };
    const zone: EllipseZone = {
      id: 'z-ellipse',
      annotationType: 'zone',
      zoneType: 'generic',
      shapeType: 'ellipse',
      x: toScreenNormCoord(0),
      y: toScreenNormCoord(0),
      width: 10,
      height: 10,
      color: '#000000',
      opacity: 0.5,
      strokeWidth: 1,
    };

    render(
      React.createElement(
        TacticalStoreProvider,
        null,
        React.createElement(
          Stage,
          { width: 800, height: 600 },
          React.createElement(
            Layer,
            null,
            React.createElement(ZoneShapeNode, {
              zone,
              stageSize: { width: 800, height: 600 },
              isSelected: false,
              isInteractive: true,
              onSelect: vi.fn(),
              updateZone: vi.fn(),
              nodesRegistryRef,
              resolvedZone,
            }),
          ),
        ),
      ),
    );

    const shape = nodesRegistryRef.current.zoneNodes.get(
      'z-ellipse',
    ) as Konva.Ellipse;
    expect(shape).toBeDefined();
    expect(shape?.x()).toBe(180);
    expect(shape?.y()).toBe(90);
    expect(shape?.radiusX()).toBe(80);
    expect(shape?.radiusY()).toBe(40);
    expect(shape?.rotation()).toBe(30);
    expect(shape?.fill()).toBe('#10b981');
    expect(shape?.stroke()).toBe('#047857');
    expect(shape?.strokeWidth()).toBe(2);
  });

  it('ZonePolygonNode uses resolvedZone when provided', () => {
    const nodesRegistryRef = {
      current: {
        zoneNodes: new Map<string, Konva.Shape>(),
      } as any,
    };
    const resolvedZone: ResolvedZonePrimitive = {
      id: 'zp1',
      shapeType: 'polygon',
      flatPointsPx: [50, 60, 150, 60, 150, 160],
      color: '#3b82f6',
      opacity: 1,
      strokeColor: '#3b82f6',
      strokeOpacity: 0.8,
      strokeWidthPx: 3,
      visible: true,
      selected: false,
    };
    const zone: PolygonZone = {
      id: 'zp1',
      annotationType: 'zone',
      zoneType: 'generic',
      shapeType: 'polygon',
      points: [
        toScreenNormPoint(10, 10),
        toScreenNormPoint(20, 20),
        toScreenNormPoint(30, 10),
      ],
      color: '#000000',
      opacity: 0.5,
      strokeWidth: 3,
    };

    render(
      React.createElement(
        TacticalStoreProvider,
        null,
        React.createElement(
          Stage,
          { width: 800, height: 600 },
          React.createElement(
            Layer,
            null,
            React.createElement(ZonePolygonNode, {
              zone,
              stageSize: { width: 800, height: 600 },
              isSelected: false,
              isInteractive: true,
              onSelect: vi.fn(),
              updateZone: vi.fn(),
              nodesRegistryRef,
              resolvedZone,
            }),
          ),
        ),
      ),
    );

    const line = nodesRegistryRef.current.zoneNodes.get('zp1') as Konva.Line;
    expect(line).toBeDefined();
    expect(line?.points()).toEqual([50, 60, 150, 60, 150, 160]);
    expect(line?.fill()).toBe('#3b82f6');
    expect(line?.stroke()).toBe('#3b82f6');
    expect(line?.strokeWidth()).toBe(3);
  });

  it('computeTransformedZonePatch returns normalized rect/rotation without points', () => {
    const node = new Konva.Rect({
      x: 200,
      y: 150,
      scaleX: 1.5,
      scaleY: 0.5,
      rotation: 45,
    });

    const patch = computeTransformedZonePatch(node, 100, 100, 800, 600);

    expect(patch.rotation).toBe(45);
    expect(patch.width).toBeCloseTo((150 / 800) * 100);
    expect(patch.height).toBeCloseTo((50 / 600) * 100);
    expect(patch.x).toBeCloseTo(((200 - 75) / 800) * 100);
    expect(patch.y).toBeCloseTo(((150 - 25) / 600) * 100);
    expect('points' in patch).toBe(false);
    expect(node.scaleX()).toBe(1);
    expect(node.scaleY()).toBe(1);
  });

  it('ZoneShapeNode attaches Transformer with rotateEnabled=false and 8 anchors and syncs rotationDeg', () => {
    const nodesRegistryRef = {
      current: {
        zoneNodes: new Map<string, Konva.Shape>(),
      } as any,
    };
    const baseResolvedZone: ResolvedZonePrimitive = {
      id: 'z-rot',
      shapeType: 'rect',
      xPx: 100 as StagePixel,
      yPx: 100 as StagePixel,
      widthPx: 160 as StagePixel,
      heightPx: 80 as StagePixel,
      rotationDeg: 0,
      color: '#3b82f6',
      opacity: 1,
      strokeColor: '#3b82f6',
      strokeOpacity: 0.8,
      strokeWidthPx: 2,
      visible: true,
      selected: true,
    };
    const zone: RectZone = {
      id: 'z-rot',
      annotationType: 'zone',
      zoneType: 'generic',
      shapeType: 'rect',
      x: toScreenNormCoord(12.5),
      y: toScreenNormCoord(16.6),
      width: 20,
      height: 13.3,
      color: '#3b82f6',
      opacity: 0.5,
      strokeWidth: 2,
    };

    const { rerender } = render(
      React.createElement(
        TacticalStoreProvider,
        null,
        React.createElement(
          Stage,
          { width: 800, height: 600 },
          React.createElement(
            Layer,
            null,
            React.createElement(ZoneShapeNode, {
              zone,
              stageSize: { width: 800, height: 600 },
              isSelected: true,
              isInteractive: true,
              onSelect: vi.fn(),
              updateZone: vi.fn(),
              nodesRegistryRef,
              resolvedZone: baseResolvedZone,
            }),
          ),
        ),
      ),
    );

    const shape = nodesRegistryRef.current.zoneNodes.get('z-rot') as Konva.Rect;
    const transformer = shape
      ?.getLayer()
      ?.findOne('Transformer') as Konva.Transformer;
    expect(transformer).toBeDefined();
    expect(transformer?.rotateEnabled()).toBe(false);
    expect(transformer?.enabledAnchors()).toHaveLength(8);
    expect(transformer?.nodes()).toHaveLength(1);
    expect(shape?.rotation()).toBe(0);

    rerender(
      React.createElement(
        TacticalStoreProvider,
        null,
        React.createElement(
          Stage,
          { width: 800, height: 600 },
          React.createElement(
            Layer,
            null,
            React.createElement(ZoneShapeNode, {
              zone,
              stageSize: { width: 800, height: 600 },
              isSelected: true,
              isInteractive: true,
              onSelect: vi.fn(),
              updateZone: vi.fn(),
              nodesRegistryRef,
              resolvedZone: { ...baseResolvedZone, rotationDeg: 45 },
            }),
          ),
        ),
      ),
    );

    expect(shape?.rotation()).toBe(45);
  });
});
