import type {
  AnimationOrientation,
  TacticalScene,
} from '@/stores/tactical-animation-store';

export interface ExportJobConfig {
  scenes: TacticalScene[];
  orientation: AnimationOrientation;
  fps: number;
  bitrate: number;
  backgroundColor: string;
  exportWidth: number;
  exportHeight: number;
  teamVisibility?: 'both' | 'home' | 'away';
}

export type ExportWorkerInMessage =
  | {
      type: 'start';
      config: ExportJobConfig;
      photos?: Record<string, ImageBitmap>;
    }
  | {
      type: 'cancel';
    };

export type ExportWorkerOutMessage =
  | {
      type: 'progress';
      progress: number;
    }
  | {
      type: 'complete';
      buffer: ArrayBuffer;
    }
  | {
      type: 'error';
      error: string;
    };
