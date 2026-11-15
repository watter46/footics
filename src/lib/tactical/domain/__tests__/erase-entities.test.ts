import { describe, expect, it } from 'vitest';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import { DomainSlideSchema } from '@/lib/types/tactical/domain-hierarchy';
import { eraseEntitiesAtPoint } from '../erase-entities';

function createBaseSlide(overrides: Record<string, unknown> = {}): DomainSlide {
  return DomainSlideSchema.parse({
    id: 'slide-1',
    index: 0,
    ...overrides,
  });
}

describe('eraseEntitiesAtPoint', () => {
  it('erases hit arrow, rect/ellipse/polygon zones, text, and ring markers', () => {
    const slide = createBaseSlide({
      arrows: [
        {
          id: 'arrow-1',
          annotationType: 'arrow',
          arrowType: 'pass',
          curveType: 'straight',
          points: [
            { x: clampToScreenNorm(10), y: clampToScreenNorm(10) },
            { x: clampToScreenNorm(30), y: clampToScreenNorm(10) },
          ],
          color: '#ffffff',
          strokeWidth: 2,
        },
      ],
      zones: [
        {
          id: 'zone-rect',
          annotationType: 'zone',
          zoneType: 'generic',
          shapeType: 'rect',
          x: clampToScreenNorm(40),
          y: clampToScreenNorm(40),
          width: 20,
          height: 20,
          color: '#ff0000',
          opacity: 0.3,
          strokeWidth: 1,
        },
        {
          id: 'zone-ellipse',
          annotationType: 'zone',
          zoneType: 'generic',
          shapeType: 'ellipse',
          x: clampToScreenNorm(70),
          y: clampToScreenNorm(70),
          width: 10,
          height: 10,
          color: '#00ff00',
          opacity: 0.3,
          strokeWidth: 1,
        },
        {
          id: 'zone-poly',
          annotationType: 'zone',
          zoneType: 'generic',
          shapeType: 'polygon',
          points: [
            { x: clampToScreenNorm(5), y: clampToScreenNorm(80) },
            { x: clampToScreenNorm(15), y: clampToScreenNorm(80) },
            { x: clampToScreenNorm(10), y: clampToScreenNorm(90) },
          ],
          color: '#0000ff',
          opacity: 0.3,
          strokeWidth: 1,
        },
      ],
      texts: [
        {
          id: 'text-1',
          annotationType: 'text',
          x: clampToScreenNorm(25),
          y: clampToScreenNorm(25),
          content: 'Press',
          fontSize: 14,
          color: '#ffffff',
          bold: false,
          italic: false,
        },
      ],
      players: [
        {
          id: 'ring-1',
          team: 'home',
          area: 'pitch',
          shirtNo: '',
          name: '',
          x: clampToScreenNorm(50),
          y: clampToScreenNorm(20),
          style: { markerType: 'ring', color: '#034694' },
        },
        {
          id: 'ring-fade-1',
          team: 'away',
          area: 'pitch',
          shirtNo: '',
          name: '',
          x: clampToScreenNorm(60),
          y: clampToScreenNorm(20),
          style: { markerType: 'ring-fade', color: '#da291c' },
          badges: [],
          connectLines: [],
        },
      ],
    });

    expect(eraseEntitiesAtPoint(slide, { x: 20, y: 10 })).toEqual(['arrow-1']);
    expect(eraseEntitiesAtPoint(slide, { x: 50, y: 50 })).toEqual([
      'zone-rect',
    ]);
    expect(eraseEntitiesAtPoint(slide, { x: 75, y: 75 })).toEqual([
      'zone-ellipse',
    ]);
    expect(eraseEntitiesAtPoint(slide, { x: 10, y: 83 })).toEqual([
      'zone-poly',
    ]);
    expect(eraseEntitiesAtPoint(slide, { x: 25, y: 25 })).toEqual(['text-1']);
    expect(eraseEntitiesAtPoint(slide, { x: 50, y: 20 })).toEqual(['ring-1']);
    expect(eraseEntitiesAtPoint(slide, { x: 60, y: 20 })).toEqual([
      'ring-fade-1',
    ]);
  });

  it('ignores regular players and bench ring markers at hit coordinates', () => {
    const slide = createBaseSlide({
      players: [
        {
          id: 'player-regular',
          team: 'home',
          area: 'pitch',
          shirtNo: '10',
          name: 'Palmer',
          x: clampToScreenNorm(50),
          y: clampToScreenNorm(50),
          style: { markerType: 'circle', color: '#034694' },
          badges: [],
          connectLines: [],
        },
        {
          id: 'player-ring-with-shirt',
          team: 'home',
          area: 'pitch',
          shirtNo: '7',
          name: '',
          x: clampToScreenNorm(50),
          y: clampToScreenNorm(50),
          style: { markerType: 'ring', color: '#034694' },
        },
        {
          id: 'ring-bench',
          team: 'home',
          area: 'bench',
          shirtNo: '',
          name: '',
          x: clampToScreenNorm(50),
          y: clampToScreenNorm(50),
          style: { markerType: 'ring', color: '#034694' },
        },
      ],
    });

    expect(eraseEntitiesAtPoint(slide, { x: 50, y: 50 })).toEqual([]);
  });

  it('skips locked arrow, zone, text, and ring marker', () => {
    const slide = createBaseSlide({
      arrows: [
        {
          id: 'arrow-locked',
          annotationType: 'arrow',
          arrowType: 'pass',
          curveType: 'straight',
          points: [
            { x: clampToScreenNorm(50), y: clampToScreenNorm(50) },
            { x: clampToScreenNorm(60), y: clampToScreenNorm(50) },
          ],
          color: '#ffffff',
          strokeWidth: 2,
          locked: true,
        },
      ],
      zones: [
        {
          id: 'zone-locked',
          annotationType: 'zone',
          zoneType: 'generic',
          shapeType: 'rect',
          x: clampToScreenNorm(45),
          y: clampToScreenNorm(45),
          width: 10,
          height: 10,
          color: '#ff0000',
          opacity: 0.3,
          strokeWidth: 1,
          locked: true,
        },
      ],
      texts: [
        {
          id: 'text-locked',
          annotationType: 'text',
          x: clampToScreenNorm(50),
          y: clampToScreenNorm(50),
          content: 'Locked',
          fontSize: 14,
          color: '#ffffff',
          bold: false,
          italic: false,
          locked: true,
        },
      ],
      players: [
        {
          id: 'ring-locked',
          team: 'home',
          area: 'pitch',
          shirtNo: '',
          name: '',
          x: clampToScreenNorm(50),
          y: clampToScreenNorm(50),
          style: { markerType: 'ring', color: '#034694' },
          badges: [],
          connectLines: [],
          locked: true,
        },
      ],
    });

    expect(eraseEntitiesAtPoint(slide, { x: 50, y: 50 })).toEqual([]);
  });
});
