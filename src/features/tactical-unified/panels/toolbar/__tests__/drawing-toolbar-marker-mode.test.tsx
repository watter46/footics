import { render, screen } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CanvasStoreProvider,
  createCanvasStore,
} from '@/features/tactical-unified/core';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { DrawingToolbar } from '../drawing-toolbar';

function renderWithStore(ui: React.ReactElement) {
  const store = createCanvasStore({ mode: 'tactical-board' });
  return render(<CanvasStoreProvider store={store}>{ui}</CanvasStoreProvider>);
}

describe('DrawingToolbar markerMode filtering', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('displays 2D marker and hides 3D foot ring marker when markerMode is "2d-only"', () => {
    renderWithStore(<DrawingToolbar markerMode="2d-only" />);

    expect(screen.getByTestId('tool-player')).toBeDefined();
    expect(screen.queryByTestId('tool-player-ring')).toBeNull();
  });

  it('displays 2D marker and hides 3D foot ring marker by default when markerMode is omitted', () => {
    renderWithStore(<DrawingToolbar />);

    expect(screen.getByTestId('tool-player')).toBeDefined();
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
