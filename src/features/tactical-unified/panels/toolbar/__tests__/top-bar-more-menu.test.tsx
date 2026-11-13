import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import * as matchHelper from '@/lib/db/tactical-match-helper';
import * as matchTranslator from '@/lib/tactical/acl/match-project-translator';
import * as tacticalStorage from '@/lib/tactical/tactical-storage';
import type { Match } from '@/types';
import { TopBarMoreMenu } from '../top-bar-more-menu';

const mockUseSearchParams = vi.fn();
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockUseSearchParams(),
}));

function createTestStores(matchId?: string) {
  const base = createDefaultTacticalProject();
  const project = matchId !== undefined ? { ...base, matchId } : base;
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

describe('TopBarMoreMenu component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearchParams.mockReturnValue(null);
    window.confirm = vi.fn(() => true);
  });

  it('toggles menu open and closed', () => {
    const stores = createTestStores();
    render(
      <TacticalStoreProvider stores={stores}>
        <TopBarMoreMenu />
      </TacticalStoreProvider>,
    );

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

  it('URL に matchId がない場合、New Project 押下時は buildMatchToDomainProject を呼ばず新規初期化と clearActiveProjectFromDb(null) を実行する', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams(''));
    const clearSpy = vi
      .spyOn(tacticalStorage, 'clearActiveProjectFromDb')
      .mockResolvedValue();
    const buildSpy = vi.spyOn(matchTranslator, 'buildMatchToDomainProject');
    const stores = createTestStores('previous-match-id');

    render(
      <TacticalStoreProvider stores={stores}>
        <TopBarMoreMenu />
      </TacticalStoreProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    fireEvent.click(screen.getByText('New Project'));

    await waitFor(() => {
      expect(clearSpy).toHaveBeenCalledWith(null);
    });
    expect(buildSpy).not.toHaveBeenCalled();
    expect(stores.documentStore.getState().project.matchId).toBeUndefined();
  });

  it('URL に matchId がある場合、New Project 押下時は当該試合の0分として buildMatchToDomainProject を呼び clearActiveProjectFromDb(matchId) を実行する', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('matchId=10'));
    const mockMatch = {
      id: '10',
      homeTeam: { name: 'Home' },
      awayTeam: { name: 'Away' },
    } as unknown as Match;
    vi.spyOn(matchHelper, 'getMatchForTacticalProject').mockResolvedValue(
      mockMatch,
    );
    const clearSpy = vi
      .spyOn(tacticalStorage, 'clearActiveProjectFromDb')
      .mockResolvedValue();
    const buildSpy = vi.spyOn(matchTranslator, 'buildMatchToDomainProject');
    const stores = createTestStores();

    render(
      <TacticalStoreProvider stores={stores}>
        <TopBarMoreMenu />
      </TacticalStoreProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    fireEvent.click(screen.getByText('New Project'));

    await waitFor(() => {
      expect(clearSpy).toHaveBeenCalledWith('10');
    });
    expect(buildSpy).toHaveBeenCalledWith(mockMatch, { minute: 0 });
  });
});
