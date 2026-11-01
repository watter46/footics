import { describe, expect, it, vi } from 'vitest';
import * as dbModule from '@/lib/db';
import { createSquadActionHandlers } from '../squad-actions';

vi.mock('@/lib/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db')>();
  return {
    ...actual,
    mergeLegacyPlayersAndPhotos: vi.fn().mockResolvedValue(undefined),
  };
});

describe('squad-actions', () => {
  it('calls mergeLegacyPlayersAndPhotos with selectedSeason on handleSyncSquad', async () => {
    const savePlayer = vi.fn().mockResolvedValue(undefined);
    const refetchSquad = vi.fn();
    const handlers = createSquadActionHandlers({
      teamConfig: {
        id: 'chelsea',
        name: 'Chelsea',
        shortName: 'CHE',
        optaTeamId: 't8',
      } as any,
      selectedSeason: '24-25',
      teamPlayers: [],
      mergedPlayers: [],
      savePlayer,
      deletePlayer: vi.fn(),
      savePhoto: vi.fn(),
      deletePhoto: vi.fn(),
      refetchSquad,
      setEditingPlayer: vi.fn(),
      router: { push: vi.fn() },
    });

    await handlers.handleSyncSquad();

    expect(dbModule.mergeLegacyPlayersAndPhotos).toHaveBeenCalledWith('24-25');
  });
});
