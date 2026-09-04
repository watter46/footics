import Dexie, { type Table } from 'dexie';
import { z } from 'zod';
import { STORAGE_KEYS } from '../../constants';
import {
  MemoModeSchema,
  type TacticalCapturePayload,
  TacticalCapturePayloadSchema,
} from '../../types/schemas';

export const OfflineStatusSchema = z.enum(['pending', 'synced', 'failed']);
export type OfflineStatus = z.infer<typeof OfflineStatusSchema>;

export const OfflineSaveRequestSchema = z.object({
  id: z.string(),
  status: OfflineStatusSchema,
  mode: MemoModeSchema,
  matchId: z.string(),
  memo: z.string(),
  period: z.number().int().optional(),
  minute: z.number().int().optional(),
  second: z.number().int().optional(),
  labels: z.array(z.string()).optional(),
  entityId: z.string().optional(),
  retryCount: z.number().int().default(0),
  errorMessage: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type OfflineSaveRequest = z.infer<typeof OfflineSaveRequestSchema>;

export const OfflineTacticalCaptureSchema = z.object({
  id: z.string(),
  dataUrl: z.string(),
  timestamp: z.number(),
  sourceUrl: z.string().optional(),
  title: z.string().optional(),
  status: OfflineStatusSchema.default('pending'),
  retryCount: z.number().int().default(0),
  errorMessage: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type OfflineTacticalCapture = z.infer<
  typeof OfflineTacticalCaptureSchema
>;

export class FooticsOfflineDB extends Dexie {
  saveRequests!: Table<OfflineSaveRequest, string>;
  captures!: Table<OfflineTacticalCapture, string>;

  constructor() {
    super('footics_offline_db');
    this.version(1).stores({
      saveRequests: 'id, matchId, status, createdAt, updatedAt',
      captures: 'id, status, timestamp, createdAt, updatedAt',
    });
  }
}

export const offlineDb = new FooticsOfflineDB();

export async function recordOfflineSaveRequest(
  item: Omit<
    OfflineSaveRequest,
    'createdAt' | 'updatedAt' | 'status' | 'retryCount'
  > &
    Partial<
      Pick<
        OfflineSaveRequest,
        'createdAt' | 'updatedAt' | 'status' | 'retryCount' | 'errorMessage'
      >
    >,
): Promise<OfflineSaveRequest> {
  const now = Date.now();
  const record: OfflineSaveRequest = OfflineSaveRequestSchema.parse({
    ...item,
    status: item.status ?? 'pending',
    retryCount: item.retryCount ?? 0,
    createdAt: item.createdAt ?? now,
    updatedAt: item.updatedAt ?? now,
  });
  await offlineDb.saveRequests.put(record);
  await syncOfflineQueueToStorage();
  return record;
}

export async function recordOfflineCapture(
  payload: TacticalCapturePayload,
): Promise<OfflineTacticalCapture> {
  const parsed = TacticalCapturePayloadSchema.parse(payload);
  const now = Date.now();
  const record: OfflineTacticalCapture = OfflineTacticalCaptureSchema.parse({
    ...parsed,
    status: 'pending',
    retryCount: 0,
    createdAt: now,
    updatedAt: now,
  });
  await offlineDb.captures.put(record);
  await syncOfflineQueueToStorage();
  return record;
}

export async function markOfflineSaveRequestStatus(
  id: string,
  status: OfflineStatus,
  errorMessage?: string,
): Promise<void> {
  await offlineDb.saveRequests.update(id, {
    status,
    errorMessage,
    updatedAt: Date.now(),
  });
  await syncOfflineQueueToStorage();
}

export async function markOfflineCaptureStatus(
  id: string,
  status: OfflineStatus,
  errorMessage?: string,
): Promise<void> {
  await offlineDb.captures.update(id, {
    status,
    errorMessage,
    updatedAt: Date.now(),
  });
  await syncOfflineQueueToStorage();
}

export async function syncOfflineQueueToStorage(): Promise<void> {
  try {
    const [pendingSaves, pendingCaptures] = await Promise.all([
      offlineDb.saveRequests.where('status').equals('pending').count(),
      offlineDb.captures.where('status').equals('pending').count(),
    ]);
    await browser.storage.local.set({
      [STORAGE_KEYS.OFFLINE_QUEUE]: {
        pendingSaves,
        pendingCaptures,
        updatedAt: Date.now(),
      },
    });
  } catch (err) {
    console.warn('[offline-queue] Failed to sync state to storage:', err);
  }
}

export async function replayOfflineQueue(
  dispatchCapture?: (payload: TacticalCapturePayload) => void,
): Promise<{ replayedSaves: number; replayedCaptures: number }> {
  let replayedSaves = 0;
  let replayedCaptures = 0;

  const pendingSaves = await offlineDb.saveRequests
    .where('status')
    .equals('pending')
    .toArray();

  for (const item of pendingSaves) {
    try {
      const { addToSaveQueue } = await import('./save-queue');
      await addToSaveQueue({
        mode: item.mode,
        matchId: item.matchId,
        memo: item.memo,
        period: item.period,
        minute: item.minute,
        second: item.second,
        labels: item.labels,
        entityId: item.entityId,
      });
      await markOfflineSaveRequestStatus(item.id, 'synced');
      replayedSaves++;
    } catch (err) {
      console.warn(`[offline-queue] Replaying save ${item.id} failed:`, err);
      const nextRetries = item.retryCount + 1;
      await offlineDb.saveRequests.update(item.id, {
        retryCount: nextRetries,
        status: nextRetries >= 3 ? 'failed' : 'pending',
        errorMessage: err instanceof Error ? err.message : String(err),
        updatedAt: Date.now(),
      });
    }
  }

  const pendingCaptures = await offlineDb.captures
    .where('status')
    .equals('pending')
    .toArray();

  for (const cap of pendingCaptures) {
    try {
      if (dispatchCapture) {
        dispatchCapture({
          id: cap.id,
          dataUrl: cap.dataUrl,
          timestamp: cap.timestamp,
          sourceUrl: cap.sourceUrl,
          title: cap.title,
        });
      }
      await markOfflineCaptureStatus(cap.id, 'synced');
      replayedCaptures++;
    } catch (err) {
      console.warn(`[offline-queue] Replaying capture ${cap.id} failed:`, err);
    }
  }

  await syncOfflineQueueToStorage();
  return { replayedSaves, replayedCaptures };
}
