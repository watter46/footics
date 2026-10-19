import { describe, expect, it } from 'vitest';
import type { SelectedObject } from '@/features/tactical-unified/stores/tactical-unified-store';
import type { Slide } from '@/lib/types/tactical-unified';
import { inspectorRegistry } from '../inspector-registry';

function createMockSlide(): Slide {
  return {
    id: 'slide-1',
    index: 0,
    label: 'Slide 1',
    transitionDurationMs: 1000,
    pauseMs: 500,
    easing: 'ease-in-out',
    players: [
      {
        id: 'p1',
        name: 'Player One',
        shirtNo: '10',
        team: 'home',
        area: 'pitch',
        x: 50,
        y: 50,
        connectLines: [],
        badges: [],
        style: {
          markerType: 'circle',
          insideContent: 'number',
          bottomLabel: 'name',
          color: '#3b82f6',
          strokeColor: '#ffffff',
          strokeWidth: 2,
          sizeScale: 1.0,
          numberSizeScale: 1.0,
          labelSizeScale: 1.0,
        },
      },
      {
        id: 'p2',
        name: 'Player Two',
        shirtNo: '',
        team: 'home',
        area: 'pitch',
        x: 60,
        y: 60,
        connectLines: [],
        badges: [],
        style: {
          markerType: 'circle',
          insideContent: 'number',
          bottomLabel: 'name',
          color: '#ef4444',
          strokeColor: '#ffffff',
          strokeWidth: 2,
          sizeScale: 1.0,
          numberSizeScale: 1.0,
          labelSizeScale: 1.0,
        },
      },
      {
        id: 'ring-1',
        name: 'Ring Marker',
        team: 'neutral',
        area: 'pitch',
        x: 40,
        y: 40,
        connectLines: [],
        badges: [],
        style: {
          markerType: 'ring',
          insideContent: 'none',
          bottomLabel: 'none',
          color: '#10b981',
          strokeColor: '#10b981',
          strokeWidth: 2,
          sizeScale: 1.0,
          numberSizeScale: 1.0,
          labelSizeScale: 1.0,
        },
      },
    ],
    arrows: [
      {
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
      },
    ],
    zones: [
      {
        id: 'zone-1',
        annotationType: 'zone',
        zoneType: 'generic',
        points: [
          { x: 20, y: 20 },
          { x: 50, y: 20 },
          { x: 50, y: 50 },
          { x: 20, y: 50 },
        ],
        color: '#ffffff',
        opacity: 0.3,
        strokeWidth: 1,
      },
    ],
    texts: [
      {
        id: 'text-1',
        annotationType: 'text',
        content: 'Sample Note',
        x: 10,
        y: 10,
        fontSize: 14,
        color: '#ffffff',
        bold: false,
        italic: false,
      },
    ],
    ball: { x: 50, y: 50, visible: true },
  };
}

describe('inspectorRegistry', () => {
  const mockSlide = createMockSlide();

  it('registers all required object kinds', () => {
    const requiredKinds = [
      'player',
      'arrow',
      'zone',
      'text',
      'ball',
      'vision-cone',
      'connect-line',
      'focus',
    ] as const;

    for (const kind of requiredKinds) {
      expect(inspectorRegistry[kind]).toBeDefined();
      expect(typeof inspectorRegistry[kind]?.getTitle).toBe('function');
      expect(inspectorRegistry[kind]?.component).toBeDefined();
    }
  });

  describe('getTitle resolutions', () => {
    it('generates correct title for standard player with shirt number', () => {
      const selected: SelectedObject = { id: 'p1', kind: 'player' };
      const title = inspectorRegistry.player?.getTitle(selected, mockSlide);
      expect(title).toBe('Player #10');
    });

    it('generates correct title for standard player without shirt number', () => {
      const selected: SelectedObject = { id: 'p2', kind: 'player' };
      const title = inspectorRegistry.player?.getTitle(selected, mockSlide);
      expect(title).toBe('Player');
    });

    it('generates correct title for ring player marker', () => {
      const selected: SelectedObject = { id: 'ring-1', kind: 'player' };
      const title = inspectorRegistry.player?.getTitle(selected, mockSlide);
      expect(title).toBe('Ring');
    });

    it('generates fallback title when player is not found', () => {
      const selected: SelectedObject = { id: 'unknown-id', kind: 'player' };
      const title = inspectorRegistry.player?.getTitle(selected, mockSlide);
      expect(title).toBe('Player');
    });

    it('generates correct title for arrow', () => {
      const selected: SelectedObject = { id: 'arrow-1', kind: 'arrow' };
      const title = inspectorRegistry.arrow?.getTitle(selected, mockSlide);
      expect(title).toBe('Arrow & Line');
    });

    it('generates correct title for zone', () => {
      const selected: SelectedObject = { id: 'zone-1', kind: 'zone' };
      const title = inspectorRegistry.zone?.getTitle(selected, mockSlide);
      expect(title).toBe('Zone');
    });

    it('generates correct title for text', () => {
      const selected: SelectedObject = { id: 'text-1', kind: 'text' };
      const title = inspectorRegistry.text?.getTitle(selected, mockSlide);
      expect(title).toBe('Text');
    });

    it('generates correct title for ball', () => {
      const selected: SelectedObject = { id: 'ball', kind: 'ball' };
      const title = inspectorRegistry.ball?.getTitle(selected, mockSlide);
      expect(title).toBe('Ball');
    });

    it('generates correct title for vision-cone', () => {
      const selected: SelectedObject = {
        id: 'vision-p1',
        kind: 'vision-cone',
        parentPlayerId: 'p1',
      };
      const title = inspectorRegistry['vision-cone']?.getTitle(
        selected,
        mockSlide,
      );
      expect(title).toBe('Vision Cone');
    });

    it('generates correct title for connect-line', () => {
      const selected: SelectedObject = {
        id: 'connect-p1',
        kind: 'connect-line',
        parentPlayerId: 'p1',
      };
      const title = inspectorRegistry['connect-line']?.getTitle(
        selected,
        mockSlide,
      );
      expect(title).toBe('Connect Line');
    });

    it('generates correct title for focus', () => {
      const selected: SelectedObject = {
        id: 'focus-p1',
        kind: 'focus',
        parentPlayerId: 'p1',
      };
      const title = inspectorRegistry.focus?.getTitle(selected, mockSlide);
      expect(title).toBe('Focus Spotlight');
    });
  });
});
