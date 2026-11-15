import { render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it } from 'vitest';
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

describe('DrawingToolbar markerMode filtering', () => {
  it('hides both 2D marker (delegated to Squad) and 3D foot ring marker when markerMode is "2d-only"', () => {
    renderWithStore(<DrawingToolbar markerMode="2d-only" />);

    expect(screen.queryByTestId('tool-player')).toBeNull();
    expect(screen.queryByTestId('tool-player-ring')).toBeNull();
  });

  it('hides 2D marker by default (Squad unified) and hides 3D foot ring marker when markerMode is omitted', () => {
    renderWithStore(<DrawingToolbar />);

    expect(screen.queryByTestId('tool-player')).toBeNull();
    expect(screen.queryByTestId('tool-player-ring')).toBeNull();
  });

  it('displays 3D foot ring marker and hides 2D marker when markerMode is "3d-only"', () => {
    renderWithStore(<DrawingToolbar markerMode="3d-only" />);

    expect(screen.getByTestId('tool-player-ring')).toBeDefined();
    expect(screen.queryByTestId('tool-player')).toBeNull();
  });

  it('displays both 2D marker and 3D foot ring marker when markerMode is "all"', () => {
    renderWithStore(<DrawingToolbar markerMode="all" />);

    expect(screen.getByTestId('tool-player')).toBeDefined();
    expect(screen.getByTestId('tool-player-ring')).toBeDefined();
  });
});
