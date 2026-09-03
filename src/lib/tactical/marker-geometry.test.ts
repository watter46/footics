import { describe, expect, it } from 'vitest';
import type { Player } from '@/lib/types/tactical-unified';
import {
  getMarkerBoundaryPoint,
  getPlayerMarkerRadius,
} from './marker-geometry';

describe('marker-geometry', () => {
  const stageSize = { width: 1000, height: 600 };

  const createPlayer = (markerType: 'circle' | 'ring'): Player => ({
    id: 'p1',
    team: 'home',
    area: 'pitch',
    x: 50,
    y: 50,
    connectLines: [],
    badges: [],
    style: {
      markerType,
      insideContent: 'number',
      bottomLabel: 'name',
      color: '#ff0000',
      strokeColor: '#ffffff',
      strokeWidth: 2,
      sizeScale: 1.0,
      numberSizeScale: 1.0,
      labelSizeScale: 1.0,
    },
  });

  it('calculates player radius correctly based on stage min dimension', () => {
    const player = createPlayer('circle');
    const radius = getPlayerMarkerRadius(player, stageSize);
    // min(1000, 600) * 0.032 * 1.0 = 19.2
    expect(radius).toBeCloseTo(19.2);
  });

  it('returns boundary points offset by ellipse for ring marker', () => {
    const player = createPlayer('ring');
    const center = { x: 500, y: 300 };
    const radius = getPlayerMarkerRadius(player, stageSize);
    const rx = radius * 1.15;
    const ry = radius * 0.55;

    // Target to the right (dx > 0, dy = 0)
    const rightTarget = { x: 700, y: 300 };
    const rightPt = getMarkerBoundaryPoint(
      center,
      rightTarget,
      player,
      stageSize,
      true,
    );
    expect(rightPt.x).toBeCloseTo(center.x + rx);
    expect(rightPt.y).toBeCloseTo(center.y);

    // Target to the bottom (dx = 0, dy > 0)
    const bottomTarget = { x: 500, y: 500 };
    const bottomPt = getMarkerBoundaryPoint(
      center,
      bottomTarget,
      player,
      stageSize,
      true,
    );
    expect(bottomPt.x).toBeCloseTo(center.x);
    expect(bottomPt.y).toBeCloseTo(center.y + ry);
  });

  it('returns center point unmodified when onlyRing=true and marker is circle', () => {
    const player = createPlayer('circle');
    const center = { x: 500, y: 300 };
    const target = { x: 700, y: 300 };
    const pt = getMarkerBoundaryPoint(center, target, player, stageSize, true);
    expect(pt.x).toBe(center.x);
    expect(pt.y).toBe(center.y);
  });
});
