import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '../../../constants';
import { addToSaveQueue, processSaveQueue } from '../save-queue';

// Mock DB
const mockPutMatchMemo = vi.fn();
const mockSaveCustomEvent = vi.fn();
vi.mock('@/lib/db', () => ({
  putMatchMemo: (...args: unknown[]) => mockPutMatchMemo(...args),
  saveCustomEvent: (...args: unknown[]) => mockSaveCustomEvent(...args),
}));

// Mock cache-sync
const mockSyncMatchMemoCacheToStorage = vi.fn();
vi.mock('../cache-sync', () => ({
  syncMatchMemoCacheToStorage: (...args: unknown[]) =>
    mockSyncMatchMemoCacheToStorage(...args),
}));

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: Comprehensive test suite for save-queue
describe('save-queue', () => {
  let storageMap: Record<string, unknown> = {};

  beforeEach(() => {
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

    (globalThis as any).navigator = {
      locks: {
        request: vi
          .fn()
          .mockImplementation(
            async (_name: string, callback: () => Promise<void>) => {
              return await callback();
            },
          ),
      },
    };
  });

  describe('addToSaveQueue', () => {
    it('adds new MATCH item with retryCount: 0 and status: pending', async () => {
      await addToSaveQueue({
        mode: 'MATCH',
        matchId: 'match_123',
        memo: 'Good performance',
      });

      const queue = storageMap[STORAGE_KEYS.SAVE_QUEUE] as any[];
      expect(queue).toHaveLength(1);
      expect(queue[0]).toMatchObject({
        mode: 'MATCH',
        matchId: 'match_123',
        memo: 'Good performance',
        status: 'pending',
        retryCount: 0,
      });
      expect(queue[0].id).toBeDefined();
      expect(queue[0].createdAt).toBeDefined();
    });

    it('adds new EVENT item with retryCount: 0 and status: pending', async () => {
      await addToSaveQueue({
        mode: 'EVENT',
        matchId: 'match_123',
        memo: 'Goal scored',
        period: 1,
        minute: 15,
        second: 30,
        labels: ['ゴール'],
      });

      const queue = storageMap[STORAGE_KEYS.SAVE_QUEUE] as any[];
      expect(queue).toHaveLength(1);
      expect(queue[0]).toMatchObject({
        mode: 'EVENT',
        matchId: 'match_123',
        memo: 'Goal scored',
        period: 1,
        minute: 15,
        second: 30,
        labels: ['ゴール'],
        status: 'pending',
        retryCount: 0,
      });
    });
  });

  // biome-ignore lint/complexity/noExcessiveLinesPerFunction: Comprehensive test cases for processSaveQueue
  describe('processSaveQueue', () => {
    it('successfully processes MATCH memo, calls cache sync, and cleans queue', async () => {
      storageMap[STORAGE_KEYS.SAVE_QUEUE] = [
        {
          id: 'item_1',
          status: 'pending',
          mode: 'MATCH',
          matchId: 'match_123',
          memo: 'First half notes',
          retryCount: 0,
          createdAt: Date.now(),
        },
      ];

      mockPutMatchMemo.mockResolvedValue(undefined);
      mockSyncMatchMemoCacheToStorage.mockResolvedValue(undefined);

      await processSaveQueue();

      expect(mockPutMatchMemo).toHaveBeenCalledWith({
        matchId: 'match_123',
        memo: 'First half notes',
        updatedAt: expect.any(Number),
      });
      expect(mockSyncMatchMemoCacheToStorage).toHaveBeenCalledWith('match_123');

      const queue = storageMap[STORAGE_KEYS.SAVE_QUEUE] as any[];
      expect(queue).toHaveLength(0);
    });

    it('successfully processes EVENT memo and cleans queue', async () => {
      storageMap[STORAGE_KEYS.SAVE_QUEUE] = [
        {
          id: 'item_event_1',
          status: 'pending',
          mode: 'EVENT',
          matchId: 'match_123',
          entityId: 'evt_abc',
          period: 2,
          minute: 75,
          second: 10,
          labels: ['カウンター'],
          memo: 'Fast break',
          retryCount: 0,
          createdAt: Date.now(),
        },
      ];

      mockSaveCustomEvent.mockResolvedValue(undefined);

      await processSaveQueue();

      expect(mockSaveCustomEvent).toHaveBeenCalledWith({
        id: 'evt_abc',
        match_id: 'match_123',
        period: 2,
        minute: 75,
        second: 10,
        labels: ['カウンター'],
        memo: 'Fast break',
        created_at: expect.any(Number),
      });

      const queue = storageMap[STORAGE_KEYS.SAVE_QUEUE] as any[];
      expect(queue).toHaveLength(0);
    });

    it('increments retryCount on first failure and keeps item in queue', async () => {
      storageMap[STORAGE_KEYS.SAVE_QUEUE] = [
        {
          id: 'item_fail_1',
          status: 'pending',
          mode: 'MATCH',
          matchId: 'match_123',
          memo: 'Notes',
          retryCount: 0,
          createdAt: Date.now(),
        },
      ];

      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      mockPutMatchMemo.mockRejectedValue(new Error('IndexedDB Write Failed'));

      await processSaveQueue();

      const queue = storageMap[STORAGE_KEYS.SAVE_QUEUE] as any[];
      expect(queue).toHaveLength(1);
      expect(queue[0]).toMatchObject({
        id: 'item_fail_1',
        status: 'error',
        retryCount: 1,
        errorMessage: 'IndexedDB Write Failed',
      });
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('increments retryCount on second failure (retryCount: 1 -> 2) and keeps item in queue', async () => {
      storageMap[STORAGE_KEYS.SAVE_QUEUE] = [
        {
          id: 'item_fail_2',
          status: 'error',
          mode: 'MATCH',
          matchId: 'match_123',
          memo: 'Notes',
          retryCount: 1,
          errorMessage: 'IndexedDB Write Failed',
          createdAt: Date.now(),
        },
      ];

      mockPutMatchMemo.mockRejectedValue(new Error('IndexedDB Lock Error'));

      await processSaveQueue();

      const queue = storageMap[STORAGE_KEYS.SAVE_QUEUE] as any[];
      expect(queue).toHaveLength(1);
      expect(queue[0]).toMatchObject({
        id: 'item_fail_2',
        status: 'error',
        retryCount: 2,
        errorMessage: 'IndexedDB Lock Error',
      });
    });

    it('removes item from queue on 3rd failure (retryCount: 2 -> 3) and logs console.error', async () => {
      storageMap[STORAGE_KEYS.SAVE_QUEUE] = [
        {
          id: 'item_fail_3',
          status: 'error',
          mode: 'MATCH',
          matchId: 'match_123',
          memo: 'Notes',
          retryCount: 2,
          errorMessage: 'IndexedDB Error',
          createdAt: Date.now(),
        },
      ];

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockPutMatchMemo.mockRejectedValue(new Error('Persistent Storage Error'));

      await processSaveQueue();

      const queue = storageMap[STORAGE_KEYS.SAVE_QUEUE] as any[];
      expect(queue).toHaveLength(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Max retries reached for item_fail_3'),
        expect.any(Error),
      );
      consoleErrorSpy.mockRestore();
    });
  });
});
