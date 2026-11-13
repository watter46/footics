import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { TopBarTitle } from '../top-bar-title';

function createTestStores(title?: string) {
  const base = createDefaultTacticalProject();
  const project = title ? { ...base, title } : base;
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

describe('TopBarTitle', () => {
  it('renders project manager button and opens projectManagerModal', () => {
    const stores = createTestStores();
    render(
      <TacticalStoreProvider stores={stores}>
        <TopBarTitle />
      </TacticalStoreProvider>,
    );

    const projectsButton = screen.getByRole('button', {
      name: /Projects/i,
    });
    expect(projectsButton).toBeDefined();

    fireEvent.click(projectsButton);
    expect(stores.sessionStore.getState().panels.projectManagerModalOpen).toBe(
      true,
    );
  });

  it('does not contain deprecated blue-500 classes in container or buttons', () => {
    const stores = createTestStores();
    const { container } = render(
      <TacticalStoreProvider stores={stores}>
        <TopBarTitle />
      </TacticalStoreProvider>,
    );
    const html = container.innerHTML;
    expect(html).not.toContain('blue-500');
    expect(html).not.toContain('blue-600');
    expect(html).not.toContain('blue-300');
    expect(html).not.toContain('blue-200');
    expect(html).not.toContain('blue-400');
  });

  it('allows renaming the project title', () => {
    const stores = createTestStores('Initial Tactics');

    render(
      <TacticalStoreProvider stores={stores}>
        <TopBarTitle />
      </TacticalStoreProvider>,
    );

    const titleButton = screen.getByRole('button', {
      name: /Initial Tactics/i,
    });
    fireEvent.click(titleButton);

    const input = screen.getByRole('textbox');
    expect(input).toBeDefined();
    expect((input as HTMLInputElement).value).toBe('Initial Tactics');

    fireEvent.change(input, { target: { value: 'Updated Tactics' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(stores.documentStore.getState().project.title).toBe(
      'Updated Tactics',
    );
  });
});
