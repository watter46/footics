import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  mergePlayerId,
  putMatch,
  putMatchEventsBatch,
  putMatchesBatch,
  putMatchMemo,
  saveCustomEvent,
  saveMatchUnified,
  savePlayerMaster,
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
    vi.restoreAllMocks();
  });

  describe('dispatchRefreshEvent', () => {
    it('dispatches footics-action event on window with matchId', () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      dispatchRefreshEvent('12345');

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      const customEvent = dispatchSpy.mock.calls[0][0] as CustomEvent<{
        action: string;
        matchId?: string;
      }>;
      expect(customEvent.type).toBe('footics-action');
      expect(customEvent.detail).toEqual({
        action: SHORTCUT_ACTIONS.REFRESH_DATA,
        matchId: '12345',
      });
    });

    it('dispatches footics-action event without matchId when omitted', () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      dispatchRefreshEvent();

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      const customEvent = dispatchSpy.mock.calls[0][0] as CustomEvent<{
        action: string;
        matchId?: string;
      }>;
      expect(customEvent.detail).toEqual({
        action: SHORTCUT_ACTIONS.REFRESH_DATA,
        matchId: undefined,
      });
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
  });
});
