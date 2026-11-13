import type { ActionCameraCue } from '@/lib/types/tactical/project';
import type { Easing } from '@/lib/types/tactical/slide';

export type DirectorCameraCommand =
  | {
      readonly type: 'UPSERT_GLOBAL_CAMERA_KEYFRAME';
      readonly phaseId: string;
      readonly timeMs: number;
      readonly patch: {
        readonly tilt?: number;
        readonly yaw?: number;
        readonly easing?: Easing;
      };
      readonly keyframeId?: string;
      readonly activeSlideId?: string;
    }
  | {
      readonly type: 'DELETE_GLOBAL_CAMERA_KEYFRAME';
      readonly phaseId: string;
      readonly keyframeId: string;
    }
  | {
      readonly type: 'UPSERT_ACTION_CAMERA_CUE';
      readonly phaseId: string;
      readonly startTimeMs: number;
      readonly patch: Partial<Omit<ActionCameraCue, 'id'>>;
      readonly cueId?: string;
    }
  | {
      readonly type: 'DELETE_ACTION_CAMERA_CUE';
      readonly phaseId: string;
      readonly cueId: string;
    };
