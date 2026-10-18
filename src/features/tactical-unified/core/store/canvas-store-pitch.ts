import type { StoreApi } from 'zustand/vanilla';
import type {
  AspectRatio,
  BoundaryBox,
  PitchTransform,
} from '@/lib/types/tactical-unified';
import type { CanvasActions, CanvasStore } from '../types';

type SetState = StoreApi<CanvasStore>['setState'];

export const DEFAULT_PITCH_TRANSFORM: PitchTransform = {
  panX: 0,
  panY: 0,
  zoom: 1,
  tilt: 0,
  isLocked: false,
};

export const DEFAULT_BOUNDARY_BOX: BoundaryBox = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  enabled: true,
  visible: false,
  fitTarget: 'canvas',
};

export const EMPTY_ANNOTATIONS = {
  arrows: [],
  zones: [],
  texts: [],
  markers: [],
};

export function createPitchActions(
  set: SetState,
  pushHistory: () => void,
): Pick<
  CanvasActions,
  | 'setBoundaryBox'
  | 'setPitchTransform'
  | 'resetPitchTransform'
  | 'setPitchLocked'
  | 'setAspectRatio'
> {
  return {
    setBoundaryBox: (box: BoundaryBox) => {
      pushHistory();
      set({ boundaryBox: box });
    },
    setPitchTransform: (patch) => {
      set((s) => {
        const next =
          typeof patch === 'function' ? patch(s.pitchTransform) : patch;
        return {
          pitchTransform: {
            ...s.pitchTransform,
            ...next,
          },
        };
      });
    },
    resetPitchTransform: () => {
      set({ pitchTransform: { ...DEFAULT_PITCH_TRANSFORM } });
    },
    setPitchLocked: (locked: boolean) => {
      set((s) => ({
        pitchTransform: {
          ...s.pitchTransform,
          isLocked: locked,
        },
      }));
    },
    setAspectRatio: (aspectRatio: AspectRatio) => {
      set({ aspectRatio });
    },
  };
}
