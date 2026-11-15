import { render, screen } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { DrawingToolbar } from '../drawing-toolbar';

function renderWithStore(ui: React.ReactElement) {
  const project = createDefaultTacticalProject();
  const phase = project.phases[0];
  const slide = phase?.slides[0];
  const documentStore = createDocumentStore(project);
  const sessionStore = createSessionStore({
    activePhaseId: phase?.id ?? null,
    activeSlideId: slide?.id ?? null,
  });
  return render(
    <TacticalStoreProvider stores={{ documentStore, sessionStore }}>
      {ui}
    </TacticalStoreProvider>,
  );
}

describe('DrawingToolbar component', () => {
  beforeEach(() => {
    // No shared legacy store reset required
  });

  it('renders toolbar positioned on the right for 16:9 aspect ratio', () => {
    const { container } = renderWithStore(<DrawingToolbar />);

    const toolbarEl = container.firstElementChild as HTMLElement;
    expect(toolbarEl).toBeDefined();
    expect(toolbarEl.className).toContain('right-3');
    expect(toolbarEl.className).toContain('top-1/2');
    expect(toolbarEl.className).toContain('flex-col');
  });

  it('renders toolbar positioned on the right for non-16:9 aspect ratio (e.g. 4:5)', () => {
    const { container } = renderWithStore(<DrawingToolbar />);

    const toolbarEl = container.firstElementChild as HTMLElement;
    expect(toolbarEl).toBeDefined();
    expect(toolbarEl.className).toContain('right-3');
    expect(toolbarEl.className).toContain('top-1/2');
    expect(toolbarEl.className).toContain('flex-col');
  });

  it('renders drawing tool buttons and action toggles', () => {
    renderWithStore(<DrawingToolbar />);

    expect(screen.getByRole('button', { name: 'Select (V)' })).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Continuous Draw Lock' }),
    ).toBeDefined();
    expect(screen.getByRole('button', { name: 'Eraser Mode' })).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Reset all slide objects' }),
    ).toBeDefined();
    expect(screen.getByRole('button', { name: 'Pitch Lock' })).toBeDefined();
  });
});
