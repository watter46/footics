import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '../../../constants';
import {
  FooticsOfflineDB,
  markOfflineCaptureStatus,
  markOfflineSaveRequestStatus,
  offlineDb,
  recordOfflineCapture,
  recordOfflineSaveRequest,
  replayOfflineQueue,
} from '../offline-queue';

const mockAddToSaveQueue = vi.fn();
vi.mock('../save-queue', () => ({
  addToSaveQueue: (...args: unknown[]) => mockAddToSaveQueue(...args),
}));

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: Test suite definition
describe('offline-queue', () => {
  let storageMap: Record<string, unknown> = {};

  beforeEach(async () => {
    vi.clearAllMocks();
    storageMap = {};

    (globalThis as any).browser = {
      storage: {
        local: {
          get: vi.fn().mockImplementation(async (key: string | null) => {
            if (key === null) return storageMap;
            return { [key]: storageMap[key] };
          }),
          set: vi
            .fn()
            .mockImplementation(async (obj: Record<string, unknown>) => {
              Object.assign(storageMap, obj);
            }),
        },
      },
    };

    await offlineDb.saveRequests.clear();
    await offlineDb.captures.clear();
  });

  describe('FooticsOfflineDB instance', () => {
    it('is properly instantiated as Dexie database', () => {
      expect(offlineDb).toBeInstanceOf(FooticsOfflineDB);
      expect(offlineDb.name).toBe('footics_offline_db');
      expect(offlineDb.saveRequests).toBeDefined();
      expect(offlineDb.captures).toBeDefined();
    });
  });

  describe('recordOfflineSaveRequest', () => {
    it('records a new save request in Dexie and updates storage state', async () => {
      const record = await recordOfflineSaveRequest({
        id: 'save_req_1',
        mode: 'MATCH',
        matchId: 'match_999',
        memo: 'Tactical analysis note',
      });

      expect(record.id).toBe('save_req_1');
      expect(record.status).toBe('pending');
      expect(record.createdAt).toBeDefined();

      const saved = await offlineDb.saveRequests.get('save_req_1');
      expect(saved).toBeDefined();
      expect(saved?.matchId).toBe('match_999');
      expect(saved?.memo).toBe('Tactical analysis note');

      const storageState = storageMap[STORAGE_KEYS.OFFLINE_QUEUE] as any;
      expect(storageState).toBeDefined();
      expect(storageState.pendingSaves).toBe(1);
      expect(storageState.pendingCaptures).toBe(0);
    });
  });

  describe('recordOfflineCapture', () => {
    it('records a tactical capture payload in Dexie and updates storage state', async () => {
      const capture = await recordOfflineCapture({
        id: 'capture_123',
        dataUrl: 'data:image/jpeg;base64,abc123mock',
        timestamp: Date.now(),
        title: 'Man City vs Arsenal',
      });

      expect(capture.id).toBe('capture_123');
      expect(capture.status).toBe('pending');

      const saved = await offlineDb.captures.get('capture_123');
      expect(saved).toBeDefined();
      expect(saved?.title).toBe('Man City vs Arsenal');

      const storageState = storageMap[STORAGE_KEYS.OFFLINE_QUEUE] as any;
      expect(storageState.pendingCaptures).toBe(1);
    });
  });

  describe('markOfflineSaveRequestStatus & markOfflineCaptureStatus', () => {
    it('updates status of save request in Dexie', async () => {
      await recordOfflineSaveRequest({
        id: 'save_req_2',
        mode: 'EVENT',
        matchId: 'match_999',
        memo: 'Shot on target',
        minute: 45,
        second: 12,
      });

      await markOfflineSaveRequestStatus('save_req_2', 'synced');

      const updated = await offlineDb.saveRequests.get('save_req_2');
      expect(updated?.status).toBe('synced');

      const storageState = storageMap[STORAGE_KEYS.OFFLINE_QUEUE] as any;
      expect(storageState.pendingSaves).toBe(0);
    });

    it('updates status of capture in Dexie', async () => {
      await recordOfflineCapture({
        id: 'cap_fail_1',
        dataUrl: 'data:image/jpeg;base64,mock',
        timestamp: Date.now(),
      });

      await markOfflineCaptureStatus('cap_fail_1', 'failed', 'Network timeout');

      const updated = await offlineDb.captures.get('cap_fail_1');
      expect(updated?.status).toBe('failed');
      expect(updated?.errorMessage).toBe('Network timeout');
    });
  });

  describe('replayOfflineQueue', () => {
    it('replays pending save requests and captures, marking them as synced', async () => {
      await recordOfflineSaveRequest({
        id: 'save_to_replay',
        mode: 'MATCH',
        matchId: 'match_100',
        memo: 'Replayed memo',
      });

      await recordOfflineCapture({
        id: 'cap_to_replay',
        dataUrl: 'data:image/jpeg;base64,xyz',
        timestamp: Date.now(),
        title: 'Goal scene',
      });

      mockAddToSaveQueue.mockResolvedValue(undefined);
      const mockDispatch = vi.fn();

      const result = await replayOfflineQueue(mockDispatch);

      expect(result.replayedSaves).toBe(1);
      expect(result.replayedCaptures).toBe(1);

      expect(mockAddToSaveQueue).toHaveBeenCalledWith({
        mode: 'MATCH',
        matchId: 'match_100',
        memo: 'Replayed memo',
        period: undefined,
        minute: undefined,
        second: undefined,
        labels: undefined,
        entityId: undefined,
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'cap_to_replay',
          title: 'Goal scene',
        }),
      );

      const savedReq = await offlineDb.saveRequests.get('save_to_replay');
      expect(savedReq?.status).toBe('synced');

      const savedCap = await offlineDb.captures.get('cap_to_replay');
      expect(savedCap?.status).toBe('synced');
    });
  });
});
