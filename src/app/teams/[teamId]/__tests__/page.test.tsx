import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TeamDynamicPage from '../page';

// Mock TeamSquadClient to avoid complex client-side dependencies
vi.mock('@/features/teams', () => ({
  TeamSquadClient: ({ teamId }: { teamId: string }) => (
    <div data-testid="mock-squad-client">Team Squad: {teamId}</div>
  ),
}));

// Mock TeamsDropdown and management buttons
vi.mock('@/components/layout/TeamsDropdown', () => ({
  TeamsDropdown: () => <div data-testid="mock-teams-dropdown">Teams</div>,
}));

vi.mock('@/features/management', () => ({
  GlobalDataManagement: () => <div data-testid="mock-global-data">Data</div>,
  ImportMatchButton: () => <div data-testid="mock-import-match">Import</div>,
}));

describe('TeamDynamicPage', () => {
  it('renders with L0 background and L1 header with Matches and Tactical navigation', async () => {
    const page = await TeamDynamicPage({
      params: Promise.resolve({ teamId: 'chelsea' }),
    });

    const { container } = render(page);

    // Verify L0 background (#0D0D0E)
    const rootDiv = container.firstChild as HTMLElement;
    expect(rootDiv.className).toContain('bg-[#0D0D0E]');

    // Verify L1 header (#121214)
    const header = container.querySelector('header');
    expect(header).toBeDefined();
    expect(header?.className).toContain('bg-[#121214]');
    expect(header?.className).toContain('border-white/[0.07]');

    // Verify Matches link
    const matchesLink = screen.getByRole('link', { name: /matches/i });
    expect(matchesLink).toBeDefined();
    expect(matchesLink.getAttribute('href')).toBe('/');

    // Verify Tactical link
    const tacticalLink = screen.getByRole('link', { name: /tactical/i });
    expect(tacticalLink).toBeDefined();
    expect(tacticalLink.getAttribute('href')).toBe('/tactical');

    // Verify TeamSquadClient is mounted
    expect(screen.getByTestId('mock-squad-client')).toBeDefined();
  });
});
