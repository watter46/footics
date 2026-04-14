import { create } from 'zustand';
import { z } from 'zod';
import { browser } from 'wxt/browser';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// --- Storage Schema ---

const CaptureStorageSchema = z.object({
  lastCapturedFrame: z.string().nullable().optional(),
  cropRect: z.any().nullable().optional(), // CaptureMetadata 型を許容
});

// --- Store ---

interface EditorState {
  lastCapturedFrame: string | null;
  cropRect: any | null;
  isHydrated: boolean;
  setLastCapturedFrame: (dataUrl: string | null) => void;
  setCropRect: (rect: any | null) => void;
  hydrateFromStorage: () => Promise<void>;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  lastCapturedFrame: null,
  cropRect: null,
  isHydrated: false,
  setLastCapturedFrame: (dataUrl) => set({ lastCapturedFrame: dataUrl }),
  setCropRect: (rect) => set({ cropRect: rect }),
  hydrateFromStorage: async () => {
    if (get().isHydrated) return;

    try {
      let captureId: string | null = null;
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        captureId = urlParams.get('id');
      }

      console.log(`[EditorStore] Starting hydration. ID: ${captureId}`);

      // 最大3回リトライ (ストレージの伝搬待ち対策)
      for (let attempt = 0; attempt < 3; attempt++) {
        let result: any = null;

        if (captureId) {
          const storageKey = `capture:${captureId}`;
          // session から優先的に取得
          const sessionData = (await browser.storage.session.get(storageKey).catch(() => ({}))) as any;
          result = sessionData[storageKey];

          // session になければ local から取得
          if (!result) {
            const localData = (await browser.storage.local.get(storageKey).catch(() => ({}))) as any;
            result = localData[storageKey];
          }
        } else {
          // フォールバック
          const sessionData = (await browser.storage.session.get(['lastCapturedFrame', 'cropRect']).catch(() => ({}))) as any;
          result = sessionData;
        }

        if (result && result.lastCapturedFrame) {
          const parsed = CaptureStorageSchema.safeParse(result);
          if (parsed.success) {
            console.log(`[EditorStore] Successfully hydrated from storage on attempt ${attempt + 1}`);
            set({ 
              lastCapturedFrame: parsed.data.lastCapturedFrame || null,
              cropRect: parsed.data.cropRect || null
            });
            return; // 成功したら終了
          }
        }

        console.warn(`[EditorStore] Attempt ${attempt + 1} failed to find data. Retrying...`);
        await sleep(150 * (attempt + 1));
      }

      console.warn('[EditorStore] Use persistent data could not be found after all attempts.');
    } catch (err) {
      console.error('[EditorStore] Failed to hydrate from storage:', err);
    } finally {
      set({ isHydrated: true });
    }
  },
}));
