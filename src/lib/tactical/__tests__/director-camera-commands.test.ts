import { describe, expect, it } from 'vitest';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type { DomainTacticalProject } from '@/lib/types/tactical/domain-hierarchy';
import {
  DEFAULT_BOUNDARY_BOX_16_9,
  DEFAULT_PITCH_APPEARANCE,
} from '@/lib/types/tactical/slide';
import { applyTacticalCommand } from '../domain/project-reducer';

function createBaseProject(): DomainTacticalProject {
  return {
    id: 'proj-cam',
    version: '3.0.0',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    homeColor: { primary: '#034694' },
    awayColor: { primary: '#ef4444' },
    pitchAppearance: { ...DEFAULT_PITCH_APPEARANCE },
    screenBackground: { type: 'cinematic' },
    tags: [],
    phases: [
      {
        id: 'ph-1',
        name: 'Phase 1',
        aspectRatio: '16:9',
        boundaryBox: DEFAULT_BOUNDARY_BOX_16_9,
        backgroundType: 'pitch',
        slides: [
          {
            id: 'sl-1',
            index: 0,
            players: [],
            arrows: [],
            zones: [],
            texts: [],
            ball: {
              x: clampToScreenNorm(50),
              y: clampToScreenNorm(50),
              visible: true,
            },
            transitionDurationMs: 1000,
            pauseMs: 500,
            easing: 'ease-in-out',
            pitchTransform: {
              panX: 0,
              panY: 0,
              zoom: 1,
              tilt: 28,
              yaw: 110,
              isLocked: true,
            },
          },
        ],
      },
    ],
  };
}

describe('director camera commands', () => {
  it('UPSERT_GLOBAL_CAMERA_KEYFRAME inserts gkf-init-0 when >150ms, snaps <=150ms, wraps yaw, and deletes idempotently', () => {
    const p0 = createBaseProject();
    const p1 = applyTacticalCommand(p0, {
      type: 'UPSERT_GLOBAL_CAMERA_KEYFRAME',
      phaseId: 'ph-1',
      timeMs: 1200,
      patch: { tilt: 45, yaw: -30, easing: 'linear' },
      keyframeId: 'kf-1200',
      activeSlideId: 'sl-1',
    });

    const track1 = p1.phases[0].directorCamera!;
    expect(track1.enabled).toBe(true);
    expect(track1.globalKeyframes).toHaveLength(2);
    expect(track1.globalKeyframes[0]).toMatchObject({
      id: 'gkf-init-0',
      timeMs: 0,
      tilt: 28,
      yaw: 110,
    });
    expect(track1.globalKeyframes[1]).toMatchObject({
      id: 'kf-1200',
      timeMs: 1200,
      tilt: 45,
      yaw: 330,
      easing: 'linear',
    });

    const p2 = applyTacticalCommand(p1, {
      type: 'UPSERT_GLOBAL_CAMERA_KEYFRAME',
      phaseId: 'ph-1',
      timeMs: 1280,
      patch: { tilt: 50 },
    });
    expect(p2.phases[0].directorCamera!.globalKeyframes).toHaveLength(2);
    expect(p2.phases[0].directorCamera!.globalKeyframes[1].tilt).toBe(50);

    const noopDelete = applyTacticalCommand(p2, {
      type: 'DELETE_GLOBAL_CAMERA_KEYFRAME',
      phaseId: 'ph-1',
      keyframeId: 'missing-id',
    });
    expect(noopDelete).toBe(p2);

    const p3 = applyTacticalCommand(p2, {
      type: 'DELETE_GLOBAL_CAMERA_KEYFRAME',
      phaseId: 'ph-1',
      keyframeId: 'kf-1200',
    });
    expect(p3.phases[0].directorCamera!.globalKeyframes).toHaveLength(1);
  });

  it('UPSERT_ACTION_CAMERA_CUE / DELETE_ACTION_CAMERA_CUE matches active span + 150ms, sorts ascending, and deletes cleanly', () => {
    const p0 = createBaseProject();
    const p1 = applyTacticalCommand(p0, {
      type: 'UPSERT_ACTION_CAMERA_CUE',
      phaseId: 'ph-1',
      startTimeMs: 2000,
      patch: {
        durationMs: 1000,
        holdMs: 300,
        returnDurationMs: 500,
        autoReturn: true,
        zoom: 1.8,
        panX: 12,
        panY: -5,
      },
      cueId: 'cue-a',
    });

    const p2 = applyTacticalCommand(p1, {
      type: 'UPSERT_ACTION_CAMERA_CUE',
      phaseId: 'ph-1',
      startTimeMs: 3900,
      patch: { zoom: 2.2 },
    });
    expect(p2.phases[0].directorCamera!.actionCues).toHaveLength(1);
    expect(p2.phases[0].directorCamera!.actionCues[0]).toMatchObject({
      id: 'cue-a',
      zoom: 2.2,
    });

    const p3 = applyTacticalCommand(p2, {
      type: 'UPSERT_ACTION_CAMERA_CUE',
      phaseId: 'ph-1',
      startTimeMs: 500,
      patch: { durationMs: 400, zoom: 1.4 },
      cueId: 'cue-b',
    });
    expect(p3.phases[0].directorCamera!.actionCues.map((c) => c.id)).toEqual([
      'cue-b',
      'cue-a',
    ]);

    const p4 = applyTacticalCommand(p3, {
      type: 'DELETE_ACTION_CAMERA_CUE',
      phaseId: 'ph-1',
      cueId: 'cue-a',
    });
    expect(p4.phases[0].directorCamera!.actionCues.map((c) => c.id)).toEqual([
      'cue-b',
    ]);
  });
});
