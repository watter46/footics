import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { useKeyboardShortcuts } from '@/features/tactical-unified/hooks/use-keyboard-shortcuts';
import {
  TacticalStoreProvider,
  useTacticalStoresContext,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import type { DomainPlayer } from '@/lib/types/tactical/domain-entities';

const n = (v: number) => v as DomainPlayer['x'];

function useShortcutTestHarness() {
  useKeyboardShortcuts();
  return useTacticalStoresContext();
}

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(TacticalStoreProvider, null, children);

describe('useKeyboardShortcuts Select All (Mod+A)', () => {
  it('case 1: Ctrl+A / Cmd+A selects all arrows, zones, texts, and players on activeSlide in order', () => {
    const { result } = renderHook(() => useShortcutTestHarness(), { wrapper });
    const { documentStore, sessionStore } = result.current;

    const { activePhaseId, activeSlideId } = sessionStore.getState();

    act(() => {
      documentStore.getState().dispatch({
        type: 'APPLY_SLIDE_COMMAND',
        phaseId: activePhaseId,
        slideId: activeSlideId,
        command: {
          type: 'ADD_ARROW',
          arrow: {
            id: 'arrow-1',
            annotationType: 'arrow',
            arrowType: 'pass',
            curveType: 'straight',
            points: [
              { x: n(0.1), y: n(0.1) },
              { x: n(0.5), y: n(0.5) },
            ],
            color: '#ffffff',
            strokeWidth: 2,
            dashArray: [],
            startMarker: 'none',
            endMarker: 'arrow',
          },
        },
      });
      documentStore.getState().dispatch({
        type: 'APPLY_SLIDE_COMMAND',
        phaseId: activePhaseId,
        slideId: activeSlideId,
        command: {
          type: 'ADD_ZONE',
          zone: {
            id: 'zone-1',
            annotationType: 'zone',
            zoneType: 'space',
            shapeType: 'rect',
            x: n(0.2),
            y: n(0.2),
            width: 0.3,
            height: 0.3,
            color: '#00ff00',
            strokeWidth: 2,
            opacity: 0.3,
          },
        },
      });
      documentStore.getState().dispatch({
        type: 'APPLY_SLIDE_COMMAND',
        phaseId: activePhaseId,
        slideId: activeSlideId,
        command: {
          type: 'ADD_TEXT',
          text: {
            id: 'text-1',
            annotationType: 'text',
            x: n(0.4),
            y: n(0.4),
            content: 'Press',
            fontSize: 16,
            color: '#ffffff',
            bold: false,
            italic: false,
          },
        },
      });
      documentStore.getState().dispatch({
        type: 'APPLY_SLIDE_COMMAND',
        phaseId: activePhaseId,
        slideId: activeSlideId,
        command: {
          type: 'ADD_PLAYER',
          player: {
            id: 'player-1',
            area: 'pitch',
            team: 'home',
            x: n(0.5),
            y: n(0.5),
            connectLines: [],
            badges: [],
            style: {
              markerType: 'circle',
              insideContent: 'none',
              bottomLabel: 'none',
              color: '#ff0000',
              strokeColor: '#ffffff',
              strokeWidth: 2,
              sizeScale: 1,
              numberSizeScale: 1,
              labelSizeScale: 1,
            },
          },
        },
      });
    });

    expect(sessionStore.getState().selectedObjects).toHaveLength(0);

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'a',
          code: 'KeyA',
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    const selected = sessionStore.getState().selectedObjects;
    expect(selected.slice(0, 3).map((o) => o.kind)).toEqual([
      'arrow',
      'zone',
      'text',
    ]);
    expect(selected.slice(3).length).toBeGreaterThanOrEqual(1);
    expect(selected.slice(3).every((o) => o.kind === 'player')).toBe(true);
    expect(selected.slice(0, 3).map((o) => o.id)).toEqual([
      'arrow-1',
      'zone-1',
      'text-1',
    ]);
    expect(
      selected.some((o) => o.kind === 'player' && o.id === 'player-1'),
    ).toBe(true);
  });

  it('case 2: Ctrl+A while input or textarea is focused does not change selectedObjects', () => {
    const { result } = renderHook(() => useShortcutTestHarness(), { wrapper });
    const { documentStore, sessionStore } = result.current;

    const { activePhaseId, activeSlideId } = sessionStore.getState();

    act(() => {
      documentStore.getState().dispatch({
        type: 'APPLY_SLIDE_COMMAND',
        phaseId: activePhaseId,
        slideId: activeSlideId,
        command: {
          type: 'ADD_PLAYER',
          player: {
            id: 'player-1',
            area: 'pitch',
            team: 'home',
            x: n(0.5),
            y: n(0.5),
            connectLines: [],
            badges: [],
            style: {
              markerType: 'circle',
              insideContent: 'none',
              bottomLabel: 'none',
              color: '#ff0000',
              strokeColor: '#ffffff',
              strokeWidth: 2,
              sizeScale: 1,
              numberSizeScale: 1,
              labelSizeScale: 1,
            },
          },
        },
      });
    });

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    try {
      act(() => {
        input.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'a',
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
          }),
        );
      });

      expect(sessionStore.getState().selectedObjects).toHaveLength(0);
    } finally {
      document.body.removeChild(input);
    }
  });
});
