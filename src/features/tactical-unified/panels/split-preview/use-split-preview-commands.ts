import { useDocumentStore } from '@/features/tactical-unified/stores/tactical-store-provider';
import type {
  ActionCameraCue,
  GlobalCameraKeyframe,
  PitchTransform,
} from '@/lib/types/tactical/camera-config';
import type { BoundaryBox } from '@/lib/types/tactical/pitch-config';

interface UseSplitPreviewCommandsParams {
  targetPhaseId: string;
  activeSlideId?: string;
  activeSlidePitchTransform?: PitchTransform;
}

export function useSplitPreviewCommands({
  targetPhaseId,
  activeSlideId,
  activeSlidePitchTransform,
}: UseSplitPreviewCommandsParams) {
  const dispatch = useDocumentStore((s) => s.dispatch);
  const dispatchSlide = useDocumentStore((s) => s.dispatchSlide);

  const updatePitchTransform = (
    slideId: string,
    transform: Partial<PitchTransform>,
  ) => {
    const base: PitchTransform = activeSlidePitchTransform ?? {
      tilt: 0,
      yaw: 90,
      zoom: 1,
      panX: 0,
      panY: 0,
      isLocked: false,
    };
    dispatchSlide(targetPhaseId, slideId, {
      type: 'UPDATE_SLIDE_META',
      patch: { pitchTransform: { ...base, ...transform } },
    });
  };

  const updatePhaseBoundaryBox = (box: BoundaryBox) => {
    dispatch({
      type: 'UPDATE_PHASE',
      phaseId: targetPhaseId,
      patch: { boundaryBox: box },
    });
  };

  const upsertGlobalCameraKeyframe = (
    timeMs: number,
    patch: Partial<Omit<GlobalCameraKeyframe, 'id'>>,
    keyframeId?: string,
  ) => {
    dispatch({
      type: 'UPSERT_GLOBAL_CAMERA_KEYFRAME',
      phaseId: targetPhaseId,
      timeMs,
      patch,
      ...(keyframeId ? { keyframeId } : {}),
      activeSlideId,
    });
  };

  const upsertActionCameraCue = (
    startTimeMs: number,
    patch: Partial<Omit<ActionCameraCue, 'id'>>,
    cueId?: string,
  ) => {
    dispatch({
      type: 'UPSERT_ACTION_CAMERA_CUE',
      phaseId: targetPhaseId,
      startTimeMs,
      patch,
      ...(cueId ? { cueId } : {}),
    });
  };

  return {
    updatePitchTransform,
    updatePhaseBoundaryBox,
    upsertGlobalCameraKeyframe,
    upsertActionCameraCue,
  };
}
