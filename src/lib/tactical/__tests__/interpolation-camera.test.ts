import { describe, expect, it } from 'vitest';
import {
  type DirectorCameraTrack,
  type Slide,
  SlideSchema,
} from '@/lib/types/tactical-unified';
import {
  resolveCameraAtTime,
  resolveEffectiveSlideSegments,
} from '../interpolation-camera';

describe('resolveCameraAtTime with directorCamera', () => {
  const slides: Slide[] = [
    SlideSchema.parse({
      id: 's1',
      index: 0,
      transitionDurationMs: 1000,
      pauseMs: 500,
      players: [],
      arrows: [],
      zones: [],
      texts: [],
      ball: { x: 50, y: 50, visible: true },
    }),
    SlideSchema.parse({
      id: 's2',
      index: 1,
      transitionDurationMs: 1000,
      pauseMs: 500,
      players: [],
      arrows: [],
      zones: [],
      texts: [],
      ball: { x: 50, y: 50, visible: true },
    }),
  ];

  const directorCamera: DirectorCameraTrack = {
    enabled: true,
    globalKeyframes: [
      { id: 'g1', timeMs: 1000, tilt: 0, yaw: 90 },
      { id: 'g2', timeMs: 3000, tilt: 30, yaw: 45 },
    ],
    actionCues: [],
  };

  it('returns isCameraMoving: true when director camera is in motion', () => {
    const segments = resolveEffectiveSlideSegments(slides);
    const activeSegment = segments[0];

    const result = resolveCameraAtTime(
      slides,
      segments,
      activeSegment,
      2000,
      500,
      directorCamera,
    );

    expect(result.isCameraMoving).toBe(true);
  });
});
