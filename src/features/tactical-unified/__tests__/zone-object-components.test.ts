import { describe, expect, it } from 'vitest';
import { getZoneStyle } from '@/features/tactical-unified/objects/zone';
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

  it('getZoneStyle calculates fillRGBA and preserves stroke settings', () => {
    const style = getZoneStyle(sampleZone);
    expect(style.strokeColor).toBe('#1d4ed8');
    expect(style.strokeWidth).toBe(3);
    // opacity 0.5 -> alpha hex 80 (128)
    expect(style.fillRGBA).toBe('#3b82f680');
  });

  it('getZoneStyle handles default opacity and fallback colors', () => {
    const defaultZone: ZoneAnnotation = {
      id: 'zone-default',
      annotationType: 'zone',
      zoneType: 'generic',
      shapeType: 'polygon',
      points: [{ x: 5, y: 5 }],
      color: '#22c55e',
      opacity: 0.25,
      strokeWidth: 2,
    };
    const style = getZoneStyle(defaultZone);
    expect(style.strokeColor).toBe('#22c55e');
    expect(style.strokeWidth).toBe(2);
    // 0.25 * 255 = 64 -> 40 in hex
    expect(style.fillRGBA).toBe('#22c55e40');
  });
});
