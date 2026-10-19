import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TeamSquadClient } from '../TeamSquadClient';

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock Dexie DB queries used by hooks
vi.mock('@/lib/db/queries', () => ({
  getAllMatches: vi.fn().mockResolvedValue([]),
  getPlayerMastersBySeason: vi.fn().mockResolvedValue([]),
  getExcludedPlayerMastersBySeason: vi.fn().mockResolvedValue([]),
  getPlayerMaster: vi.fn().mockResolvedValue(undefined),
  savePlayerMaster: vi.fn().mockResolvedValue(undefined),
  deletePlayerMaster: vi.fn().mockResolvedValue(undefined),
  savePlayerPhoto: vi.fn().mockResolvedValue(undefined),
  deletePlayerPhoto: vi.fn().mockResolvedValue(undefined),
}));

describe('TeamSquadClient', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it('renders Chelsea squad header and stats summary', async () => {
    render(<TeamSquadClient teamId="chelsea" />, { wrapper: createWrapper() });

    // Chelsea header should be rendered
    expect(await screen.findByText('Chelsea FC')).toBeDefined();
    expect(screen.getByText('Premier League')).toBeDefined();
  });
});
