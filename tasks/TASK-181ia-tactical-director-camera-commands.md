# TASK-181ia: ディレクターカメラ命令の Domain 統合（旧ストア完全廃止シリーズ）

## 1. Metadata & Goal
- **Status**: `DONE`
- **Commit**: `feat(tactical): add director camera domain helpers and commands`
- **Series**: 旧ストア完全廃止シリーズ。181hb（フェーズ一括操作）➔ **181ia（本タスク）** ➔ 181ib（クリップボード）➔ 181ic（スライド生成・リセット・試合ACL）➔ 181j〜。181hb の完了を前提とする。
- **Goal**: 旧 `director-camera-actions.ts`（`upsertGlobalCameraKeyframe` / `deleteGlobalCameraKeyframe` / `upsertActionCameraCue` / `deleteActionCameraCue`）を純粋関数と `TacticalCommand` + `applyTacticalCommand` へ統合する。
- **Negative Contracts (完了時に0件であるべき条件)**:
  - Deleted files: なし（旧スライスの削除は 181l）
  - `src/lib/tactical/domain/` が `@/features/tactical-unified/` を import しないこと

## 2. Architectural Invariants & Consumers
- **Invariants (壊してはいけない前提条件)**:
  1. **150msスナップと `gkf-init-0` 自動補完**: `UPSERT_GLOBAL_CAMERA_KEYFRAME` は `keyframeId` 未指定時 150ms 以内の既存キーフレームを上書きし、キーフレーム0件かつ `timeMs > 150` の新規追加時は先頭（`timeMs: 0`, id `'gkf-init-0'`）に対象スライド（`activeSlideId` または先頭スライド）の `pitchTransform` 相当を自動挿入する。`yaw` は `((yaw % 360) + 360) % 360` に正規化する。
  2. **削除命令の参照透過性**: `DELETE_GLOBAL_CAMERA_KEYFRAME` / `DELETE_ACTION_CAMERA_CUE` は `directorCamera` 未設定または該当 ID 不在の場合、元の `phase` / `project` 参照をそのまま返し、不要な Undo 履歴を積まない。
  3. **ActionCue 重複区間スナップ**: `cueId` 未指定時、`[c.startTimeMs - 150, cueEnd + 150]`（`cueEnd = startTimeMs + durationMs + (autoReturn ? holdMs + returnDurationMs : 0)`）内の最も `startTimeMs` が近い既存 Cue を更新し、全体は `startTimeMs` 昇順に整列する。
- **Consumers (同期更新対象の全ファイルリスト)**:
  - `TacticalCommand`: `src/lib/tactical/domain/project-reducer.ts`

## 3. Implementation Phases (タスクファイル > フェーズ > タスク)

### Phase 1: ディレクターカメラ純粋関数・Command・Project Reducer 実装とテスト
- **Worker Model**: `flash`
- **Target Files**:
  - `[ADD]` `src/lib/tactical/domain/director-camera.ts`
  - `[MODIFY]` `src/lib/tactical/domain/commands.ts`
  - `[MODIFY]` `src/lib/tactical/domain/project-reducer.ts`
  - `[ADD]` `src/lib/tactical/__tests__/director-camera-commands.test.ts`

#### Task 1.1: `[ADD]` `src/lib/tactical/domain/director-camera.ts`
① ヘッダ・正規化ヘルパー・`upsertGlobalCameraKeyframeInPhase`:
```ts
import type { DomainTacticalPhase } from '@/lib/types/tactical/domain-hierarchy';
import type {
  ActionCameraCue,
  DirectorCameraTrack,
  GlobalCameraKeyframe,
} from '@/lib/types/tactical/project';
import type { Easing } from '@/lib/types/tactical/slide';

const SNAP_THRESHOLD_MS = 150;

const normalizeYaw = (yaw: number): number => ((yaw % 360) + 360) % 360;
const clampTilt = (tilt: number): number => Math.max(0, Math.min(65, tilt));
const clampZoom = (zoom: number): number => Math.max(0.4, Math.min(3.0, zoom));

export function upsertGlobalCameraKeyframeInPhase(
  phase: DomainTacticalPhase,
  params: {
    readonly timeMs: number;
    readonly patch: {
      readonly tilt?: number;
      readonly yaw?: number;
      readonly easing?: Easing;
    };
    readonly keyframeId?: string;
    readonly activeSlideId?: string;
  },
): DomainTacticalPhase {
  const track: DirectorCameraTrack = phase.directorCamera ?? {
    enabled: true,
    globalKeyframes: [],
    actionCues: [],
  };
  const globalKeyframes: GlobalCameraKeyframe[] = [...track.globalKeyframes];

  const targetIdx =
    params.keyframeId !== undefined
      ? globalKeyframes.findIndex((kf) => kf.id === params.keyframeId)
      : globalKeyframes.findIndex(
          (kf) => Math.abs(kf.timeMs - params.timeMs) <= SNAP_THRESHOLD_MS,
        );

  if (targetIdx >= 0) {
    const existing = globalKeyframes[targetIdx];
    const nextTimeMs =
      params.keyframeId !== undefined && params.timeMs >= 0
        ? Math.round(params.timeMs)
        : existing.timeMs;
    globalKeyframes[targetIdx] = {
      ...existing,
      timeMs: nextTimeMs,
      tilt:
        params.patch.tilt !== undefined
          ? clampTilt(params.patch.tilt)
          : existing.tilt,
      yaw:
        params.patch.yaw !== undefined
          ? normalizeYaw(params.patch.yaw)
          : existing.yaw,
      easing: params.patch.easing ?? existing.easing,
    };
  } else {
    if (globalKeyframes.length === 0 && params.timeMs > SNAP_THRESHOLD_MS) {
      const refSlide =
        phase.slides.find((sl) => sl.id === params.activeSlideId) ??
        phase.slides[0];
      globalKeyframes.push({
        id: 'gkf-init-0',
        timeMs: 0,
        tilt: clampTilt(refSlide?.pitchTransform?.tilt ?? 0),
        yaw: normalizeYaw(refSlide?.pitchTransform?.yaw ?? 90),
        easing: 'ease-in-out',
      });
    }
    globalKeyframes.push({
      id: params.keyframeId ?? crypto.randomUUID(),
      timeMs: Math.max(0, Math.round(params.timeMs)),
      tilt: clampTilt(params.patch.tilt ?? 0),
      yaw: params.patch.yaw !== undefined ? normalizeYaw(params.patch.yaw) : 90,
      easing: params.patch.easing ?? 'ease-in-out',
    });
  }

  globalKeyframes.sort((a, b) => a.timeMs - b.timeMs);

  return {
    ...phase,
    directorCamera: {
      ...track,
      enabled: true,
      globalKeyframes,
      actionCues: track.actionCues,
    },
  };
}
```

② `deleteGlobalCameraKeyframeInPhase` と `findMatchingCueIndex`:
```ts
export function deleteGlobalCameraKeyframeInPhase(
  phase: DomainTacticalPhase,
  keyframeId: string,
): DomainTacticalPhase {
  if (!phase.directorCamera) return phase;
  const globalKeyframes = phase.directorCamera.globalKeyframes.filter(
    (kf) => kf.id !== keyframeId,
  );
  if (globalKeyframes.length === phase.directorCamera.globalKeyframes.length) {
    return phase;
  }
  return {
    ...phase,
    directorCamera: { ...phase.directorCamera, globalKeyframes },
  };
}

function findMatchingCueIndex(
  cues: readonly ActionCameraCue[],
  startTimeMs: number,
  cueId?: string,
): number {
  if (cueId !== undefined) return cues.findIndex((c) => c.id === cueId);
  let targetIdx = -1;
  let minDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < cues.length; i++) {
    const c = cues[i];
    const cueEnd =
      c.startTimeMs +
      (c.durationMs ?? 1000) +
      (c.autoReturn ? (c.holdMs ?? 0) + (c.returnDurationMs ?? 800) : 0);
    if (
      startTimeMs >= c.startTimeMs - SNAP_THRESHOLD_MS &&
      startTimeMs <= cueEnd + SNAP_THRESHOLD_MS
    ) {
      const dist = Math.abs(c.startTimeMs - startTimeMs);
      if (dist < minDistance) {
        minDistance = dist;
        targetIdx = i;
      }
    }
  }
  return targetIdx;
}
```

③ `upsertActionCameraCueInPhase` と `deleteActionCameraCueInPhase`:
```ts
export function upsertActionCameraCueInPhase(
  phase: DomainTacticalPhase,
  params: {
    readonly startTimeMs: number;
    readonly patch: Partial<Omit<ActionCameraCue, 'id'>>;
    readonly cueId?: string;
  },
): DomainTacticalPhase {
  const track: DirectorCameraTrack = phase.directorCamera ?? {
    enabled: true,
    globalKeyframes: [],
    actionCues: [],
  };
  const actionCues: ActionCameraCue[] = [...track.actionCues];
  const targetIdx = findMatchingCueIndex(
    actionCues,
    params.startTimeMs,
    params.cueId,
  );

  if (targetIdx >= 0) {
    const existing = actionCues[targetIdx];
    actionCues[targetIdx] = {
      ...existing,
      startTimeMs:
        params.patch.startTimeMs !== undefined
          ? Math.max(0, Math.round(params.patch.startTimeMs))
          : existing.startTimeMs,
      durationMs:
        params.patch.durationMs !== undefined
          ? Math.max(100, params.patch.durationMs)
          : existing.durationMs,
      transitionInMs:
        params.patch.transitionInMs !== undefined
          ? Math.max(0, params.patch.transitionInMs)
          : existing.transitionInMs,
      holdMs:
        params.patch.holdMs !== undefined
          ? Math.max(0, params.patch.holdMs)
          : existing.holdMs,
      returnDurationMs:
        params.patch.returnDurationMs !== undefined
          ? Math.max(100, params.patch.returnDurationMs)
          : existing.returnDurationMs,
      zoom:
        params.patch.zoom !== undefined
          ? clampZoom(params.patch.zoom)
          : existing.zoom,
      panX: params.patch.panX ?? existing.panX,
      panY: params.patch.panY ?? existing.panY,
      autoReturn: params.patch.autoReturn ?? existing.autoReturn,
      easing: params.patch.easing ?? existing.easing,
    };
  } else {
    actionCues.push({
      id: params.cueId ?? crypto.randomUUID(),
      startTimeMs: Math.max(0, Math.round(params.startTimeMs)),
      durationMs: Math.max(100, params.patch.durationMs ?? 1000),
      ...(params.patch.transitionInMs !== undefined
        ? { transitionInMs: Math.max(0, params.patch.transitionInMs) }
        : {}),
      holdMs: Math.max(0, params.patch.holdMs ?? 0),
      returnDurationMs: Math.max(100, params.patch.returnDurationMs ?? 800),
      zoom: clampZoom(params.patch.zoom ?? 1.3),
      panX: params.patch.panX ?? 0,
      panY: params.patch.panY ?? 0,
      autoReturn: params.patch.autoReturn ?? false,
      easing: params.patch.easing ?? 'ease-in-out',
    });
  }

  actionCues.sort((a, b) => a.startTimeMs - b.startTimeMs);
  return {
    ...phase,
    directorCamera: {
      ...track,
      enabled: true,
      globalKeyframes: track.globalKeyframes,
      actionCues,
    },
  };
}

export function deleteActionCameraCueInPhase(
  phase: DomainTacticalPhase,
  cueId: string,
): DomainTacticalPhase {
  if (!phase.directorCamera) return phase;
  const actionCues = phase.directorCamera.actionCues.filter(
    (c) => c.id !== cueId,
  );
  if (actionCues.length === phase.directorCamera.actionCues.length) {
    return phase;
  }
  return {
    ...phase,
    directorCamera: { ...phase.directorCamera, actionCues },
  };
}
```

#### Task 1.2: `[MODIFY]` `src/lib/tactical/domain/commands.ts`
**Before (L22-L28)**
```ts
  VisionCone,
} from '@/lib/types/tactical/player';
import type {
  AspectRatio,
  XMediaPresetKey,
} from '@/lib/types/tactical/primitives';

export type EntityKind = 'player' | 'arrow' | 'zone' | 'text';
```
**After**
```ts
  VisionCone,
} from '@/lib/types/tactical/player';
import type {
  AspectRatio,
  XMediaPresetKey,
} from '@/lib/types/tactical/primitives';
import type { ActionCameraCue } from '@/lib/types/tactical/project';
import type { Easing } from '@/lib/types/tactical/slide';

export type EntityKind = 'player' | 'arrow' | 'zone' | 'text';
```

**Before (L253-L268)**
```ts
  | {
      readonly type: 'UPDATE_PROJECT_META';
      readonly patch: Partial<
        Pick<
          DomainTacticalProject,
          | 'title'
          | 'homeColor'
          | 'awayColor'
          | 'pitchAppearance'
          | 'screenBackground'
          | 'tags'
          | 'matchFormations'
        >
      >;
    };
```
**After**
```ts
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
    }
  | {
      readonly type: 'UPDATE_PROJECT_META';
      readonly patch: Partial<
        Pick<
          DomainTacticalProject,
          | 'title'
          | 'homeColor'
          | 'awayColor'
          | 'pitchAppearance'
          | 'screenBackground'
          | 'tags'
          | 'matchFormations'
        >
      >;
    };
```

#### Task 1.3: `[MODIFY]` `src/lib/tactical/domain/project-reducer.ts`
**Before (L1-L20)**
```ts
import type {
  DomainSlide,
  DomainTacticalPhase,
  DomainTacticalProject,
} from '@/lib/types/tactical/domain-hierarchy';
import type { TacticalCommand } from './commands';
import {
  createFreshSlide,
  handleApplyBallScaleToPhaseSlides,
  handleApplyImageBackground,
  handleApplyPlayerStyleToPhaseSlides,
  handleApplyXMediaPreset,
  handleAutoFitBoundaryBox,
  handleCenterPitchAndBoundary,
  handleChangePhaseAspectRatio,
  handleRestoreDefaultPitch,
} from './project-phase-handlers';
import { applySlideCommand } from './slide-reducer';
```
**After**
```ts
import type {
  DomainSlide,
  DomainTacticalPhase,
  DomainTacticalProject,
} from '@/lib/types/tactical/domain-hierarchy';
import type { TacticalCommand } from './commands';
import {
  deleteActionCameraCueInPhase,
  deleteGlobalCameraKeyframeInPhase,
  upsertActionCameraCueInPhase,
  upsertGlobalCameraKeyframeInPhase,
} from './director-camera';
import {
  createFreshSlide,
  handleApplyBallScaleToPhaseSlides,
  handleApplyImageBackground,
  handleApplyPlayerStyleToPhaseSlides,
  handleApplyXMediaPreset,
  handleAutoFitBoundaryBox,
  handleCenterPitchAndBoundary,
  handleChangePhaseAspectRatio,
  handleRestoreDefaultPitch,
} from './project-phase-handlers';
import { applySlideCommand } from './slide-reducer';
```

**Before (L285-L294)**
```ts
    case 'UPDATE_PROJECT_META':
      return {
        ...project,
        ...command.patch,
        updatedAt: now,
      };
  }
}
```
**After**
```ts
    case 'UPSERT_GLOBAL_CAMERA_KEYFRAME': {
      const targetPhase = project.phases.find((p) => p.id === command.phaseId);
      if (!targetPhase) return project;
      const updatedPhase = upsertGlobalCameraKeyframeInPhase(targetPhase, {
        timeMs: command.timeMs,
        patch: command.patch,
        keyframeId: command.keyframeId,
        activeSlideId: command.activeSlideId,
      });
      return {
        ...project,
        phases: project.phases.map((p) =>
          p.id === command.phaseId ? updatedPhase : p,
        ),
        updatedAt: now,
      };
    }

    case 'DELETE_GLOBAL_CAMERA_KEYFRAME': {
      const targetPhase = project.phases.find((p) => p.id === command.phaseId);
      if (!targetPhase) return project;
      const updatedPhase = deleteGlobalCameraKeyframeInPhase(
        targetPhase,
        command.keyframeId,
      );
      if (updatedPhase === targetPhase) return project;
      return {
        ...project,
        phases: project.phases.map((p) =>
          p.id === command.phaseId ? updatedPhase : p,
        ),
        updatedAt: now,
      };
    }

    case 'UPSERT_ACTION_CAMERA_CUE': {
      const targetPhase = project.phases.find((p) => p.id === command.phaseId);
      if (!targetPhase) return project;
      const updatedPhase = upsertActionCameraCueInPhase(targetPhase, {
        startTimeMs: command.startTimeMs,
        patch: command.patch,
        cueId: command.cueId,
      });
      return {
        ...project,
        phases: project.phases.map((p) =>
          p.id === command.phaseId ? updatedPhase : p,
        ),
        updatedAt: now,
      };
    }

    case 'DELETE_ACTION_CAMERA_CUE': {
      const targetPhase = project.phases.find((p) => p.id === command.phaseId);
      if (!targetPhase) return project;
      const updatedPhase = deleteActionCameraCueInPhase(
        targetPhase,
        command.cueId,
      );
      if (updatedPhase === targetPhase) return project;
      return {
        ...project,
        phases: project.phases.map((p) =>
          p.id === command.phaseId ? updatedPhase : p,
        ),
        updatedAt: now,
      };
    }

    case 'UPDATE_PROJECT_META':
      return {
        ...project,
        ...command.patch,
        updatedAt: now,
      };
  }
}
```

#### Task 1.4: `[ADD]` `src/lib/tactical/__tests__/director-camera-commands.test.ts`
① フィクスチャと Global Keyframe テスト:
```ts
import { describe, expect, it } from 'vitest';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type { DomainTacticalProject } from '@/lib/types/tactical/domain-hierarchy';
import { DEFAULT_BOUNDARY_BOX_16_9 } from '@/lib/types/tactical/slide';
import { applyTacticalCommand } from '../domain/project-reducer';

function createBaseProject(): DomainTacticalProject {
  return {
    id: 'proj-cam',
    version: '3.0.0',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    homeColor: { primary: '#034694' },
    awayColor: { primary: '#ef4444' },
    pitchAppearance: {
      grassTheme: 'emerald',
      lineColor: '#ffffff',
      showLineMarkings: true,
    },
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
```

② Action Cue テスト（`describe` 末尾へ追記して閉じる）:
```ts
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
    expect(
      p3.phases[0].directorCamera!.actionCues.map((c) => c.id),
    ).toEqual(['cue-b', 'cue-a']);

    const p4 = applyTacticalCommand(p3, {
      type: 'DELETE_ACTION_CAMERA_CUE',
      phaseId: 'ph-1',
      cueId: 'cue-a',
    });
    expect(
      p4.phases[0].directorCamera!.actionCues.map((c) => c.id),
    ).toEqual(['cue-b']);
  });
});
```
