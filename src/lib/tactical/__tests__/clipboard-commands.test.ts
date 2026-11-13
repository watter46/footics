import { describe, expect, it } from 'vitest';
import {
  clampToScreenNorm,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import {
  type DomainSlide,
  DomainSlideSchema,
} from '@/lib/types/tactical/domain-hierarchy';
import {
  cloneAndOffsetClipboard,
  extractSelectedObjects,
} from '../domain/clipboard';
import { applySlideCommand } from '../domain/slide-reducer';

const BASE_STYLE = {
  markerType: 'circle' as const,
  insideContent: 'number' as const,
  bottomLabel: 'name' as const,
  color: '#ef4444',
  strokeColor: '#ffffff',
  strokeWidth: 2,
  sizeScale: 1,
  numberSizeScale: 1,
  labelSizeScale: 1,
};

function createClipboardSlide(): DomainSlide {
  return {
    id: 'sl-clip',
    index: 0,
    players: [
      {
        id: 'p-pitch',
        area: 'pitch',
        team: 'home',
        name: 'Saka',
        shirtNo: '7',
        x: clampToScreenNorm(30),
        y: clampToScreenNorm(40),
        style: BASE_STYLE,
        visionCone: {
          id: 'vc-1',
          angleRad: 0,
          spreadRad: 1.5,
          radius: 15,
          color: '#ffffff',
          opacity: 0.25,
          visible: true,
        },
        connectLines: [
          {
            id: 'cl-1',
            toPlayerId: 'p-other',
            lineStyle: 'solid',
            color: '#ffffff',
            strokeWidth: 2,
            visible: true,
          },
        ],
        badges: [
          {
            id: 'b-1',
            label: 'K',
            color: '#000000',
            textColor: '#ffffff',
            offsetX: 0,
            offsetY: 0,
            visible: true,
          },
        ],
        focus: {
          enabled: true,
          color: '#ffffff',
          radius: 10,
          opacity: 0.5,
          style: 'ring',
        },
        trajectory: { type: 'straight' },
      },
      {
        id: 'p-bench',
        area: 'bench',
        team: 'home',
        name: 'Trossard',
        x: clampToScreenNorm(10),
        y: clampToScreenNorm(96),
        style: BASE_STYLE,
      },
    ],
    arrows: [
      {
        id: 'a-1',
        annotationType: 'arrow',
        arrowType: 'pass',
        curveType: 'straight',
        points: [toScreenNormPoint(30, 40), toScreenNormPoint(60, 50)],
        color: '#ffffff',
        strokeWidth: 3,
        dashArray: [],
        startMarker: 'none',
        endMarker: 'arrow',
        sourcePlayerId: 'p-pitch',
      },
    ],
    zones: [
      {
        id: 'z-rect',
        annotationType: 'zone',
        shapeType: 'rect',
        zoneType: 'highlight',
        x: clampToScreenNorm(20),
        y: clampToScreenNorm(20),
        width: 15,
        height: 10,
        color: '#f59e0b',
        opacity: 0.25,
        strokeWidth: 3,
      },
      {
        id: 'z-poly',
        annotationType: 'zone',
        shapeType: 'polygon',
        zoneType: 'space',
        points: [
          toScreenNormPoint(10, 10),
          toScreenNormPoint(20, 10),
          toScreenNormPoint(15, 20),
        ],
        color: '#3b82f6',
        opacity: 0.25,
        strokeWidth: 3,
      },
    ],
    texts: [
      {
        id: 't-1',
        annotationType: 'text',
        x: clampToScreenNorm(50),
        y: clampToScreenNorm(15),
        content: 'Half space',
        fontSize: 16,
        color: '#ffffff',
        bold: false,
        italic: false,
      },
    ],
    ball: { x: clampToScreenNorm(50), y: clampToScreenNorm(50), visible: true },
    transitionDurationMs: 1000,
    pauseMs: 500,
    easing: 'ease-in-out',
  };
}

describe('domain clipboard and INSERT_ENTITIES', () => {
  it('extractSelectedObjects + cloneAndOffsetClipboard preserves unions, strips pitch attachments, remaps player arrows, and inserts cleanly', () => {
    const slide = createClipboardSlide();
    const clipboard = extractSelectedObjects(slide, [
      { id: 'p-pitch', kind: 'player' },
      { id: 'p-bench', kind: 'player' },
      { id: 'a-1', kind: 'arrow' },
      { id: 'z-rect', kind: 'zone' },
      { id: 'z-poly', kind: 'zone' },
      { id: 't-1', kind: 'text' },
    ]);

    const cloned = cloneAndOffsetClipboard(clipboard, 3, 3);
    expect(cloned.players).toHaveLength(2);
    const clonedPitch = cloned.players.find((p) => p.area === 'pitch')!;
    const clonedBench = cloned.players.find((p) => p.area === 'bench')!;
    expect(clonedPitch.x).toBe(33);
    expect(clonedPitch.visionCone).toBeUndefined();
    expect(clonedPitch.connectLines).toEqual([]);
    expect(clonedPitch.badges).toEqual([]);
    expect('badges' in clonedBench).toBe(false);
    expect(clonedBench.y).toBe(98);

    expect(cloned.arrows[0].sourcePlayerId).toBe(clonedPitch.id);

    const clonedRect = cloned.zones.find((z) => z.shapeType === 'rect')!;
    const clonedPoly = cloned.zones.find((z) => z.shapeType === 'polygon')!;
    if (clonedRect.shapeType !== 'rect') throw new Error('expected rect');
    if (clonedPoly.shapeType !== 'polygon') throw new Error('expected polygon');
    expect(clonedRect.x).toBe(23);
    expect('points' in clonedRect).toBe(false);
    expect(clonedPoly.points[0]).toEqual({ x: 13, y: 13 });
    expect('x' in clonedPoly).toBe(false);

    const nextSlide = applySlideCommand(slide, {
      type: 'INSERT_ENTITIES',
      players: cloned.players,
      arrows: cloned.arrows,
      zones: cloned.zones,
      texts: cloned.texts,
    });
    expect(nextSlide.players).toHaveLength(4);
    expect(nextSlide.arrows).toHaveLength(2);
    expect(nextSlide.zones).toHaveLength(4);
    expect(nextSlide.texts).toHaveLength(2);
    expect(() => DomainSlideSchema.parse(nextSlide)).not.toThrow();
  });
});
