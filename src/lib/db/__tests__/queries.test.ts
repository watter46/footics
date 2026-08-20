import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventRow, Match } from '@/types';
import type {
  CustomEvent as CustomEventType,
  EventMemo,
  MatchMemo,
  TacticalSnapshot,
} from '../../schema';
import { SHORTCUT_ACTIONS } from '../../shortcuts';
import {
  deleteCustomEvent,
  deleteKeyValue,
  deleteMatch,
  deletePlayerMaster,
  deletePlayerPhoto,
  deleteTacticalSnapshot,
  dispatchRefreshEvent,
  getAllCustomEvents,
  getAllEventMemos,
  getAllEvents,
  getAllMatches,
  getAllMatchMemos,
  getAllPlayerMasters,
  getAllTacticalSnapshots,
  getCustomEventsByMatch,
  getEventMemosByMatch,
  getEventsByMatch,
  getKeyValue,
  getMatch,
  getMatchMemo,
  getPlayerMaster,
  getPlayerMastersBySeason,
  getPlayersMasterBatch,
  getTacticalSnapshot,
  mergePlayerId,
  putEventMemo,
  putMatch,
  putMatchEventsBatch,
  putMatchesBatch,
  putMatchMemo,
  putTacticalSnapshot,
  putTacticalSnapshotsBatch,
  saveCustomEvent,
  saveMatchUnified,
  savePlayerMaster,
  savePlayerPhoto,
  setKeyValue,
} from '../queries';
import { db, type PlayerMaster } from '../schema';

describe('src/lib/db/queries', () => {
  beforeEach(async () => {
    await db.event_memos.clear();
    await db.custom_events.clear();
    await db.match_memos.clear();
    await db.tactical_snapshots.clear();
    await db.matches.clear();
    await db.events.clear();
    await db.keyval.clear();
    await db.players.clear();
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

  describe('Event Memo Operations', () => {
    it('puts and gets event memos by match', async () => {
      const memo1: EventMemo = {
        id: 101,
        matchId: 1,
        period: 1,
        minute: 10,
        second: 30,
        type: 'Pass',
        x: 50,
        y: 50,
        memo: 'Great pass',
        tags: ['pass', 'key'],
        updatedAt: Date.now(),
      };
      const memo2: EventMemo = {
        id: 102,
        matchId: 1,
        period: 1,
        minute: 25,
        second: 15,
        type: 'Shot',
        x: 80,
        y: 45,
        memo: 'Shot on target',
        tags: ['shot'],
        updatedAt: Date.now(),
      };
      const memo3: EventMemo = {
        id: 103,
        matchId: 2,
        period: 2,
        minute: 60,
        second: 0,
        type: 'Tackle',
        x: 40,
        y: 60,
        memo: 'Other match memo',
        tags: [],
        updatedAt: Date.now(),
      };

      await putEventMemo(memo1);
      await putEventMemo(memo2);
      await putEventMemo(memo3);

      const match1Memos = await getEventMemosByMatch(1);
      expect(match1Memos).toHaveLength(2);
      expect(match1Memos.map((m) => m.id)).toEqual([101, 102]);

      const allMemos = await getAllEventMemos();
      expect(allMemos).toHaveLength(3);
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

  describe('Tactical Snapshot Operations', () => {
    it('handles tactical snapshot CRUD and batch operations', async () => {
      const snapshot1: TacticalSnapshot = {
        matchId: 'match-1',
        updatedAt: 1000,
        isInverted: false,
        tactics: [
          {
            time: 0,
            players: [
              {
                playerId: 1,
                shirtNo: '1',
                team: 'home',
                area: 'pitch',
                x: 50,
                y: 50,
              },
            ],
            assets: {
              ball: { x: 50, y: 50 },
            },
          },
        ],
      };
      const snapshot2: TacticalSnapshot = {
        matchId: 'match-2',
        updatedAt: 2000,
        isInverted: true,
        tactics: [
          {
            time: 0,
            players: [],
            assets: {
              ball: { x: 30, y: 30 },
            },
          },
        ],
      };

      expect(await getTacticalSnapshot('match-1')).toBeNull();

      await putTacticalSnapshot(snapshot1);
      expect(await getTacticalSnapshot('match-1')).toEqual(snapshot1);

      await putTacticalSnapshotsBatch([snapshot1, snapshot2]);
      const all = await getAllTacticalSnapshots();
      expect(all).toHaveLength(2);

      await deleteTacticalSnapshot('match-1');
      expect(await getTacticalSnapshot('match-1')).toBeNull();
      expect(await getAllTacticalSnapshots()).toHaveLength(1);
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

  describe('Player Master Operations', () => {
    it('saves and retrieves a player master record with season', async () => {
      const player = {
        playerId: 101,
        name: 'Kaoru Mitoma',
        season: '26-27',
        defaultShirtNo: 22,
        photoUrl: 'https://example.com/mitoma.jpg',
        updatedAt: Date.now(),
      };

      await savePlayerMaster(player);

      const retrieved = await getPlayerMaster(101, '26-27');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Kaoru Mitoma');
      expect(retrieved?.season).toBe('26-27');
      expect(retrieved?.defaultShirtNo).toBe(22);
      expect(retrieved?.photoUrl).toBe('https://example.com/mitoma.jpg');
    });

    it('saves player photo Blob and updates player master', async () => {
      const mockBlob = new Blob(['sample-photo-data'], { type: 'image/png' });
      await savePlayerPhoto(102, mockBlob, 'Takefusa Kubo', '26-27');

      const retrieved = await getPlayerMaster(102, '26-27');
      expect(retrieved).toBeDefined();
      expect(retrieved?.playerId).toBe(102);
      expect(retrieved?.name).toBe('Takefusa Kubo');
      expect(retrieved?.photoBlob).toBeDefined();
    });

    it('updates photo for existing player without overwriting defaultShirtNo', async () => {
      await savePlayerMaster({
        playerId: 103,
        name: 'Wataru Endo',
        season: '26-27',
        defaultShirtNo: 3,
        updatedAt: Date.now(),
      });

      const newBlob = new Blob(['endo-image'], { type: 'image/png' });
      await savePlayerPhoto(103, newBlob, undefined, '26-27');

      const updated = await getPlayerMaster(103, '26-27');
      expect(updated?.name).toBe('Wataru Endo');
      expect(updated?.defaultShirtNo).toBe(3);
      expect(updated?.photoBlob).toBeDefined();
    });

    it('retrieves players by season with getPlayerMastersBySeason', async () => {
      await savePlayerMaster({
        playerId: 104,
        name: 'Cole Palmer',
        season: '25-26',
        teamName: 'Chelsea',
      });
      await savePlayerMaster({
        playerId: 105,
        name: 'Cole Palmer',
        season: '26-27',
        teamName: 'Chelsea',
      });

      const s2526 = await getPlayerMastersBySeason('25-26', 'Chelsea');
      expect(s2526.some((p) => p.playerId === 104)).toBe(true);
      expect(s2526.some((p) => p.playerId === 105)).toBe(false);

      const s2627 = await getPlayerMastersBySeason('26-27', 'Chelsea');
      expect(s2627.some((p) => p.playerId === 105)).toBe(true);
    });

    it('batch retrieves player masters as Map', async () => {
      const blob1 = new Blob(['img1'], { type: 'image/png' });
      const blob2 = new Blob(['img2'], { type: 'image/png' });

      await savePlayerPhoto(201, blob1, 'Player 201', '26-27');
      await savePlayerPhoto(202, blob2, 'Player 202', '26-27');
      await savePlayerMaster({
        playerId: 203,
        name: 'Player 203',
        season: '26-27',
        updatedAt: Date.now(),
      });

      const batch = await getPlayersMasterBatch([201, 202, 999], '26-27');
      expect(batch.size).toBe(2);
      expect(batch.get(201)?.name).toBe('Player 201');
      expect(batch.get(202)?.name).toBe('Player 202');
      expect(batch.get(999)).toBeUndefined();
    });

    it('returns empty Map when getPlayersMasterBatch is called with empty or invalid IDs', async () => {
      const emptyBatch = await getPlayersMasterBatch([]);
      expect(emptyBatch.size).toBe(0);

      const nanBatch = await getPlayersMasterBatch([NaN]);
      expect(nanBatch.size).toBe(0);
    });

    it('deletes player photo without removing the player record', async () => {
      const blob = new Blob(['temp-img'], { type: 'image/png' });
      await savePlayerPhoto(301, blob, 'Daichi Kamada', '26-27');

      let player = await getPlayerMaster(301, '26-27');
      expect(player?.photoBlob).toBeDefined();

      await deletePlayerPhoto(301, '26-27');

      player = await getPlayerMaster(301, '26-27');
      expect(player).toBeDefined();
      expect(player?.name).toBe('Daichi Kamada');
      expect(player?.photoBlob).toBeUndefined();
      expect(player?.photoUrl).toBeUndefined();
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

    it('merges temporary player into official WhoScored player ID', async () => {
      const blob = new Blob(['sample-img'], { type: 'image/png' });
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

      // 旧仮IDレコードが削除されていること
      const oldTemp = await getPlayerMaster(-101, '26-27');
      expect(oldTemp).toBeUndefined();

      // 正規IDレコードに写真や背番号・ポジションが引き継がれていること
      const merged = await getPlayerMaster(450010, '26-27');
      expect(merged).toBeDefined();
      expect(merged?.playerId).toBe(450010);
      expect(merged?.name).toBe('Estevao Willian');
      expect(merged?.defaultShirtNo).toBe(41);
      expect(merged?.position).toBe('FW');
      expect(merged?.photoBlob).toBeDefined();
      expect(merged?.isExcluded).toBe(false);
    });

    it('getAllPlayerMasters retrieves all saved players', async () => {
      await savePlayerMaster({
        playerId: 501,
        name: 'Player 501',
        season: '26-27',
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
      expect(all.some((p) => p.playerId === 501)).toBe(true);
      expect(all.some((p) => p.playerId === 502)).toBe(true);
    });
  });
});
