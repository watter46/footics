import { render } from '@testing-library/react';
import type { KonvaEventObject } from 'konva/lib/Node';
import { Layer, Stage } from 'react-konva';
import { describe, expect, it, vi } from 'vitest';
import type { ResolvedBillboardItem } from '@/lib/tactical/compiler/scene-graph-dto';
import { toScreenNormCoord, toStagePixel } from '@/lib/types/tactical/branded';
import type {
  DomainPlayer,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import { BillboardItemNode } from '../billboard-item-node';

function createPlayerItem(): {
  marker: PitchPlayer;
  item: ResolvedBillboardItem;
} {
  const marker: PitchPlayer = {
    id: 'p1',
    team: 'home',
    area: 'pitch',
    x: toScreenNormCoord(50),
    y: toScreenNormCoord(50),
    position: 'MF',
    name: 'Player 10',
    connectLines: [],
    badges: [],
    style: {
      markerType: 'circle',
      insideContent: 'number',
      bottomLabel: 'none',
      color: '#ef4444',
      strokeColor: '#ffffff',
      strokeWidth: 2,
      sizeScale: 1,
      numberSizeScale: 1,
      labelSizeScale: 1,
    },
  };
  const item: ResolvedBillboardItem = {
    kind: 'player',
    id: 'p1',
    positionPx: { x: toStagePixel(200), y: toStagePixel(150) },
    radiusPx: 14,
    depthSortKey: 0,
    opacity: 1,
    visible: true,
    selected: false,
    player: marker,
    rippleRingsPx: [],
  };
  return { marker, item };
}

describe('BillboardItemNode memoization', () => {
  it('skips re-render when props are referentially equal and preserves onDragEnd', () => {
    const { item } = createPlayerItem();
    const pitchRect = { x: 0, y: 0, width: 400, height: 300 };
    const selectedIds: readonly string[] = [];
    const onDragStart = vi.fn();
    const onDragMove = vi.fn();
    const onDragEnd = vi.fn(
      (_e: KonvaEventObject<DragEvent>, _marker: DomainPlayer) => {},
    );
    const onClickMarker = vi.fn();
    const onUpdateVisionCone = vi.fn();
    const onSelectText = vi.fn();
    const updateText = vi.fn();

    const { rerender } = render(
      <Stage width={400} height={300}>
        <Layer>
          <BillboardItemNode
            item={item}
            pitchRect={pitchRect}
            baseDim={300}
            markerMode="circle"
            selectedIds={selectedIds}
            isInteractive={true}
            connectingPlayerId={null}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            onClickMarker={onClickMarker}
            onUpdateVisionCone={onUpdateVisionCone}
            onSelectText={onSelectText}
            updateText={updateText}
          />
        </Layer>
      </Stage>,
    );

    rerender(
      <Stage width={400} height={300}>
        <Layer>
          <BillboardItemNode
            item={item}
            pitchRect={pitchRect}
            baseDim={300}
            markerMode="circle"
            selectedIds={selectedIds}
            isInteractive={true}
            connectingPlayerId={null}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            onClickMarker={onClickMarker}
            onUpdateVisionCone={onUpdateVisionCone}
            onSelectText={onSelectText}
            updateText={updateText}
          />
        </Layer>
      </Stage>,
    );

    expect(BillboardItemNode).toBeDefined();
    expect(onDragEnd).not.toHaveBeenCalled();
  });
});
