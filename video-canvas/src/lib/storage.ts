import { browser } from 'wxt/browser';
import { z } from 'zod';
import type { CaptureMetadata } from './types';

// --- Storage Schema ---

export const CaptureStorageSchema = z.object({
  lastCapturedFrame: z.string().nullable().optional(),
  cropRect: z.any().nullable().optional(), // Later we can type this better with CaptureMetadataSchema if needed
  isDirectCapture: z.boolean().optional(),
  timestamp: z.number().optional(),
});

export type CaptureStorageData = z.infer<typeof CaptureStorageSchema>;

// --- Storage Utils ---

export const StorageUtils = {
  getCaptureKey: (captureId: string) => `capture:${captureId}`,

  /**
   * Session / Local の両方から指定のキーのデータを試行取得する
   */
  async getCaptureData(
    captureId: string | null,
  ): Promise<CaptureStorageData | null> {
    try {
      if (captureId) {
        const storageKey = this.getCaptureKey(captureId);

        // session から優先的に取得
        const sessionData = (await browser.storage.session
          .get(storageKey)
          .catch(() => ({}))) as any;
        let result = sessionData[storageKey];

        // session になければ local から取得
        if (!result) {
          const localData = (await browser.storage.local
            .get(storageKey)
            .catch(() => ({}))) as any;
          result = localData[storageKey];
        }

        if (result) {
          const parsed = CaptureStorageSchema.safeParse(result);
          return parsed.success ? parsed.data : null;
        }
      } else {
        // フォールバック
        const sessionData = (await browser.storage.session
          .get(['lastCapturedFrame', 'cropRect'])
          .catch(() => ({}))) as any;
        const parsed = CaptureStorageSchema.safeParse(sessionData);
        return parsed.success ? parsed.data : null;
      }
    } catch (e) {
      console.error('[StorageUtils] Failed to get capture data', e);
    }
    return null;
  },
};
