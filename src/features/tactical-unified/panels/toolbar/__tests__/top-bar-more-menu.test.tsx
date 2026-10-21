import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { TopBarMoreMenu } from '../top-bar-more-menu';

describe('TopBarMoreMenu component', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('toggles menu open and closed', () => {
    render(<TopBarMoreMenu />);

    const moreBtn = screen.getByRole('button', { name: 'More actions' });
    expect(screen.queryByText('Project')).toBeNull();

    fireEvent.click(moreBtn);
    expect(screen.getByText('Project')).toBeDefined();
    expect(screen.getByText('New Project')).toBeDefined();
    expect(screen.getByText('Import Background Image')).toBeDefined();
    expect(screen.getByText('Clear Background Image')).toBeDefined();
    expect(screen.getByText('Benchmark Presets')).toBeDefined();

    // Verify "Swap Sides" was removed as it moved to TopBarCenter
    expect(screen.queryByText('Swap Sides')).toBeNull();
  });
});
