import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { DrawingToolbar } from '../drawing-toolbar';

describe('DrawingToolbar markerMode filtering', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('displays 2D marker and hides 3D foot ring marker when markerMode is "2d-only"', () => {
    render(<DrawingToolbar markerMode="2d-only" />);

    expect(screen.getByTestId('tool-player')).toBeDefined();
    expect(screen.queryByTestId('tool-player-ring')).toBeNull();
  });

  it('displays 2D marker and hides 3D foot ring marker by default when markerMode is omitted', () => {
    render(<DrawingToolbar />);

    expect(screen.getByTestId('tool-player')).toBeDefined();
    expect(screen.queryByTestId('tool-player-ring')).toBeNull();
  });

  it('displays 3D foot ring marker and hides 2D marker when markerMode is "3d-only"', () => {
    render(<DrawingToolbar markerMode="3d-only" />);

    expect(screen.getByTestId('tool-player-ring')).toBeDefined();
    expect(screen.queryByTestId('tool-player')).toBeNull();
  });

  it('displays both 2D marker and 3D foot ring marker when markerMode is "all"', () => {
    render(<DrawingToolbar markerMode="all" />);

    expect(screen.getByTestId('tool-player')).toBeDefined();
    expect(screen.getByTestId('tool-player-ring')).toBeDefined();
  });
});
