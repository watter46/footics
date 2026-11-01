import { beforeEach, describe, expect, it, vi } from 'vitest';
import { importMatchesBatch, importMatchJsonFile } from './data-loader';
import {
  db,
  getAllPlayerMasters,
  getPlayerMaster,
  getPlayerPhoto,
  mergeLegacyPlayersAndPhotos,
  saveMatchUnified,
  savePlayerMaster,
  savePlayerMastersBatch,
  savePlayerPhoto,
} from './db';

vi.mock('./db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./db')>();
  return {
    ...actual,
    saveMatchUnified: vi.fn(actual.saveMatchUnified),
    savePlayerMastersBatch: vi.fn(actual.savePlayerMastersBatch),
    mergeLegacyPlayersAndPhotos: vi.fn(actual.mergeLegacyPlayersAndPhotos),
  };
});

vi.mock('./national-match-schema', () => ({
  NATIONAL_INFO_IDX: {
    DATE_FULL: 0,
    SCORE: 1,
    HOME_TEAM_ID: 2,
    HOME_TEAM_NAME: 3,
    AWAY_TEAM_ID: 4,
    AWAY_TEAM_NAME: 5,
  },
  parseNationalDate: vi.fn((date) => `parsed-${date}`),
}));

describe('data-loader', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await db.matches.clear();
    await db.events.clear();
    await db.players.clear();
    await db.player_photos.clear();
    await db.tactical_projects.clear();
  });

  const createMockFile = (name: string, content: any): File => {
    return new File([JSON.stringify(content)], name, {
      type: 'application/json',
    });
  };

  it('imports club match json correctly', async () => {
    const clubMatchData = {
      matchId: 12345,
      matchCentreData: {
        startDate: '2023-01-01T15:00:00Z',
        score: '1 : 0',
        home: { teamId: 1, name: 'Home Team' },
        away: { teamId: 2, name: 'Away Team' },
        events: [
          {
            id: 1,
            eventId: 10,
            teamId: 1,
            playerId: 100,
            period: { value: 1 },
            minute: 10,
            second: 5,
            type: { value: 1, displayName: 'Pass' },
            outcomeType: { value: 1 },
            isTouch: true,
          },
        ],
      },
    };
    const file = createMockFile('club.json', clubMatchData);

    const result = await importMatchJsonFile(file);
    expect(result).toBe('12345');

    expect(saveMatchUnified).toHaveBeenCalledTimes(1);
    const [matchArgs, eventsArgs] = vi.mocked(saveMatchUnified).mock.calls[0];

    expect(matchArgs.id).toBe('12345');
    expect(matchArgs.matchType).toBe('club');
    expect(eventsArgs).toHaveLength(1);
    expect(eventsArgs[0].type_name).toBe('Pass');
  });

  it('imports national match json correctly', async () => {
    const infoArray = [];
    infoArray[0] = '2023-01-02';
    infoArray[1] = '2 : 1';
    infoArray[2] = 10;
    infoArray[3] = 'Nat Home';
    infoArray[4] = 20;
    infoArray[5] = 'Nat Away';

    const nationalMatchData = {
      matchId: 67890,
      initialMatchDataForScrappers: [[infoArray]],
    };
    const file = createMockFile('national.json', nationalMatchData);

    const result = await importMatchJsonFile(file);
    expect(result).toBe('67890');

    expect(saveMatchUnified).toHaveBeenCalledTimes(1);
    const [matchArgs, eventsArgs] = vi.mocked(saveMatchUnified).mock.calls[0];

    expect(matchArgs.id).toBe('67890');
    expect(matchArgs.matchType).toBe('national');
    expect(matchArgs.date).toBe('parsed-2023-01-02');
    expect(matchArgs.score).toBe('2 : 1');
    expect(eventsArgs).toHaveLength(0); // National matches init with empty events
  });

  it('throws error for unsupported match format', async () => {
    const invalidData = { unsupported: true };
    const file = createMockFile('invalid.json', invalidData);

    await expect(importMatchJsonFile(file)).rejects.toThrow(
      /Unsupported match data format/,
    );
  });

  it('imports batch matches', async () => {
    const validData = {
      matchId: 111,
      matchCentreData: {
        home: { teamId: 1, name: 'Home' },
        away: { teamId: 2, name: 'Away' },
        events: [],
      },
    };
    const invalidData = { invalid: true };

    const files = [
      createMockFile('valid.json', validData),
      createMockFile('invalid.json', invalidData),
    ];

    const result = await importMatchesBatch(files);

    expect(result.success).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].filename).toBe('invalid.json');
  });

  it('auto-merges temporary negative ID player into official player via savePlayerMastersBatch without duplicate registration', async () => {
    // 1. Arrange: 手動登録された仮ID選手（写真・明示背番号・ポジション設定済み）
    const tempPlayerId = -12345;
    await savePlayerMaster({
      playerId: tempPlayerId,
      name: 'Estêvão',
      season: '24-25',
      defaultShirtNo: 41,
      position: 'RW',
      teamName: 'Chelsea',
    });
    const photoBlob = new Blob(['sample-photo-bytes'], { type: 'image/webp' });
    await savePlayerPhoto(tempPlayerId, photoBlob);

    // 2. Act: WhoScored 形式の試合JSON（同名公式選手：Estevao, playerId: 1001, shirtNo: 99, position: 'Sub'）をインポート
    const matchData = {
      matchId: 99901,
      matchCentreData: {
        startDate: '2024-09-01T15:00:00Z',
        score: '2 : 0',
        home: {
          teamId: 1,
          name: 'Chelsea',
          players: [
            {
              playerId: 1001,
              name: 'Estevao',
              shirtNo: 99,
              position: 'Sub',
            },
            {
              playerId: 1002,
              name: 'Cole Palmer',
              shirtNo: 20,
              position: 'AM',
            },
          ],
        },
        away: {
          teamId: 2,
          name: 'Arsenal',
          players: [],
        },
        events: [],
      },
    };
    const file = createMockFile('chelsea-match.json', matchData);
    await importMatchJsonFile(file);

    // 3. Assert: savePlayerMastersBatch が 1 回のバッチ呼び出しで実行されたこと
    expect(savePlayerMastersBatch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(savePlayerMastersBatch).mock.calls[0][0]).toHaveLength(2);
    expect(mergeLegacyPlayersAndPhotos).toHaveBeenCalledWith('24-25');

    // 4. Assert: 仮ID選手が公式ID選手へ自動統合され、二重登録がないこと
    const allMasters = await getAllPlayerMasters();
    const chelseaMasters = allMasters.filter((p) => p.season === '24-25');
    expect(chelseaMasters).toHaveLength(2);

    // 仮ID選手は削除されていること
    const tempRecord = await getPlayerMaster(tempPlayerId, '24-25');
    expect(tempRecord).toBeUndefined();
    const tempPhoto = await getPlayerPhoto(tempPlayerId);
    expect(tempPhoto).toBeUndefined();

    // 公式ID選手に手動設定情報（写真、明示背番号41、明示ポジションRW）が引き継がれていること
    const officialPlayer = await getPlayerMaster(1001, '24-25');
    expect(officialPlayer).toBeDefined();
    expect(officialPlayer?.name).toBe('Estevao');
    expect(officialPlayer?.defaultShirtNo).toBe(41);
    expect(officialPlayer?.position).toBe('RW');
    expect(officialPlayer?.teamName).toBe('Chelsea');

    // 写真も引き継がれていること
    const officialPhoto = await getPlayerPhoto(1001);
    expect(officialPhoto).toBeDefined();
    expect(officialPhoto?.photoBlob).toBeDefined();
    expect(await officialPhoto?.photoBlob?.text()).toBe('sample-photo-bytes');
  });
});
