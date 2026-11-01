/**
 * video-mediabunny.worker.ts
 * Dedicated Web Worker for Off-Thread Tactical Video Export using Mediabunny.
 */

import type { VideoExportOptions } from './video-export-types';
import { exportVideoWithMediabunny } from './video-mediabunny-export';

export interface WorkerStartExportMessage {
  type: 'START_EXPORT';
  payload: VideoExportOptions;
}

export type WorkerExportInMessage = WorkerStartExportMessage;

export type WorkerExportOutMessage =
  | {
      type: 'PROGRESS';
      progress: { percent: number; frame: number; totalFrames: number };
    }
  | {
      type: 'SUCCESS';
      buffer: ArrayBuffer;
      mimeType: string;
    }
  | {
      type: 'ERROR';
      error: string;
    };

self.addEventListener(
  'message',
  async (event: MessageEvent<WorkerExportInMessage>) => {
    const data = event.data;
    if (!data || data.type !== 'START_EXPORT') {
      return;
    }

    try {
      const payload: VideoExportOptions = data.payload;
      const blob = await exportVideoWithMediabunny({
        ...payload,
        isWorkerContext: true,
        onProgress: (progress) => {
          self.postMessage({ type: 'PROGRESS', progress });
        },
      });

      const buffer = await blob.arrayBuffer();
      self.postMessage(
        {
          type: 'SUCCESS',
          buffer,
          mimeType: blob.type || 'video/mp4',
        },
        { transfer: [buffer] },
      );
    } catch (err) {
      self.postMessage({
        type: 'ERROR',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },
);
