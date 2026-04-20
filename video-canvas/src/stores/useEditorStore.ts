import { create } from 'zustand';
import { StorageUtils } from '@/lib/storage';
import type { CaptureMetadata } from '@/lib/types';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// --- Store ---

export type ExportStatus = 'idle' | 'loading' | 'success' | 'error';
export type ExportType = 'copy' | 'save';

interface EditorState {
  lastCapturedFrame: string | null;
  cropRect: CaptureMetadata | null;
  isHydrated: boolean;
  triggerCopy: number;
  triggerSave: number;
  exportStatus: ExportStatus;
  lastExportType: ExportType | null;

  setLastCapturedFrame: (dataUrl: string | null) => void;
  setCropRect: (rect: CaptureMetadata | null) => void;
  hydrateFromStorage: () => Promise<void>;

  dispatchCopy: () => void;
  dispatchSave: () => void;
  setExportStatus: (status: ExportStatus, type?: ExportType | null) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  lastCapturedFrame: null,
  cropRect: null,
  isHydrated: false,
  triggerCopy: 0,
  triggerSave: 0,
  exportStatus: 'idle',
  lastExportType: null,

  setLastCapturedFrame: (dataUrl) => set({ lastCapturedFrame: dataUrl }),
  setCropRect: (rect) => set({ cropRect: rect }),

  dispatchCopy: () => set((state) => ({ triggerCopy: state.triggerCopy + 1 })),
  dispatchSave: () => set((state) => ({ triggerSave: state.triggerSave + 1 })),
  setExportStatus: (status, type) =>
    set((state) => ({
      exportStatus: status,
      lastExportType: type !== undefined ? type : state.lastExportType,
    })),

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
        const data = await StorageUtils.getCaptureData(captureId);

        if (data?.lastCapturedFrame) {
          console.log(
            `[EditorStore] Successfully hydrated from storage on attempt ${attempt + 1}`,
          );
          set({
            lastCapturedFrame: data.lastCapturedFrame || null,
            cropRect: data.cropRect || null,
          });
          return; // 成功したら終了
        }

        console.warn(
          `[EditorStore] Attempt ${attempt + 1} failed to find data. Retrying...`,
        );
        await sleep(150 * (attempt + 1));
      }

      console.warn(
        '[EditorStore] Use persistent data could not be found after all attempts.',
      );
    } catch (err) {
      console.error('[EditorStore] Failed to hydrate from storage:', err);
    } finally {
      set({ isHydrated: true });
    }
  },
}));
