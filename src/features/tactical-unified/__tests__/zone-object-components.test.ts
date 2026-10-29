import { describe, expect, it } from 'vitest';
import { getZoneStyle } from '@/features/tactical-unified/core/components/zones/zone-geometry';
import * as PlayerComponents from '@/features/tactical-unified/objects/player/components';
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
