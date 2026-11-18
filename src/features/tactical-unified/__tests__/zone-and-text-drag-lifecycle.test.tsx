import { act, render } from '@testing-library/react';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { createRef } from 'react';
import { Layer, Stage } from 'react-konva';
import { describe, expect, it, vi } from 'vitest';
import { ZonePolygonNode } from '@/features/tactical-unified/core/components/zones/ZonePolygonNode';
import { ZoneShapeNode } from '@/features/tactical-unified/core/components/zones/ZoneShapeNode';
import {
  TacticalStoreProvider,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import type { ResolvedZonePrimitive } from '@/lib/tactical/compiler/scene-graph-dto';
import type { DomainZoneAnnotation } from '@/lib/types/tactical/domain-entities';

const STAGE_SIZE = { width: 800, height: 600 };

type NormCoord = Extract<DomainZoneAnnotation, { shapeType: 'rect' }>['x'];
type PxCoord = NonNullable<ResolvedZonePrimitive['xPx']>;

function norm(n: number): NormCoord {
  return n as NormCoord;
}

function px(n: number): PxCoord {
  return n as PxCoord;
}

function createRectZone(): DomainZoneAnnotation {
  return {
    id: 'zone-rect-1',
    annotationType: 'zone',
    zoneType: 'highlight',
    shapeType: 'rect',
    x: norm(0.1),
    y: norm(0.1),
    width: 0.2,
    height: 0.2,
    color: '#ff0000',
    opacity: 1,
    strokeWidth: 2,
    rotation: 0,
  };
}

function createPolygonZone(): DomainZoneAnnotation {
  return {
    id: 'zone-poly-1',
    annotationType: 'zone',
    zoneType: 'highlight',
    shapeType: 'polygon',
    points: [
      { x: norm(0.1), y: norm(0.1) },
      { x: norm(0.3), y: norm(0.1) },
      { x: norm(0.2), y: norm(0.3) },
    ],
    color: '#00ff00',
    opacity: 1,
    strokeWidth: 2,
  };
}

function createResolvedZone(id: string): ResolvedZonePrimitive {
  return {
    id,
    shapeType: 'rect',
    xPx: px(80),
    yPx: px(60),
    widthPx: 160,
    heightPx: 120,
    rotationDeg: 0,
    color: '#ff0000',
    opacity: 1,
    strokeColor: '#ffffff',
    strokeWidthPx: 2,
    strokeOpacity: 1,
    visible: true,
    selected: false,
    flatPointsPx: [80, 60, 240, 60, 160, 180],
  };
}

function SessionObserver({
  onSnapshot,
}: {
  onSnapshot: (s: { isDragging: boolean; isHudOpen: boolean }) => void;
}) {
  const isDragging = useSessionStore((s) => s.isDragging);
  const isHudOpen = useSessionStore((s) => s.isHudOpen);
  onSnapshot({ isDragging, isHudOpen });
  return null;
}

describe('zone drag lifecycle', () => {
  it('case 1: ZoneShapeNode transitions isDragging, isHudOpen, onSelect, and updateZone on dragstart/dragend', () => {
    const stageRef = createRef<Konva.Stage>();
    const onSelect = vi.fn();
    const updateZone = vi.fn();
    let latestSession = { isDragging: false, isHudOpen: true };

    render(
      <TacticalStoreProvider>
        <SessionObserver
          onSnapshot={(s) => {
            latestSession = s;
          }}
        />
        <Stage ref={stageRef} width={800} height={600}>
          <Layer>
            <ZoneShapeNode
              zone={createRectZone()}
              stageSize={STAGE_SIZE}
              isSelected={false}
              onSelect={onSelect}
              updateZone={updateZone}
              resolvedZone={createResolvedZone('zone-rect-1')}
            />
          </Layer>
        </Stage>
      </TacticalStoreProvider>,
    );

    const stage = stageRef.current;
    expect(stage).not.toBeNull();
    const shape = stage?.findOne('Rect');
    expect(shape).toBeDefined();

    act(() => {
      shape?.fire('dragstart', {
        evt: { shiftKey: false },
        target: shape,
        currentTarget: shape,
      } as unknown as KonvaEventObject<DragEvent>);
    });

    expect(latestSession.isDragging).toBe(true);
    expect(latestSession.isHudOpen).toBe(false);
    expect(onSelect).toHaveBeenCalledTimes(1);

    act(() => {
      shape?.x(120);
      shape?.y(90);
      shape?.fire('dragend', {
        evt: {},
        target: shape,
        currentTarget: shape,
      } as unknown as KonvaEventObject<DragEvent>);
    });

    expect(latestSession.isDragging).toBe(false);
    expect(latestSession.isHudOpen).toBe(true);
    expect(updateZone).toHaveBeenCalledTimes(1);
  });

  it('case 2: ZonePolygonNode transitions isDragging, isHudOpen, onSelect, and updateZone on dragstart/dragend', () => {
    const stageRef = createRef<Konva.Stage>();
    const onSelect = vi.fn();
    const updateZone = vi.fn();
    let latestSession = { isDragging: false, isHudOpen: true };

    render(
      <TacticalStoreProvider>
        <SessionObserver
          onSnapshot={(s) => {
            latestSession = s;
          }}
        />
        <Stage ref={stageRef} width={800} height={600}>
          <Layer>
            <ZonePolygonNode
              zone={createPolygonZone()}
              stageSize={STAGE_SIZE}
              isSelected={false}
              onSelect={onSelect}
              updateZone={updateZone}
              resolvedZone={createResolvedZone('zone-poly-1')}
            />
          </Layer>
        </Stage>
      </TacticalStoreProvider>,
    );

    const stage = stageRef.current;
    expect(stage).not.toBeNull();
    const group = stage?.findOne('Group');
    expect(group).toBeDefined();

    act(() => {
      group?.fire('dragstart', {
        evt: { shiftKey: false },
        target: group,
        currentTarget: group,
      } as unknown as KonvaEventObject<DragEvent>);
    });

    expect(latestSession.isDragging).toBe(true);
    expect(latestSession.isHudOpen).toBe(false);
    expect(onSelect).toHaveBeenCalledTimes(1);

    act(() => {
      group?.x(50);
      group?.y(40);
      group?.fire('dragend', {
        evt: {},
        target: group,
        currentTarget: group,
      } as unknown as KonvaEventObject<DragEvent>);
    });

    expect(latestSession.isDragging).toBe(false);
    expect(latestSession.isHudOpen).toBe(true);
    expect(updateZone).toHaveBeenCalledTimes(1);
  });
});
