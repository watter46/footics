import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TacticalProject } from '@/lib/types/tactical-unified';
import type { EventRow, Match } from '@/types';
import type { CustomEvent as CustomEventType, MatchMemo } from '../../schema';
import { SHORTCUT_ACTIONS } from '../../shortcuts';
import {
  deleteCustomEvent,
  deleteKeyValue,
  deleteMatch,
  deletePlayerMaster,
  deletePlayerPhoto,
  dispatchRefreshEvent,
  findPlayerPhotoByName,
  findPlayerPhotosByNames,
  getAllCustomEvents,
  getAllEvents,
  getAllMatches,
  getAllMatchMemos,
  getAllPlayerMasters,
  getAllPlayerPhotos,
  getCustomEventsByMatch,
  getEventsByMatch,
  getKeyValue,
  getMatch,
  getMatchMemo,
  getPlayerMaster,
  getPlayerMastersBySeason,
  getPlayerPhoto,
  getPlayerPhotosBatch,
  getPlayersMasterBatch,
  isLegacyOrTempPlayerId,
  mergeLegacyPlayersAndPhotos,
  mergePlayerId,
  normalizePlayerNameForMatch,
  putMatch,
  putMatchEventsBatch,
  putMatchesBatch,
  putMatchMemo,
  saveCustomEvent,
  saveMatchUnified,
  savePlayerMaster,
  savePlayerMastersBatch,
  savePlayerPhoto,
  setKeyValue,
} from '../queries';
import { db, ensureDatabaseReady, type FooticsDatabase } from '../schema';

describe('src/lib/db/queries', () => {
  beforeEach(async () => {
    await db.custom_events.clear();
    await db.match_memos.clear();
    await db.matches.clear();
    await db.events.clear();
    await db.keyval.clear();
    await db.players.clear();
    await db.player_photos.clear();
    await db.tactical_projects.clear();
    vi.restoreAllMocks();
  });

  describe('dispatchRefreshEvent', () => {
    it('dispatches footics-action event on window with matchId', () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      const postMessageSpy = vi
        .spyOn(window, 'postMessage')
        .mockImplementation(() => {});

      dispatchRefreshEvent('12345');

      expect(dispatchSpy).not.toHaveBeenCalled();
      expect(postMessageSpy).toHaveBeenCalledTimes(2);
      expect(postMessageSpy).toHaveBeenNthCalledWith(
        1,
        {
          type: 'footics-action',
          detail: {
            action: SHORTCUT_ACTIONS.REFRESH_DATA,
            matchId: '12345',
          },
        },
        expect.any(String),
      );
      expect(postMessageSpy).toHaveBeenNthCalledWith(
        2,
        {
          type: 'FOOTICS_ACTION',
          action: SHORTCUT_ACTIONS.REFRESH_DATA,
          payload: { matchId: '12345' },
        },
        expect.any(String),
      );
    });

    it('dispatches footics-action event without matchId when omitted', () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      const postMessageSpy = vi
        .spyOn(window, 'postMessage')
        .mockImplementation(() => {});

      dispatchRefreshEvent();

      expect(dispatchSpy).not.toHaveBeenCalled();
      expect(postMessageSpy).toHaveBeenCalledTimes(2);
      expect(postMessageSpy).toHaveBeenNthCalledWith(
        1,
        {
          type: 'footics-action',
          detail: {
            action: SHORTCUT_ACTIONS.REFRESH_DATA,
            matchId: undefined,
          },
        },
        expect.any(String),
      );
      expect(postMessageSpy).toHaveBeenNthCalledWith(
        2,
        {
          type: 'FOOTICS_ACTION',
          action: SHORTCUT_ACTIONS.REFRESH_DATA,
          payload: { matchId: undefined },
        },
        expect.any(String),
      );
    });
  });

  describe('Database Ready and Recovery', () => {
    it('opens database ready when no VersionError', async () => {
      await expect(ensureDatabaseReady(db)).resolves.not.toThrow();
    });

    it('recovers by delete and reopen when VersionError occurs', async () => {
      const mockDb = {
        open: vi
          .fn()
          .mockRejectedValueOnce({
            name: 'VersionError',
            message: 'Version error',
          })
          .mockResolvedValueOnce(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      } as unknown as FooticsDatabase;

      await ensureDatabaseReady(mockDb);

      expect(mockDb.open).toHaveBeenCalledTimes(2);
      expect(mockDb.delete).toHaveBeenCalledTimes(1);
    });

    it('rethrows non-VersionError during open', async () => {
      const mockDb = {
        open: vi.fn().mockRejectedValue(new Error('Other DB error')),
        delete: vi.fn(),
      } as unknown as FooticsDatabase;

      await expect(ensureDatabaseReady(mockDb)).rejects.toThrow(
        'Other DB error',
      );
      expect(mockDb.delete).not.toHaveBeenCalled();
    });
  });

  describe('Custom Event Operations', () => {
    it('saves, retrieves, and deletes custom events', async () => {
      const customEvent1: CustomEventType = {
        id: '11111111-1111-4111-8111-111111111111',
        match_id: 'match-1',
        period: 1,
        minute: 12,
        second: 34,
        labels: ['Tactical Shift'],
        memo: 'Shifted to 4-3-3',
        created_at: 1000,
      };
      const customEvent2: CustomEventType = {
        id: '22222222-2222-4222-8222-222222222222',
        match_id: 'match-1',
        period: 2,
        minute: 60,
        second: 0,
        labels: ['Pressing trap'],
        memo: '',
        created_at: 2000,
      };
      const customEventOther: CustomEventType = {
        id: '33333333-3333-4333-8333-333333333333',
        match_id: 'match-2',
        period: 1,
        minute: 5,
        second: 10,
        labels: ['Corner'],
        memo: '',
        created_at: 3000,
      };

      await saveCustomEvent(customEvent1);
      await saveCustomEvent(customEvent2);
      await saveCustomEvent(customEventOther);

      const match1Events = await getCustomEventsByMatch('match-1');
      expect(match1Events).toHaveLength(2);
      expect(match1Events.map((e) => e.id)).toContain(
        '11111111-1111-4111-8111-111111111111',
      );
      expect(match1Events.map((e) => e.id)).toContain(
        '22222222-2222-4222-8222-222222222222',
      );

      const allCustomEvents = await getAllCustomEvents();
      expect(allCustomEvents).toHaveLength(3);

      // Delete an event
      await deleteCustomEvent('11111111-1111-4111-8111-111111111111');
      const match1EventsAfterDelete = await getCustomEventsByMatch('match-1');
      expect(match1EventsAfterDelete).toHaveLength(1);
      expect(match1EventsAfterDelete[0].id).toBe(
        '22222222-2222-4222-8222-222222222222',
      );

      // Deleting non-existent event should not throw
      await expect(deleteCustomEvent('non-existent')).resolves.not.toThrow();
    });
  });

  describe('Match Memo Operations', () => {
    it('puts, gets, and lists match memos', async () => {
      const memo1: MatchMemo = {
        matchId: 'match-1',
        memo: 'Summary of 1st half',
        updatedAt: 1000,
      };
      const memo2: MatchMemo = {
        matchId: 'match-2',
        memo: 'Summary of match 2',
        updatedAt: 2000,
      };

      expect(await getMatchMemo('match-1')).toBeNull();

      await putMatchMemo(memo1);
      await putMatchMemo(memo2);

      const fetched = await getMatchMemo('match-1');
      expect(fetched).toEqual(memo1);

      const all = await getAllMatchMemos();
      expect(all).toHaveLength(2);
    });
  });

  describe('Match Registry Operations', () => {
    const createMockMatch = (
      id: string,
      homeName: string,
      awayName: string,
    ): Match => ({
      id,
      date: '2023-01-01',
      score: '2 : 1',
      matchType: 'club',
      homeTeam: { id: 1, name: homeName },
      awayTeam: { id: 2, name: awayName },
      playerIdNameDictionary: {},
      teams: {
        home: {
          teamId: 1,
          name: homeName,
          players: [],
        },
        away: {
          teamId: 2,
          name: awayName,
          players: [],
        },
      },
    });

    it('puts, gets, and batches matches', async () => {
      const match1 = createMockMatch('1001', 'Arsenal', 'Chelsea');
      const match2 = createMockMatch('1002', 'Liverpool', 'Man City');

      expect(await getMatch('1001')).toBeNull();

      await putMatch(match1);
      expect(await getMatch('1001')).toEqual(match1);

      await putMatchesBatch([match1, match2]);
      const allMatches = await getAllMatches();
      expect(allMatches).toHaveLength(2);
    });
  });

  describe('Events Operations', () => {
    const createMockEventRow = (
      id: number | string,
      matchId: string,
      type_name: string,
      x: number,
      y: number,
    ): EventRow => ({
      id,
      match_id: matchId,
      event_id: Number(id),
      team_id: 10,
      player_id: 100,
      period: 1,
      minute: 10,
      second: 5,
      expanded_minute: 10,
      x,
      y,
      end_x: null,
      end_y: null,
      type_value: 1,
      type_name,
      outcome: true,
      is_touch: true,
      qualifiers: [],
    });

    it('batches and retrieves events by match', async () => {
      const event1 = createMockEventRow(1, '1001', 'Pass', 50, 50);
      const event2 = createMockEventRow(2, '1001', 'Shot', 80, 50);
      const eventOther = createMockEventRow(1, '1002', 'Pass', 40, 40);

      await putMatchEventsBatch([event1, event2, eventOther]);

      const match1Events = await getEventsByMatch('1001');
      expect(match1Events).toHaveLength(2);
      expect(match1Events.map((e) => e.type_name)).toEqual(['Pass', 'Shot']);

      const all = await getAllEvents();
      expect(all).toHaveLength(3);
    });
  });

  describe('Atomic / Combined Operations', () => {
    const createMockMatch = (id: string): Match => ({
      id,
      date: '2023-04-10',
      score: '3 : 2',
      matchType: 'club',
      homeTeam: { id: 1, name: 'Real Madrid' },
      awayTeam: { id: 2, name: 'Barcelona' },
      playerIdNameDictionary: {},
      teams: {
        home: { teamId: 1, name: 'Real Madrid', players: [] },
        away: { teamId: 2, name: 'Barcelona', players: [] },
      },
    });

    const createMockEvent = (
      id: number,
      matchId: string,
      typeName: string,
    ): EventRow => ({
      id,
      match_id: matchId,
      event_id: id,
      team_id: 1,
      player_id: 10,
      period: 1,
      minute: 5,
      second: 0,
      expanded_minute: 5,
      x: 20,
      y: 20,
      end_x: null,
      end_y: null,
      type_value: 1,
      type_name: typeName,
      outcome: true,
      is_touch: true,
      qualifiers: [],
    });

    it('saveMatchUnified deletes old events and inserts new events atomically', async () => {
      const match = createMockMatch('2001');
      const oldEvents = [createMockEvent(1, '2001', 'Pass')];

      // 初回保存
      await saveMatchUnified(match, oldEvents);
      expect(await getMatch('2001')).toEqual(match);
      expect(await getEventsByMatch('2001')).toHaveLength(1);

      // 新しいイベントリストで更新保存（delete-then-insert パターン）
      const newEvents = [
        createMockEvent(2, '2001', 'Goal'),
        createMockEvent(3, '2001', 'Goal'),
      ];

      await saveMatchUnified(match, newEvents);

      const eventsAfterUpdate = await getEventsByMatch('2001');
      expect(eventsAfterUpdate).toHaveLength(2);
      expect(eventsAfterUpdate.map((e) => e.id)).toEqual([2, 3]);
    });

    it('deleteMatch removes both match record and its associated events', async () => {
      const match = createMockMatch('3001');
      const events = [createMockEvent(1, '3001', 'Pass')];

      await saveMatchUnified(match, events);
      expect(await getMatch('3001')).not.toBeNull();
      expect(await getEventsByMatch('3001')).toHaveLength(1);

      await deleteMatch('3001');
      expect(await getMatch('3001')).toBeNull();
      expect(await getEventsByMatch('3001')).toHaveLength(0);
    });
  });

  describe('Key-Value Operations', () => {
    it('sets, gets, and deletes key-value pairs', async () => {
      expect(await getKeyValue('test-config')).toBeNull();

      const sampleConfig = { theme: 'dark', zoom: 1.5 };
      await setKeyValue('test-config', sampleConfig);

      const retrieved = await getKeyValue<typeof sampleConfig>('test-config');
      expect(retrieved).toEqual(sampleConfig);

      await deleteKeyValue('test-config');
      expect(await getKeyValue('test-config')).toBeNull();
    });
  });

  describe('Player Photo Operations', () => {
    it('saves and retrieves player photo independently', async () => {
      const mockBlob = new Blob(['photo-100'], { type: 'image/webp' });
      await savePlayerPhoto(100, mockBlob);

      const photo = await getPlayerPhoto(100);
      expect(photo).toBeDefined();
      expect(photo?.playerId).toBe(100);
      expect(photo?.photoBlob).toBeDefined();
      expect(photo?.mimeType).toBe('image/webp');

      const allPhotos = await getAllPlayerPhotos();
      expect(allPhotos).toHaveLength(1);
      expect(allPhotos[0].playerId).toBe(100);
    });

    it('batch retrieves player photos as Map', async () => {
      const blob1 = new Blob(['p1'], { type: 'image/webp' });
      const blob2 = new Blob(['p2'], { type: 'image/webp' });
      await savePlayerPhoto(10, blob1);
      await savePlayerPhoto(20, blob2);

      const batch = await getPlayerPhotosBatch([10, 20, 99]);
      expect(batch.size).toBe(2);
      expect(batch.get(10)).toBeDefined();
      expect(batch.get(20)).toBeDefined();
      expect(batch.get(99)).toBeUndefined();
    });

    it('deletes player photo from player_photos table', async () => {
      const mockBlob = new Blob(['photo-del'], { type: 'image/webp' });
      await savePlayerPhoto(300, mockBlob);
      expect(await getPlayerPhoto(300)).toBeDefined();

      await deletePlayerPhoto(300);
      expect(await getPlayerPhoto(300)).toBeUndefined();
    });
  });

  describe('Player Master Operations', () => {
    it('saves player master without storing photoBlob in physical db.players table', async () => {
      const mockBlob = new Blob(['sample-photo-data'], { type: 'image/webp' });
      await savePlayerMaster({
        playerId: 101,
        name: 'Kaoru Mitoma',
        season: '26-27',
        defaultShirtNo: 22,
        photoBlob: mockBlob,
        photoUrl: 'https://example.com/mitoma.jpg',
        updatedAt: Date.now(),
      });

      // 物理 db.players には photoBlob が保存されていないこと
      const rawRecord = await db.players.get('26-27_101');
      expect(rawRecord).toBeDefined();
      expect(rawRecord?.photoBlob).toBeUndefined();

      // db.player_photos に保存されていること
      const photoRecord = await db.player_photos.get(101);
      expect(photoRecord).toBeDefined();
      expect(photoRecord?.photoBlob).toBeDefined();

      // クエリ (getPlayerMaster) では JOIN 結合されて photoBlob が返ること
      const joined = await getPlayerMaster(101, '26-27');
      expect(joined).toBeDefined();
      expect(joined?.name).toBe('Kaoru Mitoma');
      expect(joined?.photoBlob).toBeDefined();
    });

    it('retrieves players by season with joined photoBlob', async () => {
      const mockBlob = new Blob(['palmer-photo'], { type: 'image/webp' });
      await savePlayerMaster({
        playerId: 104,
        name: 'Cole Palmer',
        season: '25-26',
        teamName: 'Chelsea',
        photoBlob: mockBlob,
      });
      await savePlayerMaster({
        playerId: 105,
        name: 'Cole Palmer',
        season: '26-27',
        teamName: 'Chelsea',
      });

      const s2526 = await getPlayerMastersBySeason('25-26', 'Chelsea');
      expect(s2526).toHaveLength(1);
      expect(s2526[0].playerId).toBe(104);
      expect(s2526[0].photoBlob).toBeDefined();

      const s2627 = await getPlayerMastersBySeason('26-27', 'Chelsea');
      expect(s2627).toHaveLength(1);
      expect(s2627[0].playerId).toBe(105);
      expect(s2627[0].photoBlob).toBeUndefined();
    });

    it('batch retrieves player masters as Map with joined photoBlob', async () => {
      const blob1 = new Blob(['img1'], { type: 'image/webp' });
      await savePlayerMaster({
        playerId: 201,
        name: 'Player 201',
        season: '26-27',
        photoBlob: blob1,
      });
      await savePlayerMaster({
        playerId: 202,
        name: 'Player 202',
        season: '26-27',
      });

      const batch = await getPlayersMasterBatch([201, 202, 999], '26-27');
      expect(batch.size).toBe(2);
      expect(batch.get(201)?.name).toBe('Player 201');
      expect(batch.get(201)?.photoBlob).toBeDefined();
      expect(batch.get(202)?.name).toBe('Player 202');
      expect(batch.get(202)?.photoBlob).toBeUndefined();
      expect(batch.get(999)).toBeUndefined();
    });

    it('returns empty Map when getPlayersMasterBatch is called with empty or invalid IDs', async () => {
      const emptyBatch = await getPlayersMasterBatch([]);
      expect(emptyBatch.size).toBe(0);

      const nanBatch = await getPlayersMasterBatch([NaN]);
      expect(nanBatch.size).toBe(0);
    });

    it('deletes player photo without removing the player record', async () => {
      const blob = new Blob(['temp-img'], { type: 'image/webp' });
      await savePlayerMaster({
        playerId: 301,
        name: 'Daichi Kamada',
        season: '26-27',
        photoBlob: blob,
      });

      let player = await getPlayerMaster(301, '26-27');
      expect(player?.photoBlob).toBeDefined();

      await deletePlayerPhoto(301);

      player = await getPlayerMaster(301, '26-27');
      expect(player).toBeDefined();
      expect(player?.name).toBe('Daichi Kamada');
      expect(player?.photoBlob).toBeUndefined();
    });

    it('physically deletes temporary players (ID < 0) with deletePlayerMaster', async () => {
      await savePlayerMaster({
        playerId: -999,
        name: 'Young Prospect',
        season: '26-27',
        updatedAt: Date.now(),
      });

      expect(await getPlayerMaster(-999, '26-27')).toBeDefined();

      await deletePlayerMaster(-999, '26-27');
      expect(await getPlayerMaster(-999, '26-27')).toBeUndefined();
    });

    it('sets isExcluded=true for official players (ID > 0) with deletePlayerMaster', async () => {
      await savePlayerMaster({
        playerId: 401,
        name: 'Takumi Minamino',
        season: '26-27',
        updatedAt: Date.now(),
      });

      expect(await getPlayerMaster(401, '26-27')).toBeDefined();

      await deletePlayerMaster(401, '26-27');
      const excluded = await getPlayerMaster(401, '26-27');
      expect(excluded).toBeDefined();
      expect(excluded?.isExcluded).toBe(true);
    });

    it('merges temporary player and migrates photo to official WhoScored player ID', async () => {
      const blob = new Blob(['sample-img'], { type: 'image/webp' });
      await savePlayerMaster({
        playerId: -101,
        name: 'Estevao Willian',
        defaultShirtNo: 41,
        position: 'FW',
        season: '26-27',
        photoBlob: blob,
        updatedAt: Date.now(),
      });

      // 公式ID 450010 に統合
      await mergePlayerId(-101, 450010, '26-27', 'Chelsea');

      // 旧仮IDレコードおよび旧写真が削除されていること
      const oldTemp = await getPlayerMaster(-101, '26-27');
      expect(oldTemp).toBeUndefined();
      const oldPhoto = await db.player_photos.get(-101);
      expect(oldPhoto).toBeUndefined();

      // 正規IDレコードに写真や背番号・ポジションが引き継がれていること
      const merged = await getPlayerMaster(450010, '26-27');
      expect(merged).toBeDefined();
      expect(merged?.playerId).toBe(450010);
      expect(merged?.name).toBe('Estevao Willian');
      expect(merged?.defaultShirtNo).toBe(41);
      expect(merged?.position).toBe('FW');
      expect(merged?.photoBlob).toBeDefined();
      expect(merged?.isExcluded).toBe(false);

      const officialPhoto = await db.player_photos.get(450010);
      expect(officialPhoto).toBeDefined();
    });

    it('getAllPlayerMasters retrieves all saved players with photoBlob', async () => {
      const blob = new Blob(['photo-501'], { type: 'image/webp' });
      await savePlayerMaster({
        playerId: 501,
        name: 'Player 501',
        season: '26-27',
        photoBlob: blob,
        updatedAt: Date.now(),
      });
      await savePlayerMaster({
        playerId: 502,
        name: 'Player 502',
        season: '26-27',
        updatedAt: Date.now(),
      });

      const all = await getAllPlayerMasters();
      expect(all.length).toBeGreaterThanOrEqual(2);
      const p501 = all.find((p) => p.playerId === 501);
      expect(p501?.photoBlob).toBeDefined();
      const p502 = all.find((p) => p.playerId === 502);
      expect(p502?.photoBlob).toBeUndefined();
    });

    describe('normalizePlayerNameForMatch', () => {
      it('normalizes accents, casing, hyphens, and whitespace', () => {
        expect(normalizePlayerNameForMatch('  Estêvão  ')).toBe('estevao');
        expect(normalizePlayerNameForMatch('Cole Palmer-Smith')).toBe(
          'cole palmer smith',
        );
        expect(normalizePlayerNameForMatch('Moisés   Caicedo_Jr')).toBe(
          'moises caicedo jr',
        );
        expect(normalizePlayerNameForMatch('Éder Militão')).toBe(
          'eder militao',
        );
      });
    });

    describe('Player Auto-Merge and Tactical Project Reference Updates', () => {
      it('auto-merges temp player into official player on savePlayerMaster', async () => {
        const photoBlob = new Blob(['estevao-img'], { type: 'image/webp' });
        // 手動仮ID選手を作成
        await savePlayerMaster({
          playerId: -101,
          name: 'Estêvão',
          season: '26-27',
          defaultShirtNo: 41,
          position: 'RW',
          photoBlob,
        });

        // 戦術プロジェクト内にこの仮ID選手を配置
        const mockProject: TacticalProject = {
          id: 'proj-1',
          version: '2.0.0',
          title: 'Tactical Test',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          aspectRatio: '4:5',
          backgroundType: 'pitch',
          homeColor: { primary: '#034694' },
          awayColor: { primary: '#ef4444' },
          activePhaseId: 'phase-1',
          activeSlideId: 'slide-1',
          tags: [],
          slides: [],
          phases: [
            {
              id: 'phase-1',
              name: 'Build Up',
              slides: [
                {
                  id: 'slide-1',
                  index: 0,
                  ball: { x: 50, y: 50, visible: true },
                  arrows: [],
                  zones: [],
                  texts: [],
                  transitionDurationMs: 1000,
                  pauseMs: 500,
                  easing: 'ease-in-out',
                  players: [
                    {
                      id: 'p-1',
                      playerId: '-101',
                      name: 'Estêvão',
                      shirtNo: '41',
                      position: 'RW',
                      team: 'home',
                      area: 'pitch',
                      x: 20,
                      y: 30,
                      style: {
                        markerType: 'circle',
                        insideContent: 'number',
                        bottomLabel: 'name',
                        color: '#034694',
                        strokeColor: '#ffffff',
                        strokeWidth: 2,
                        sizeScale: 1,
                        numberSizeScale: 1,
                        labelSizeScale: 1,
                      },
                      connectLines: [],
                      badges: [],
                    },
                  ],
                },
              ],
            },
          ],
        };
        await db.tactical_projects.put(mockProject);

        // 公式ID（同名だがアクセントなし、未設定背番号99、Sub）で保存
        await savePlayerMaster({
          playerId: 450010,
          name: 'Estevao',
          season: '26-27',
          defaultShirtNo: 99,
          position: 'Sub',
        });

        // 1. 仮IDレコードおよび写真が削除されていること
        expect(await getPlayerMaster(-101, '26-27')).toBeUndefined();
        expect(await db.player_photos.get(-101)).toBeUndefined();

        // 2. 公式IDに仮IDの手動登録情報（写真、背番号41、RW）が引き継がれていること
        const official = await getPlayerMaster(450010, '26-27');
        expect(official).toBeDefined();
        expect(official?.defaultShirtNo).toBe(41);
        expect(official?.position).toBe('RW');
        expect(official?.photoBlob).toBeDefined();

        const officialPhoto = await db.player_photos.get(450010);
        expect(officialPhoto?.photoBlob).toBeDefined();

        // 3. tactical_projects 内の選手参照が -101 から 450010 に更新されていること
        const updatedProject = await db.tactical_projects.get('proj-1');
        const slidePlayer = updatedProject?.phases[0].slides[0].players.find(
          (p) => p.id === 'p-1',
        );
        expect(slidePlayer?.playerId).toBe('450010');
      });

      it('updates tactical_projects playerId references on mergePlayerId', async () => {
        await savePlayerMaster({
          playerId: -202,
          name: 'Temp Striker',
          season: '26-27',
          defaultShirtNo: 9,
          position: 'CF',
        });

        const mockProject: TacticalProject = {
          id: 'proj-2',
          version: '2.0.0',
          title: 'Tactical Test 2',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          aspectRatio: '4:5',
          backgroundType: 'pitch',
          homeColor: { primary: '#034694' },
          awayColor: { primary: '#ef4444' },
          activePhaseId: 'phase-1',
          activeSlideId: 'slide-1',
          tags: [],
          slides: [],
          phases: [
            {
              id: 'phase-1',
              name: 'Attack',
              slides: [
                {
                  id: 'slide-1',
                  index: 0,
                  ball: { x: 50, y: 50, visible: true },
                  arrows: [],
                  zones: [],
                  texts: [],
                  transitionDurationMs: 1000,
                  pauseMs: 500,
                  easing: 'ease-in-out',
                  players: [
                    {
                      id: 'p-2',
                      playerId: '-202',
                      team: 'home',
                      area: 'pitch',
                      x: 50,
                      y: 80,
                      style: {
                        markerType: 'circle',
                        insideContent: 'number',
                        bottomLabel: 'name',
                        color: '#034694',
                        strokeColor: '#ffffff',
                        strokeWidth: 2,
                        sizeScale: 1,
                        numberSizeScale: 1,
                        labelSizeScale: 1,
                      },
                      connectLines: [],
                      badges: [],
                    },
                  ],
                },
              ],
            },
          ],
        };
        await db.tactical_projects.put(mockProject);

        await mergePlayerId(-202, 9999, '26-27', 'Chelsea');

        const updatedProject = await db.tactical_projects.get('proj-2');
        const slidePlayer = updatedProject?.phases[0].slides[0].players.find(
          (p) => p.id === 'p-2',
        );
        expect(slidePlayer?.playerId).toBe('9999');
      });

      it('batch saves players and performs auto-merge with single refresh event', async () => {
        const postMessageSpy = vi
          .spyOn(window, 'postMessage')
          .mockImplementation(() => {});

        const photoBlob = new Blob(['batch-img'], { type: 'image/webp' });
        await savePlayerMaster({
          playerId: -303,
          name: 'João Pedro',
          season: '26-27',
          defaultShirtNo: 10,
          position: 'FW',
          photoBlob,
        });

        postMessageSpy.mockClear();

        await savePlayerMastersBatch([
          {
            playerId: 8888,
            name: 'Joao Pedro',
            season: '26-27',
            defaultShirtNo: 99, // default 99 should be overridden by 10
            position: 'Sub', // Sub should be overridden by FW
          },
          {
            playerId: 8889,
            name: 'Moises Caicedo',
            season: '26-27',
            defaultShirtNo: 25,
            position: 'DM',
          },
        ]);

        // dispatchRefreshEvent emits 2 postMessage calls (legacy & new protocol)
        // savePlayerMastersBatch should call dispatchRefreshEvent exactly once at the end
        expect(postMessageSpy).toHaveBeenCalledTimes(2);

        // 仮ID -303 が 8888 にマージされていること
        expect(await getPlayerMaster(-303, '26-27')).toBeUndefined();
        const merged = await getPlayerMaster(8888, '26-27');
        expect(merged).toBeDefined();
        expect(merged?.defaultShirtNo).toBe(10);
        expect(merged?.position).toBe('FW');
        expect(merged?.photoBlob).toBeDefined();

        const p8889 = await getPlayerMaster(8889, '26-27');
        expect(p8889?.name).toBe('Moises Caicedo');
        expect(p8889?.defaultShirtNo).toBe(25);
      });

      it('queries players by filter using [season+teamName] index and handles legacy Chelsea', async () => {
        await savePlayerMaster({
          playerId: 7001,
          name: 'Arsenal Player',
          season: '26-27',
          teamName: 'Arsenal',
        });
        await savePlayerMaster({
          playerId: 7002,
          name: 'Legacy Chelsea Player',
          season: '26-27',
          // teamName omitted -> defaults to Chelsea
        });

        const arsenalPlayers = await getPlayerMastersBySeason(
          '26-27',
          'Arsenal',
        );
        expect(arsenalPlayers.some((p) => p.playerId === 7001)).toBe(true);
        expect(arsenalPlayers.some((p) => p.playerId === 7002)).toBe(false);

        const chelseaPlayers = await getPlayerMastersBySeason(
          '26-27',
          'Chelsea',
        );
        expect(chelseaPlayers.some((p) => p.playerId === 7002)).toBe(true);
        expect(chelseaPlayers.some((p) => p.playerId === 7001)).toBe(false);
      });

      describe('isLegacyOrTempPlayerId', () => {
        it('identifies negative IDs and 345000-345999 as legacy/temp, but keeps 346000+ official', () => {
          expect(isLegacyOrTempPlayerId(-1)).toBe(true);
          expect(isLegacyOrTempPlayerId(-999)).toBe(true);
          expect(isLegacyOrTempPlayerId(345000)).toBe(true);
          expect(isLegacyOrTempPlayerId(345014)).toBe(true);
          expect(isLegacyOrTempPlayerId(345999)).toBe(true);

          // 346000 and Jadon Sancho (346300) should be false (official)
          expect(isLegacyOrTempPlayerId(346000)).toBe(false);
          expect(isLegacyOrTempPlayerId(346300)).toBe(false);
          expect(isLegacyOrTempPlayerId(395692)).toBe(false);
          expect(isLegacyOrTempPlayerId(101)).toBe(false);
        });
      });

      describe('Legacy 345000 Player Auto-Merge and Deletion', () => {
        it('physically deletes legacy 345000 players with deletePlayerMaster', async () => {
          const blob = new Blob(['legacy-photo'], { type: 'image/webp' });
          await savePlayerMaster({
            playerId: 345014,
            name: 'Cole Palmer',
            season: '26-27',
            photoBlob: blob,
          });

          expect(await getPlayerMaster(345014, '26-27')).toBeDefined();
          expect(await db.player_photos.get(345014)).toBeDefined();

          await deletePlayerMaster(345014, '26-27');

          expect(await getPlayerMaster(345014, '26-27')).toBeUndefined();
          expect(await db.player_photos.get(345014)).toBeUndefined();
        });

        it('auto-merges legacy 345000 player into official player on savePlayerMaster', async () => {
          const photoBlob = new Blob(['palmer-img'], { type: 'image/webp' });
          await savePlayerMaster({
            playerId: 345014,
            name: 'Cole Palmer',
            season: '26-27',
            defaultShirtNo: 20,
            position: 'AM',
            photoBlob,
          });

          const mockProject: TacticalProject = {
            id: 'proj-legacy-merge',
            version: '2.0.0',
            title: 'Legacy Merge Test',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            aspectRatio: '4:5',
            backgroundType: 'pitch',
            homeColor: { primary: '#034694' },
            awayColor: { primary: '#ef4444' },
            activePhaseId: 'phase-1',
            activeSlideId: 'slide-1',
            tags: [],
            slides: [],
            phases: [
              {
                id: 'phase-1',
                name: 'Phase 1',
                slides: [
                  {
                    id: 'slide-1',
                    index: 0,
                    ball: { x: 50, y: 50, visible: true },
                    arrows: [],
                    zones: [],
                    texts: [],
                    transitionDurationMs: 1000,
                    pauseMs: 500,
                    easing: 'ease-in-out',
                    players: [
                      {
                        id: 'p-palmer',
                        playerId: '345014',
                        name: 'Cole Palmer',
                        shirtNo: '20',
                        position: 'AM',
                        team: 'home',
                        area: 'pitch',
                        x: 50,
                        y: 50,
                        style: {
                          markerType: 'circle',
                          insideContent: 'number',
                          bottomLabel: 'name',
                          color: '#034694',
                          strokeColor: '#ffffff',
                          strokeWidth: 2,
                          sizeScale: 1,
                          numberSizeScale: 1,
                          labelSizeScale: 1,
                        },
                        connectLines: [],
                        badges: [],
                      },
                    ],
                  },
                ],
              },
            ],
          };
          await db.tactical_projects.put(mockProject);

          // 公式ID（395692）で同名選手を保存
          await savePlayerMaster({
            playerId: 395692,
            name: 'Cole Palmer',
            season: '26-27',
            defaultShirtNo: 99, // default 99 should be overridden by 20
            position: 'Sub', // Sub should be overridden by AM
          });

          // 1. 旧345014 レコードと写真が削除されていること
          expect(await getPlayerMaster(345014, '26-27')).toBeUndefined();
          expect(await db.player_photos.get(345014)).toBeUndefined();

          // 2. 公式ID（395692）に旧仮IDの写真・背番号20・AMが引き継がれていること
          const official = await getPlayerMaster(395692, '26-27');
          expect(official).toBeDefined();
          expect(official?.defaultShirtNo).toBe(20);
          expect(official?.position).toBe('AM');
          expect(official?.photoBlob).toBeDefined();

          const officialPhoto = await db.player_photos.get(395692);
          expect(officialPhoto?.photoBlob).toBeDefined();

          // 3. tactical_projects 内の選手参照が '345014' から '395692' に更新されていること
          const updatedProj =
            await db.tactical_projects.get('proj-legacy-merge');
          const slidePlayer = updatedProj?.phases[0].slides[0].players.find(
            (p) => p.id === 'p-palmer',
          );
          expect(slidePlayer?.playerId).toBe('395692');
        });
      });

      describe('findPlayerPhotoByName', () => {
        it('finds player photo Blob by normalized player name across records', async () => {
          const blob = new Blob(['gusto-blob'], { type: 'image/webp' });
          await savePlayerMaster({
            playerId: 403850,
            name: 'Malo Gusto',
            season: '26-27',
            photoBlob: blob,
          });

          const foundExact = await findPlayerPhotoByName('Malo Gusto');
          expect(foundExact).toBeDefined();

          const foundNormalized = await findPlayerPhotoByName('  malo gusto  ');
          expect(foundNormalized).toBeDefined();

          const foundAccent = await findPlayerPhotoByName('Malo-Gusto');
          expect(foundAccent).toBeDefined();

          const notFound = await findPlayerPhotoByName('Unknown Player');
          expect(notFound).toBeUndefined();
        });
      });

      describe('findPlayerPhotosByNames', () => {
        it('resolves normalized name variants to the same Blob, excludes unknown, and returns map keyed by input names', async () => {
          const gustoBlob = new Blob(['gusto-blob'], { type: 'image/webp' });
          await savePlayerMaster({
            playerId: 403850,
            name: 'Malo Gusto',
            season: '26-27',
            photoBlob: gustoBlob,
          });

          const names = [
            'Malo Gusto',
            '  malo gusto  ',
            'Malo-Gusto',
            'Unknown Player',
          ];
          const resultMap = await findPlayerPhotosByNames(names);

          expect(resultMap.get('Malo Gusto')).toBeDefined();
          expect(resultMap.get('  malo gusto  ')).toBeDefined();
          expect(resultMap.get('Malo-Gusto')).toBeDefined();
          expect(resultMap.has('Unknown Player')).toBe(false);
          expect(resultMap.size).toBe(3);
        });

        it('does not touch DB when input is empty or contains only whitespace', async () => {
          const toArraySpy = vi.spyOn(db.players, 'toArray');

          const emptyResult = await findPlayerPhotosByNames([]);
          expect(emptyResult.size).toBe(0);
          expect(toArraySpy).not.toHaveBeenCalled();

          const whitespaceResult = await findPlayerPhotosByNames([
            '',
            '   ',
            '\t\n',
          ]);
          expect(whitespaceResult.size).toBe(0);
          expect(toArraySpy).not.toHaveBeenCalled();

          toArraySpy.mockRestore();
        });

        it('calls db.players.toArray only once for multiple names', async () => {
          const gustoBlob = new Blob(['gusto-blob'], { type: 'image/webp' });
          const palmerBlob = new Blob(['palmer-blob'], { type: 'image/webp' });
          await savePlayerMaster({
            playerId: 403850,
            name: 'Malo Gusto',
            season: '26-27',
            photoBlob: gustoBlob,
          });
          await savePlayerMaster({
            playerId: 403851,
            name: 'Cole Palmer',
            season: '26-27',
            photoBlob: palmerBlob,
          });

          const toArraySpy = vi.spyOn(db.players, 'toArray');

          const resultMap = await findPlayerPhotosByNames([
            'Malo Gusto',
            'Cole Palmer',
            'Other',
          ]);
          expect(toArraySpy).toHaveBeenCalledTimes(1);
          expect(resultMap.size).toBe(2);

          toArraySpy.mockRestore();
        });
      });

      describe('mergeLegacyPlayersAndPhotos', () => {
        it('migrates legacy 345000 players and photos to official IDs using Chelsea presets', async () => {
          // DBに旧345000番台の選手・写真が存在し、公式ID未登録
          const palmerBlob = new Blob(['legacy-palmer'], {
            type: 'image/webp',
          });
          const gustoBlob = new Blob(['legacy-gusto'], { type: 'image/webp' });

          await savePlayerMaster({
            playerId: 345014,
            name: 'Cole Palmer',
            season: '26-27',
            defaultShirtNo: 20,
            position: 'AM',
            photoBlob: palmerBlob,
          });
          await savePlayerMaster({
            playerId: 345004,
            name: 'Malo Gusto',
            season: '26-27',
            defaultShirtNo: 27,
            position: 'DR',
            photoBlob: gustoBlob,
          });

          const mockProject: TacticalProject = {
            id: 'proj-batch-merge',
            version: '2.0.0',
            title: 'Batch Merge Test',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            aspectRatio: '4:5',
            backgroundType: 'pitch',
            homeColor: { primary: '#034694' },
            awayColor: { primary: '#ef4444' },
            activePhaseId: 'phase-1',
            activeSlideId: 'slide-1',
            tags: [],
            slides: [],
            phases: [
              {
                id: 'phase-1',
                name: 'Phase 1',
                slides: [
                  {
                    id: 'slide-1',
                    index: 0,
                    ball: { x: 50, y: 50, visible: true },
                    arrows: [],
                    zones: [],
                    texts: [],
                    transitionDurationMs: 1000,
                    pauseMs: 500,
                    easing: 'ease-in-out',
                    players: [
                      {
                        id: 'p-1',
                        playerId: '345014',
                        team: 'home',
                        area: 'pitch',
                        x: 20,
                        y: 30,
                        style: {
                          markerType: 'circle',
                          insideContent: 'number',
                          bottomLabel: 'name',
                          color: '#034694',
                          strokeColor: '#ffffff',
                          strokeWidth: 2,
                          sizeScale: 1,
                          numberSizeScale: 1,
                          labelSizeScale: 1,
                        },
                        connectLines: [],
                        badges: [],
                      },
                      {
                        id: 'p-2',
                        playerId: '345004',
                        team: 'home',
                        area: 'pitch',
                        x: 40,
                        y: 30,
                        style: {
                          markerType: 'circle',
                          insideContent: 'number',
                          bottomLabel: 'name',
                          color: '#034694',
                          strokeColor: '#ffffff',
                          strokeWidth: 2,
                          sizeScale: 1,
                          numberSizeScale: 1,
                          labelSizeScale: 1,
                        },
                        connectLines: [],
                        badges: [],
                      },
                    ],
                  },
                ],
              },
            ],
          };
          await db.tactical_projects.put(mockProject);

          // 一括名寄せ＆移行実行
          await mergeLegacyPlayersAndPhotos('26-27');

          // 旧345014 / 345004 は削除されていること
          expect(await getPlayerMaster(345014, '26-27')).toBeUndefined();
          expect(await getPlayerMaster(345004, '26-27')).toBeUndefined();
          expect(await db.player_photos.get(345014)).toBeUndefined();
          expect(await db.player_photos.get(345004)).toBeUndefined();

          // 公式ID（Palmer: 395692, Gusto: 403850）が作成され写真が引き継がれていること
          const officialPalmer = await getPlayerMaster(395692, '26-27');
          expect(officialPalmer).toBeDefined();
          expect(officialPalmer?.name).toBe('Cole Palmer');
          expect(officialPalmer?.photoBlob).toBeDefined();
          expect(officialPalmer?.defaultShirtNo).toBe(20);

          const officialGusto = await getPlayerMaster(403850, '26-27');
          expect(officialGusto).toBeDefined();
          expect(officialGusto?.name).toBe('Malo Gusto');
          expect(officialGusto?.photoBlob).toBeDefined();
          expect(officialGusto?.defaultShirtNo).toBe(27);

          // tactical_projects の参照が公式IDに置換されていること
          const updatedProj =
            await db.tactical_projects.get('proj-batch-merge');
          const p1 = updatedProj?.phases[0].slides[0].players.find(
            (p) => p.id === 'p-1',
          );
          const p2 = updatedProj?.phases[0].slides[0].players.find(
            (p) => p.id === 'p-2',
          );
          expect(p1?.playerId).toBe('395692');
          expect(p2?.playerId).toBe('403850');
        });
      });
    });
  });
});
