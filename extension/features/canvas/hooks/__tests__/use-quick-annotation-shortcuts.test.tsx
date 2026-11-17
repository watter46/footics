import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  TacticalStoreProvider,
  useTacticalStoresContext,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type { DomainPlayer } from '@/lib/types/tactical/domain-entities';
import { useQuickAnnotationShortcuts } from '../use-quick-annotation-shortcuts';

function makePlayer(
  id: string,
  name: string,
  x: number,
  y: number,
): DomainPlayer {
  return {
    id,
    team: 'home',
    name,
    x: clampToScreenNorm(x, 0, 100),
    y: clampToScreenNorm(y, 0, 100),
    area: 'pitch',
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
    connectLines: [],
    badges: [],
  };
}

function TestHarness({
  onStoresReady,
}: {
  onStoresReady: (stores: ReturnType<typeof useTacticalStoresContext>) => void;
}) {
  useQuickAnnotationShortcuts();
  const stores = useTacticalStoresContext();
  onStoresReady(stores);
  return <input data-testid="text-input" type="text" />;
}

function setup() {
  let stores!: ReturnType<typeof useTacticalStoresContext>;
  const utils = render(
    <TacticalStoreProvider>
      <TestHarness
        onStoresReady={(s) => {
          stores = s;
        }}
      />
    </TacticalStoreProvider>,
  );
  return { ...utils, stores };
}

describe('useQuickAnnotationShortcuts', () => {
  it('handles tool shortcuts, Escape, Delete, Ctrl+A, Ctrl+C + Ctrl+V, and Ctrl+D', () => {
    const { stores } = setup();
    const { documentStore, sessionStore } = stores;

    const phase = documentStore.getState().project.phases[0];
    const slide = phase.slides[0];
    const initialCount = slide.players.length;

    act(() => {
      documentStore.getState().dispatchSlide(phase.id, slide.id, {
        type: 'ADD_PLAYER',
        player: makePlayer('p1', 'Test', 50, 50),
      });
    });

    // Tool shortcut ('v' -> select)
    act(() => {
      sessionStore.getState().setActiveTool('arrow_solid');
    });
    act(() => {
      fireEvent.keyDown(document, { key: 'v', code: 'KeyV' });
    });
    expect(sessionStore.getState().activeTool).toBe('select');

    // Ctrl+A (Select All)
    act(() => {
      fireEvent.keyDown(document, { key: 'a', code: 'KeyA', ctrlKey: true });
    });
    expect(sessionStore.getState().selectedObjects).toHaveLength(
      initialCount + 1,
    );

    // Ctrl+C + Ctrl+V (Copy + Paste)
    act(() => {
      fireEvent.keyDown(document, { key: 'c', code: 'KeyC', ctrlKey: true });
    });
    expect(sessionStore.getState().clipboard?.players).toHaveLength(
      initialCount + 1,
    );

    act(() => {
      fireEvent.keyDown(document, { key: 'v', code: 'KeyV', ctrlKey: true });
    });
    expect(
      documentStore.getState().project.phases[0].slides[0].players,
    ).toHaveLength((initialCount + 1) * 2);

    // Ctrl+D (Duplicate)
    act(() => {
      fireEvent.keyDown(document, { key: 'd', code: 'KeyD', ctrlKey: true });
    });
    expect(
      documentStore.getState().project.phases[0].slides[0].players,
    ).toHaveLength((initialCount + 1) * 3);

    // Escape clears selection and resets tool to select
    act(() => {
      sessionStore.getState().setActiveTool('text');
    });
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    });
    expect(sessionStore.getState().selectedObjects).toHaveLength(0);
    expect(sessionStore.getState().activeTool).toBe('select');

    // Delete removes selected entities
    act(() => {
      sessionStore.getState().selectObjects([{ id: 'p1', kind: 'player' }]);
    });
    act(() => {
      fireEvent.keyDown(document, { key: 'Delete', code: 'Delete' });
    });
    expect(
      documentStore
        .getState()
        .project.phases[0].slides[0].players.some((p) => p.id === 'p1'),
    ).toBe(false);
    expect(sessionStore.getState().selectedObjects).toHaveLength(0);
  });

  it('does not register Undo/Redo (Ctrl+Z / Ctrl+Shift+Z)', () => {
    const { stores } = setup();
    const { documentStore } = stores;
    const phase = documentStore.getState().project.phases[0];
    const slideId = phase.slides[0].id;
    const initialCount = phase.slides[0].players.length;

    act(() => {
      documentStore.getState().dispatchSlide(phase.id, slideId, {
        type: 'ADD_PLAYER',
        player: makePlayer('p-undo', 'Striker', 40, 40),
      });
    });

    expect(documentStore.getState().canUndo()).toBe(true);

    act(() => {
      fireEvent.keyDown(document, { key: 'z', code: 'KeyZ', ctrlKey: true });
    });
    expect(documentStore.getState().canUndo()).toBe(true);
    expect(
      documentStore.getState().project.phases[0].slides[0].players,
    ).toHaveLength(initialCount + 1);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'z',
        code: 'KeyZ',
        ctrlKey: true,
        shiftKey: true,
      });
    });
    expect(documentStore.getState().canRedo()).toBe(false);
  });

  it('ignores shortcuts when an input element is focused', () => {
    const { getByTestId, stores } = setup();
    const { documentStore, sessionStore } = stores;
    const phase = documentStore.getState().project.phases[0];
    const slideId = phase.slides[0].id;
    const initialCount = phase.slides[0].players.length;

    act(() => {
      documentStore.getState().dispatchSlide(phase.id, slideId, {
        type: 'ADD_PLAYER',
        player: makePlayer('p-input', 'Winger', 30, 30),
      });
      sessionStore.getState().setActiveTool('arrow_solid');
      sessionStore
        .getState()
        .selectObjects([{ id: 'p-input', kind: 'player' }]);
    });

    const input = getByTestId('text-input');
    input.focus();

    act(() => {
      fireEvent.keyDown(input, { key: 'v', code: 'KeyV' });
      fireEvent.keyDown(input, { key: 'Delete', code: 'Delete' });
    });

    expect(sessionStore.getState().activeTool).toBe('arrow_solid');
    expect(
      documentStore.getState().project.phases[0].slides[0].players,
    ).toHaveLength(initialCount + 1);
  });
});
