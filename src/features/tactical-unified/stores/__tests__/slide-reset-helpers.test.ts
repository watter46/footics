import { describe, expect, it } from 'vitest';
import {
  type ArrowAnnotation,
  type BoundaryBox,
  createDefaultPlayer,
  createDefaultSlide,
  type TextAnnotation,
  type ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import {
  filterLockedSelectedObjects,
  resetSlideObjectsData,
} from '../slide-reset-helpers';

describe('slide-reset-helpers', () => {
  const defaultBox: BoundaryBox = {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    enabled: true,
    visible: true,
  };

  const arrowUnlocked: ArrowAnnotation = {
    id: 'arrow-1',
    annotationType: 'arrow',
    arrowType: 'pass',
    curveType: 'straight',
    points: [
      { x: 10, y: 10 },
      { x: 20, y: 20 },
    ],
    color: '#ffffff',
    strokeWidth: 2,
    dashArray: [],
    arrowHead: true,
    locked: false,
  };

  const arrowLocked: ArrowAnnotation = {
    id: 'arrow-locked',
    annotationType: 'arrow',
    arrowType: 'pass',
    curveType: 'straight',
    points: [
      { x: 30, y: 30 },
      { x: 40, y: 40 },
    ],
    color: '#ffffff',
    strokeWidth: 2,
    dashArray: [],
    arrowHead: true,
    locked: true,
  };

  const zoneUnlocked: ZoneAnnotation = {
    id: 'zone-1',
    annotationType: 'zone',
    zoneType: 'generic',
    points: [
      { x: 10, y: 10 },
      { x: 30, y: 10 },
      { x: 30, y: 30 },
      { x: 10, y: 30 },
    ],
    color: '#3b82f6',
    opacity: 0.3,
    strokeWidth: 1,
    locked: false,
  };

  const zoneLocked: ZoneAnnotation = {
    id: 'zone-locked',
    annotationType: 'zone',
    zoneType: 'generic',
    points: [
      { x: 30, y: 30 },
      { x: 50, y: 30 },
      { x: 50, y: 50 },
      { x: 30, y: 50 },
    ],
    color: '#3b82f6',
    opacity: 0.3,
    strokeWidth: 1,
    locked: true,
  };

  const textUnlocked: TextAnnotation = {
    id: 'text-1',
    annotationType: 'text',
    content: 'hello',
    x: 10,
    y: 10,
    color: '#ffffff',
    fontSize: 16,
    bold: false,
    italic: false,
    locked: false,
  };

  const p1 = {
    ...createDefaultPlayer('home', 20, 20, '#000000'),
    id: 'p-1',
    shirtNo: '7',
    visionCone: {
      id: 'vc-1',
      angleRad: 0.5,
      spreadRad: 0.8,
      radius: 20,
      color: '#ffffff',
      opacity: 0.3,
      visible: true,
    },
    connectLines: [
      {
        id: 'cl-1',
        toPlayerId: 'p-2',
        color: '#ffffff',
        lineStyle: 'solid' as const,
        strokeWidth: 2,
        visible: true,
      },
    ],
    badges: [
      {
        id: 'b-1',
        label: 'C',
        color: '#ff0000',
        textColor: '#ffffff',
        offsetX: 0,
        offsetY: 0,
        visible: true,
      },
    ],
  };

  const pLocked = {
    ...createDefaultPlayer('away', 50, 50, '#ff0000'),
    id: 'p-locked',
    shirtNo: '9',
    locked: true,
  };

  const pRing = {
    ...createDefaultPlayer('home', 60, 60, '#0000ff'),
    id: 'p-ring',
    shirtNo: '11',
    style: {
      ...createDefaultPlayer('home', 60, 60, '#0000ff').style,
      markerType: 'ring' as const,
    },
  };

  const sampleSlide = {
    ...createDefaultSlide(0, 's-1'),
    arrows: [arrowUnlocked, arrowLocked],
    zones: [zoneUnlocked, zoneLocked],
    texts: [textUnlocked],
    players: [p1, pLocked, pRing],
  };

  it('preserves non-ring players and clears arrows/zones/texts while preserving locked items', () => {
    const result = resetSlideObjectsData(sampleSlide, defaultBox);

    // Unlocked arrows, zones, texts are cleared
    expect(result.arrows.map((a) => a.id)).toEqual(['arrow-locked']);
    expect(result.zones.map((z) => z.id)).toEqual(['zone-locked']);
    expect(result.texts).toEqual([]);

    // 2D player marker is preserved but reset options
    const preservedP1 = result.players.find((p) => p.id === 'p-1');
    expect(preservedP1).toBeDefined();
    expect(preservedP1?.visionCone).toBeUndefined();
    expect(preservedP1?.connectLines).toEqual([]);
    expect(preservedP1?.badges).toEqual([]);

    // Locked player is preserved intact
    const preservedPLocked = result.players.find((p) => p.id === 'p-locked');
    expect(preservedPLocked).toBeDefined();

    // 3D ring player (unlocked) is filtered out
    const preservedPRing = result.players.find((p) => p.id === 'p-ring');
    expect(preservedPRing).toBeUndefined();
  });

  it('filters locked selected objects', () => {
    const selected = [
      { id: 'arrow-1', kind: 'arrow' as const },
      { id: 'arrow-locked', kind: 'arrow' as const },
      { id: 'p-1', kind: 'player' as const },
      { id: 'p-locked', kind: 'player' as const },
    ];

    const lockedOnly = filterLockedSelectedObjects(selected, sampleSlide);
    expect(lockedOnly).toEqual([
      { id: 'arrow-locked', kind: 'arrow' },
      { id: 'p-locked', kind: 'player' },
    ]);
  });
});
