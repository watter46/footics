import { describe, expect, it } from 'vitest';
import {
  normalizePhases,
  normalizeSlide,
} from '@/lib/tactical/acl/slide-normalizer';
import {
  hasActiveDirectorCameraTrack,
  resolveSyntheticDirectorCamera,
} from '@/lib/tactical/engine/director-camera';
import { renderTacticalPhaseFrameToCanvas } from '@/lib/tactical/export/tactical-phase-frame-renderer';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import type { DirectorCameraTrack } from '@/lib/types/tactical-unified';

function createMockCanvasContext(): {
  ctx: CanvasRenderingContext2D;
  calls: Array<{ method: string; args: unknown[] }>;
} {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const ctx = new Proxy(
    {
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      globalAlpha: 1,
      font: '12px sans-serif',
      textAlign: 'left',
      textBaseline: 'alphabetic',
      shadowColor: 'transparent',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      lineCap: 'butt',
      lineJoin: 'miter',
    },
    {
      get(target, prop) {
        if (prop in target) {
          return Reflect.get(target, prop);
        }
        return (...args: unknown[]) => {
          calls.push({ method: String(prop), args });
          if (
            prop === 'createLinearGradient' ||
            prop === 'createRadialGradient'
          ) {
            return { addColorStop: () => undefined };
          }
          if (prop === 'measureText') {
            return { width: 10 };
          }
          return undefined;
        };
      },
      set(target, prop, value) {
        Reflect.set(target, prop, value);
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;

  return { ctx, calls };
}

describe('preview-layout-parity', () => {
  it('matches layout playback camera and rendered frame when directorCamera has globalKeyframes and actionCues', () => {
    const directorCamera: DirectorCameraTrack = {
      enabled: true,
      globalKeyframes: [
        {
          id: 'gk-0',
          timeMs: 0,
          tilt: 0,
          yaw: 0,
        },
        {
          id: 'gk-1',
          timeMs: 2000,
          tilt: 30,
          yaw: 8,
        },
      ],
      actionCues: [
        {
          id: 'cue-1',
          startTimeMs: 500,
          durationMs: 1000,
          zoom: 1.4,
          panX: 0.2,
          panY: 0.1,
          autoReturn: true,
          easing: 'ease-in-out',
        },
      ],
    };

    expect(hasActiveDirectorCameraTrack(directorCamera)).toBe(true);

    const slide = normalizeSlide(
      {
        id: 'slide-1',
        pitchTransform: {
          tilt: 45,
          yaw: 0,
          zoom: 1,
          panX: 0,
          panY: 0,
          isLocked: false,
        },
      },
      0,
    );

    const [phase] = normalizePhases({
      slides: [slide],
    });
    expect(phase).toBeDefined();
    if (!phase) return;

    const sampleTimes = [0, 500, 1000, 1500, 2000];

    for (const timeMs of sampleTimes) {
      const resolvedCamera = resolveSyntheticDirectorCamera(
        directorCamera,
        timeMs,
        { isEditing: false },
      );
      expect(resolvedCamera).not.toBeNull();

      const layoutCanvas = createMockCanvasContext();
      const exportCanvas = createMockCanvasContext();

      // Layout playback (TacticalSplitPreviewPanel equivalent: pitchTransform: null)
      renderTacticalPhaseFrameToCanvas({
        ctx: layoutCanvas.ctx,
        phase,
        timeMs,
        width: 960,
        height: 540,
        baseWidth: 960,
        baseHeight: 540,
        aspectRatio: '16:9',
        boundaryBox: null,
        transparent: false,
        pitchTransform: null,
        pitchTransformOverride: undefined,
        directorCamera,
        directorCameraOptions: { isEditing: false },
      });

      // Export preview playback (useExportPreviewAnimation when effectiveIsPlaying && hasActiveDirectorCameraTrack)
      const isDirectorPlaybackActive =
        true && hasActiveDirectorCameraTrack(directorCamera);
      renderTacticalPhaseFrameToCanvas({
        ctx: exportCanvas.ctx,
        phase,
        timeMs,
        width: 960,
        height: 540,
        baseWidth: 960,
        baseHeight: 540,
        aspectRatio: '16:9',
        boundaryBox: null,
        transparent: false,
        pitchTransform: isDirectorPlaybackActive
          ? undefined
          : slide.pitchTransform,
        pitchTransformOverride: undefined,
        directorCamera,
        directorCameraOptions: { isEditing: false },
      });

      expect(exportCanvas.calls).toEqual(layoutCanvas.calls);
    }
  });
});
