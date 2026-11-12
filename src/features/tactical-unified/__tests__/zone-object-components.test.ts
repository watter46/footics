import { render } from '@testing-library/react';
import type Konva from 'konva';
import React from 'react';
import { Layer, Stage } from 'react-konva';
import { describe, expect, it, vi } from 'vitest';
import { ZonePolygonNode } from '@/features/tactical-unified/core/components/zones/ZonePolygonNode';
import { ZoneShapeNode } from '@/features/tactical-unified/core/components/zones/ZoneShapeNode';
import { getZoneStyle } from '@/features/tactical-unified/core/components/zones/zone-geometry';
import { createCanvasStore } from '@/features/tactical-unified/core/store/canvas-store';
import { CanvasStoreContext } from '@/features/tactical-unified/core/store/canvas-store-provider';
import * as PlayerComponents from '@/features/tactical-unified/objects/player/components';
import type { ResolvedZonePrimitive } from '@/lib/tactical/compiler/scene-graph-dto';
import type { StagePixel } from '@/lib/types/tactical/branded';
import type { ZoneAnnotation } from '@/lib/types/tactical-unified';

describe('ZoneObject components & helpers', () => {
  const sampleZone: ZoneAnnotation = {
    id: 'zone-test-1',
    annotationType: 'zone',
    zoneType: 'generic',
    shapeType: 'rect',
    x: 10,
    y: 20,
    width: 30,
    height: 40,
    rotation: 15,
    points: [
      { x: 10, y: 20 },
      { x: 40, y: 20 },
      { x: 40, y: 60 },
      { x: 10, y: 60 },
    ],
    color: '#3b82f6',
    opacity: 0.5,
    strokeColor: '#1d4ed8',
    strokeWidth: 3,
  };

  it('getZoneStyle calculates fillRGBA and strokeColor with default strokeWidth and opacity', () => {
    const style = getZoneStyle(sampleZone);
    expect(style.strokeColor).toBe('#1d4ed8');
    expect(style.strokeWidth).toBe(3);
    expect(style.fillRGBA).toBe('#3b82f680');
    expect(style.opacity).toBe(0.5);
  });

  it('getZoneStyle handles default opacity and fallback colors', () => {
    const defaultZone: ZoneAnnotation = {
      id: 'zone-default',
      annotationType: 'zone',
      zoneType: 'generic',
      shapeType: 'polygon',
      points: [{ x: 5, y: 5 }],
      color: '',
      opacity: 0.25,
      strokeWidth: 2,
    };
    const style = getZoneStyle(defaultZone);
    expect(style.strokeColor).toBe('#3b82f6');
    expect(style.strokeWidth).toBe(2);
    expect(style.fillRGBA).toBe('#3b82f640');
    expect(style.opacity).toBe(0.25);
  });
});

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
      opacity: 0.3,
      strokeColor: '#ef4444',
      strokeOpacity: 0.8,
      strokeWidthPx: 4,
      visible: true,
      selected: false,
    };
    const zone: ZoneAnnotation = {
      id: 'z1',
      annotationType: 'zone',
      zoneType: 'generic',
      shapeType: 'rect',
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      points: [],
      color: '#000000',
      opacity: 0.5,
      strokeWidth: 3,
    };

    const store = createCanvasStore({ mode: 'full-tactical' });
    render(
      React.createElement(
        CanvasStoreContext.Provider,
        { value: store },
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
    expect(shape?.strokeWidth()).toBe(4);
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
      opacity: 0.25,
      strokeColor: '#3b82f6',
      strokeOpacity: 0.8,
      strokeWidthPx: 3,
      visible: true,
      selected: false,
    };
    const zone: ZoneAnnotation = {
      id: 'zp1',
      annotationType: 'zone',
      zoneType: 'generic',
      shapeType: 'polygon',
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
      color: '#000000',
      opacity: 0.5,
      strokeWidth: 3,
    };

    const store = createCanvasStore({ mode: 'full-tactical' });
    render(
      React.createElement(
        CanvasStoreContext.Provider,
        { value: store },
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
    expect(line?.strokeWidth()).toBe(3);
  });
});
