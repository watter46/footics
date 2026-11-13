import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { TopBarHistory } from '../top-bar-history';

function createTestStores() {
  const project = createDefaultTacticalProject();
  const p0 = project.phases[0];
  return {
    documentStore: createDocumentStore(project),
    sessionStore: createSessionStore({
      activePhaseId: p0?.id ?? '',
      activeSlideId: p0?.slides[0]?.id ?? '',
    }),
    playbackStore: createPlaybackStore(),
  };
}

describe('TopBarHistory', () => {
  it('renders undo and redo buttons with IconButton accessibility attributes', () => {
    const stores = createTestStores();
    render(
      <TacticalStoreProvider stores={stores}>
        <TopBarHistory />
      </TacticalStoreProvider>,
    );

    const undoButton = screen.getByRole('button', { name: 'Undo' });
    const redoButton = screen.getByRole('button', { name: 'Redo' });

    expect(undoButton).toBeDefined();
    expect(redoButton).toBeDefined();
    expect((undoButton as HTMLButtonElement).disabled).toBe(true);
    expect((redoButton as HTMLButtonElement).disabled).toBe(true);
  });

  it('calls undo and redo on click when enabled', () => {
    const stores = createTestStores();
    const initialTitle = stores.documentStore.getState().project.title;
    stores.documentStore.getState().dispatch({
      type: 'UPDATE_PROJECT_META',
      patch: { title: 'Renamed Tactics' },
    });

    render(
      <TacticalStoreProvider stores={stores}>
        <TopBarHistory />
      </TacticalStoreProvider>,
    );

    const undoButton = screen.getByRole('button', { name: 'Undo' });
    const redoButton = screen.getByRole('button', { name: 'Redo' });

    expect((undoButton as HTMLButtonElement).disabled).toBe(false);
    expect((redoButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(undoButton);
    expect(stores.documentStore.getState().project.title).toBe(initialTitle);
    expect((redoButton as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(redoButton);
    expect(stores.documentStore.getState().project.title).toBe(
      'Renamed Tactics',
    );
  });
});
