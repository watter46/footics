# TASK-181id: スライド3モード・Phase試合初期化・`RESET_SLIDE_KEEP_SQUAD` 実装（旧ストア完全廃止シリーズ）

## 1. Metadata & Goal
- **Status**: `TODO`
- **Commit**: `feat(tactical): support slide modes, match phase init, and keep-squad reset`
- **Series**: 旧ストア完全廃止シリーズ。181ic（リセット整理）➔ **181id（本タスク）** ➔ 181ie（Match ACL）➔ 181j〜。181ic の完了を前提とする。
- **Goal**:
  1. `ADD_SLIDE` の3モード（`'object-free' | 'full' | 'blank'`）および `DUPLICATE_SLIDE` の `structuredClone` による深い複製＋`trajectory` クリアを実装する。
  2. `ADD_PHASE` で `matchId` / `matchFormations` がある場合に第1フェーズ第1スライドからスカッド情報を引き継ぎつつキックオフ座標へ初期化する。
  3. `RESET_SLIDE_KEEP_SQUAD`（`TacticalCommand`）を追加し、スカッド維持・キックオフ配置復帰（`isSidesSwapped` 対応）・全アノテーション消去・`phase.boundaryBox` 初期化を実現する。
- **Negative Contracts (完了時に0件であるべき条件)**:
  - Deleted files: なし（旧スライスの削除は 181l）

## 2. Architectural Invariants & Consumers
- **Invariants (壊してはいけない前提条件)**:
  1. `ADD_SLIDE { mode: 'full' }` と `DUPLICATE_SLIDE` は全ネスト配列・オブジェクトを `structuredClone` し、配列・オブジェクト参照の共有を防ぎつつ、`pitch` 選手およびボールの `trajectory` のみクリアする。
  2. `RESET_SLIDE_KEEP_SQUAD` は `locked: true` を含む全アノテーション（`arrows` / `zones` / `texts`）を消去し、`phase.boundaryBox` を `getDefaultBoundaryBoxForAspect(phase.aspectRatio)` に戻す（旧 `resetSlideKeepSquadData` と完全一致）。
  3. `ADD_PHASE` は `matchId` / `matchFormations` 未設定時は従来どおり第1スライドの装飾除去コピー（`createFreshSlide`）で開始する。
- **Consumers (同期更新対象の全ファイルリスト)**:
  - `TacticalCommand`: `src/lib/tactical/domain/commands.ts`, `src/lib/tactical/domain/project-reducer.ts`, `src/lib/tactical/domain/project-phase-handlers.ts`

## 3. Implementation Phases (タスクファイル > フェーズ > タスク)

### Phase 1: Project Phase Handlers / Reducer へのスライドモード・初期化・Keep-Squad リセット統合
- **Worker Model**: `flash`
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/domain/commands.ts`
  - `[MODIFY]` `src/lib/tactical/domain/project-phase-handlers.ts`
  - `[MODIFY]` `src/lib/tactical/domain/project-reducer.ts`
  - `[ADD]` `src/lib/tactical/__tests__/slide-modes-and-reset.test.ts`

#### Task 1.1: `[MODIFY]` `src/lib/tactical/domain/commands.ts`
**Before (`RESTORE_DEFAULT_PITCH` 周辺)**
```ts
  | {
      readonly type: 'RESTORE_DEFAULT_PITCH';
      readonly phaseId: string;
    }
```
**After**
```ts
  | {
      readonly type: 'RESTORE_DEFAULT_PITCH';
      readonly phaseId: string;
    }
  | {
      readonly type: 'RESET_SLIDE_KEEP_SQUAD';
      readonly phaseId: string;
      readonly slideId: string;
    }
```

#### Task 1.2: `[MODIFY]` `src/lib/tactical/domain/project-phase-handlers.ts`
① `createFreshSlide` へ `newSlideId?` 引数・`structuredClone`・必要 import を追加:
**Before (L1-L45)**
```ts
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type {
  DomainSlide,
  DomainTacticalProject,
} from '@/lib/types/tactical/domain-hierarchy';
import { DEFAULT_BOUNDARY_BOX_16_9 } from '@/lib/types/tactical/slide';

export function createFreshSlide(
  templateSlide?: DomainSlide,
  index = 0,
  label = `Scene ${index + 1}`,
): DomainSlide {
  if (templateSlide) {
    return {
      id: crypto.randomUUID(),
      index,
      label,
      players: templateSlide.players.map((p) =>
        p.area === 'pitch'
          ? {
              ...p,
              connectLines: [],
              badges: [],
              visionCone: undefined,
              focus: undefined,
              trajectory: undefined,
            }
          : { ...p },
      ),
      arrows: [],
      zones: [],
      texts: [],
      ball: { ...templateSlide.ball, trajectory: undefined },
      transitionDurationMs: templateSlide.transitionDurationMs,
      pauseMs: templateSlide.pauseMs,
      easing: templateSlide.easing,
      cameraTransitionMode: templateSlide.cameraTransitionMode,
      cameraDurationMs: templateSlide.cameraDurationMs,
      pitchTransform: templateSlide.pitchTransform
        ? { ...templateSlide.pitchTransform }
        : undefined,
      isSidesSwapped: templateSlide.isSidesSwapped,
    };
  }
```
**After**
```ts
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type {
  DomainSlide,
  DomainTacticalPhase,
  DomainTacticalProject,
} from '@/lib/types/tactical/domain-hierarchy';
import {
  DEFAULT_BOUNDARY_BOX_16_9,
  getDefaultBoundaryBoxForAspect,
} from '@/lib/types/tactical/slide';

export function createFreshSlide(
  templateSlide?: DomainSlide,
  index = 0,
  label = `Scene ${index + 1}`,
  newSlideId?: string,
): DomainSlide {
  if (templateSlide) {
    return {
      id: newSlideId ?? crypto.randomUUID(),
      index,
      label,
      players: templateSlide.players.map((p) =>
        p.area === 'pitch'
          ? {
              ...structuredClone(p),
              connectLines: [],
              badges: [],
              visionCone: undefined,
              focus: undefined,
              trajectory: undefined,
            }
          : structuredClone(p),
      ),
      arrows: [],
      zones: [],
      texts: [],
      ball: { ...templateSlide.ball, trajectory: undefined },
      transitionDurationMs: templateSlide.transitionDurationMs,
      pauseMs: templateSlide.pauseMs,
      easing: templateSlide.easing,
      cameraTransitionMode: templateSlide.cameraTransitionMode,
      cameraDurationMs: templateSlide.cameraDurationMs,
      pitchTransform: templateSlide.pitchTransform
        ? { ...templateSlide.pitchTransform }
        : undefined,
      isSidesSwapped: templateSlide.isSidesSwapped,
    };
  }
```

② `createFreshSlide` フォールバック返却部へ `newSlideId` を反映し、`duplicateSlideInPhase` / `handleAddSlide` / `handleAddPhase` / `handleResetSlideKeepSquad` を追加:
**Before (L46-L75)**
```ts
  return {
    id: crypto.randomUUID(),
    index,
    label,
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
  };
}

import { transformSlideForAspect } from './aspect-transform';
import {
  applyImageBackgroundToPhase,
  restoreDefaultPitchInPhase,
} from './background-image';
import {
  computeAutoFitBoundaryBox,
  computeXMediaPresetBoundaryBox,
} from './boundary-box';
import type { TacticalCommand } from './commands';
```
**After**
```ts
  return {
    id: newSlideId ?? crypto.randomUUID(),
    index,
    label,
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
  };
}

import { transformSlideForAspect } from './aspect-transform';
import {
  applyImageBackgroundToPhase,
  restoreDefaultPitchInPhase,
} from './background-image';
import {
  computeAutoFitBoundaryBox,
  computeXMediaPresetBoundaryBox,
} from './boundary-box';
import type { TacticalCommand } from './commands';
import { createDefaultDomainPlayers } from './default-players';
import { resetSlideKeepSquadPositions } from './slide-reset';

export function duplicateSlideInPhase(
  targetSlide: DomainSlide,
  index: number,
  newSlideId?: string,
): DomainSlide {
  const cloned = structuredClone(targetSlide);
  return {
    ...cloned,
    id: newSlideId ?? crypto.randomUUID(),
    index,
    label: targetSlide.label ? `${targetSlide.label} (copy)` : 'Scene (copy)',
    players: cloned.players.map((p) =>
      p.area === 'pitch' ? { ...p, trajectory: undefined } : p,
    ),
    ball: { ...cloned.ball, trajectory: undefined },
  };
}

export function handleAddSlide(
  project: DomainTacticalProject,
  command: Extract<TacticalCommand, { type: 'ADD_SLIDE' }>,
  now: string,
): DomainTacticalProject {
  const targetPhase = project.phases.find((p) => p.id === command.phaseId);
  if (!targetPhase) return project;

  const targetIndex = command.afterSlideId
    ? targetPhase.slides.findIndex((s) => s.id === command.afterSlideId)
    : -1;
  const template =
    targetIndex !== -1
      ? targetPhase.slides[targetIndex]
      : targetPhase.slides[targetPhase.slides.length - 1];
  const mode = command.mode ?? 'object-free';
  const count = targetPhase.slides.length;

  let newSlide: DomainSlide;
  if (mode === 'full' && template) {
    newSlide = duplicateSlideInPhase(template, count, command.newSlideId);
  } else if (mode === 'blank') {
    newSlide = {
      ...createFreshSlide(
        undefined,
        count,
        `Scene ${count + 1}`,
        command.newSlideId,
      ),
      players: createDefaultDomainPlayers(
        project.homeColor.primary,
        project.awayColor.primary,
        targetPhase.aspectRatio,
      ),
    };
  } else {
    newSlide = createFreshSlide(
      template,
      count,
      `Scene ${count + 1}`,
      command.newSlideId,
    );
  }

  const nextSlides = [...targetPhase.slides];
  if (targetIndex !== -1) {
    nextSlides.splice(targetIndex + 1, 0, newSlide);
  } else {
    nextSlides.push(newSlide);
  }

  return {
    ...project,
    phases: project.phases.map((p) =>
      p.id === command.phaseId
        ? { ...p, slides: nextSlides.map((s, idx) => ({ ...s, index: idx })) }
        : p,
    ),
    updatedAt: now,
  };
}
```

③ `handleAddPhase` と `handleResetSlideKeepSquad` をファイル末尾（L276 の後）へ追記:
**Before (L270-L276)**
```ts
              ball: { ...s.ball, sizeScale: command.sizeScale },
            })),
          },
    ),
    updatedAt: now,
  };
}
```
**After**
```ts
              ball: { ...s.ball, sizeScale: command.sizeScale },
            })),
          },
    ),
    updatedAt: now,
  };
}

export function handleAddPhase(
  project: DomainTacticalProject,
  command: Extract<TacticalCommand, { type: 'ADD_PHASE' }>,
  now: string,
): DomainTacticalProject {
  const firstPhase = project.phases[0];
  const sourceSlide = firstPhase?.slides[0];
  const aspectRatio = firstPhase?.aspectRatio ?? '4:5';
  const boundaryBox =
    firstPhase?.boundaryBox ?? getDefaultBoundaryBoxForAspect(aspectRatio);

  let initialSlide: DomainSlide;
  if (sourceSlide && (project.matchId || project.matchFormations)) {
    const reset = resetSlideKeepSquadPositions(
      sourceSlide,
      aspectRatio,
      project.matchFormations,
    );
    initialSlide = {
      ...reset,
      id: command.newSlideId ?? crypto.randomUUID(),
      index: 0,
      label: 'Scene 1',
    };
  } else {
    initialSlide = createFreshSlide(
      sourceSlide,
      0,
      'Scene 1',
      command.newSlideId,
    );
  }

  const newPhase: DomainTacticalPhase = {
    id: command.newPhaseId ?? crypto.randomUUID(),
    name: command.name,
    aspectRatio,
    boundaryBox,
    backgroundType: 'pitch',
    slides: [initialSlide],
  };

  return {
    ...project,
    phases: [...project.phases, newPhase],
    updatedAt: now,
  };
}

export function handleResetSlideKeepSquad(
  project: DomainTacticalProject,
  command: Extract<TacticalCommand, { type: 'RESET_SLIDE_KEEP_SQUAD' }>,
  now: string,
): DomainTacticalProject {
  const targetPhase = project.phases.find((p) => p.id === command.phaseId);
  if (!targetPhase) return project;
  const hasSlide = targetPhase.slides.some((s) => s.id === command.slideId);
  if (!hasSlide) return project;

  return {
    ...project,
    phases: project.phases.map((p) =>
      p.id !== command.phaseId
        ? p
        : {
            ...p,
            boundaryBox: getDefaultBoundaryBoxForAspect(p.aspectRatio),
            slides: p.slides.map((s) =>
              s.id !== command.slideId
                ? s
                : resetSlideKeepSquadPositions(
                    s,
                    p.aspectRatio,
                    project.matchFormations,
                  ),
            ),
          },
    ),
    updatedAt: now,
  };
}
```

#### Task 1.3: `[MODIFY]` `src/lib/tactical/domain/project-reducer.ts`
**Before (L1-L19)**
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
```
**After**
```ts
import type {
  DomainSlide,
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
  duplicateSlideInPhase,
  handleAddPhase,
  handleAddSlide,
  handleApplyBallScaleToPhaseSlides,
  handleApplyImageBackground,
  handleApplyPlayerStyleToPhaseSlides,
  handleApplyXMediaPreset,
  handleAutoFitBoundaryBox,
  handleCenterPitchAndBoundary,
  handleChangePhaseAspectRatio,
  handleResetSlideKeepSquad,
  handleRestoreDefaultPitch,
} from './project-phase-handlers';
```

**Before (`ADD_SLIDE` / `DUPLICATE_SLIDE`)**
```ts
    case 'ADD_SLIDE': {
      const targetPhase = project.phases.find((p) => p.id === command.phaseId);
      if (!targetPhase) return project;

      const targetIndex = command.afterSlideId
        ? targetPhase.slides.findIndex((s) => s.id === command.afterSlideId)
        : -1;
      const template =
        targetIndex !== -1
          ? targetPhase.slides[targetIndex]
          : targetPhase.slides[targetPhase.slides.length - 1];

      const newSlide = createFreshSlide(template, targetPhase.slides.length);
      const nextSlides = [...targetPhase.slides];
      if (targetIndex !== -1) {
        nextSlides.splice(targetIndex + 1, 0, newSlide);
      } else {
        nextSlides.push(newSlide);
      }

      return {
        ...project,
        phases: project.phases.map((p) =>
          p.id === command.phaseId
            ? {
                ...p,
                slides: nextSlides.map((s, idx) => ({ ...s, index: idx })),
              }
            : p,
        ),
        updatedAt: now,
      };
    }

    case 'DUPLICATE_SLIDE': {
      const targetPhase = project.phases.find((p) => p.id === command.phaseId);
      const targetIndex =
        targetPhase?.slides.findIndex((s) => s.id === command.slideId) ?? -1;
      if (!targetPhase || targetIndex === -1) return project;

      const targetSlide = targetPhase.slides[targetIndex];
      const duplicated: DomainSlide = {
        ...targetSlide,
        id: crypto.randomUUID(),
        label: targetSlide.label ? `${targetSlide.label} (copy)` : undefined,
        players: targetSlide.players.map((p) => ({ ...p })),
        arrows: targetSlide.arrows.map((a) => ({ ...a })),
        zones: targetSlide.zones.map((z) => ({ ...z })),
        texts: targetSlide.texts.map((t) => ({ ...t })),
        ball: { ...targetSlide.ball },
      };

      const nextSlides = [...targetPhase.slides];
      nextSlides.splice(targetIndex + 1, 0, duplicated);

      return {
        ...project,
        phases: project.phases.map((p) =>
          p.id === command.phaseId
            ? {
                ...p,
                slides: nextSlides.map((s, idx) => ({ ...s, index: idx })),
              }
            : p,
        ),
        updatedAt: now,
      };
    }
```
**After**
```ts
    case 'ADD_SLIDE':
      return handleAddSlide(project, command, now);

    case 'DUPLICATE_SLIDE': {
      const targetPhase = project.phases.find((p) => p.id === command.phaseId);
      const targetIndex =
        targetPhase?.slides.findIndex((s) => s.id === command.slideId) ?? -1;
      if (!targetPhase || targetIndex === -1) return project;

      const duplicated = duplicateSlideInPhase(
        targetPhase.slides[targetIndex],
        targetIndex + 1,
        command.newSlideId,
      );
      const nextSlides = [...targetPhase.slides];
      nextSlides.splice(targetIndex + 1, 0, duplicated);

      return {
        ...project,
        phases: project.phases.map((p) =>
          p.id === command.phaseId
            ? {
                ...p,
                slides: nextSlides.map((s, idx) => ({ ...s, index: idx })),
              }
            : p,
        ),
        updatedAt: now,
      };
    }
```

**Before (`ADD_PHASE` と `RESTORE_DEFAULT_PITCH`)**
```ts
    case 'ADD_PHASE': {
      const firstPhase = project.phases[0];
      const sourceSlide = firstPhase?.slides[0];
      const newPhase: DomainTacticalPhase = {
        id: crypto.randomUUID(),
        name: command.name,
        aspectRatio: firstPhase?.aspectRatio ?? '4:5',
        boundaryBox: firstPhase?.boundaryBox ?? {
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          enabled: true,
          visible: false,
          fitTarget: 'pitch',
        },
        backgroundType: 'pitch',
        slides: [createFreshSlide(sourceSlide, 0, 'Scene 1')],
      };

      return {
        ...project,
        phases: [...project.phases, newPhase],
        updatedAt: now,
      };
    }
```
**After**
```ts
    case 'ADD_PHASE':
      return handleAddPhase(project, command, now);
```

**Before (`RESTORE_DEFAULT_PITCH`)**
```ts
    case 'RESTORE_DEFAULT_PITCH':
      return handleRestoreDefaultPitch(project, command, now);
```
**After**
```ts
    case 'RESTORE_DEFAULT_PITCH':
      return handleRestoreDefaultPitch(project, command, now);

    case 'RESET_SLIDE_KEEP_SQUAD':
      return handleResetSlideKeepSquad(project, command, now);
```

#### Task 1.4: `[ADD]` `src/lib/tactical/__tests__/slide-modes-and-reset.test.ts`
① フィクスチャ作成ヘルパー:
```ts
import { describe, expect, it } from 'vitest';
import { getFormationActualPos } from '@/lib/data/formations';
import { FORMATION_POSITIONS } from '@/lib/data/formations-data';
import {
  clampToScreenNorm,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type { DomainTacticalProject } from '@/lib/types/tactical/domain-hierarchy';
import {
  DEFAULT_BOUNDARY_BOX_16_9,
  DEFAULT_PITCH_APPEARANCE,
  DEFAULT_SCREEN_BACKGROUND,
  getDefaultBoundaryBoxForAspect,
} from '@/lib/types/tactical/slide';
import { createDefaultDomainPlayers } from '../domain/default-players';
import { applyTacticalCommand } from '../domain/project-reducer';

function createSampleProject(): DomainTacticalProject {
  const players = createDefaultDomainPlayers('#034694', '#ef4444', '16:9').map(
    (p, idx) => ({
      ...p,
      id: `pl-${p.team}-${idx}`,
      name: `Player ${idx}`,
      shirtNo: `${idx + 1}`,
      x: clampToScreenNorm(12),
      y: clampToScreenNorm(14),
      trajectory: { type: 'straight' as const },
    }),
  );
  return {
    id: 'proj-modes',
    version: '3.0.0',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    homeColor: { primary: '#034694' },
    awayColor: { primary: '#ef4444' },
    pitchAppearance: { ...DEFAULT_PITCH_APPEARANCE },
    screenBackground: { ...DEFAULT_SCREEN_BACKGROUND },
    matchId: 'm-1',
    matchFormations: { home: '4-3-3', away: '4-2-3-1' },
    tags: [],
    phases: [
      {
        id: 'ph-1',
        name: 'Phase 1',
        aspectRatio: '16:9',
        boundaryBox: { ...DEFAULT_BOUNDARY_BOX_16_9, x: 5, width: 80 },
        backgroundType: 'pitch',
        slides: [
          {
            id: 'sl-1',
            index: 0,
            label: 'Intro',
            players,
            arrows: [
              {
                id: 'locked-arr',
                annotationType: 'arrow',
                arrowType: 'pass',
                curveType: 'straight',
                points: [toScreenNormPoint(20, 20), toScreenNormPoint(40, 40)],
                color: '#ffffff',
                strokeWidth: 3,
                dashArray: [],
                startMarker: 'none',
                endMarker: 'arrow',
                locked: true,
              },
            ],
            zones: [],
            texts: [],
            ball: {
              x: clampToScreenNorm(75),
              y: clampToScreenNorm(25),
              visible: true,
              trajectory: { type: 'straight' },
            },
            transitionDurationMs: 1000,
            pauseMs: 500,
            easing: 'ease-in-out',
          },
        ],
      },
    ],
  };
}
```

② テストケース（同ファイル末尾へ追記）:
```ts
describe('slide modes, phase match-init, and keep-squad reset', () => {
  it('ADD_SLIDE supports full (deep clone + trajectory clear), object-free, and blank (22 defaults)', () => {
    const p0 = createSampleProject();
    const pFull = applyTacticalCommand(p0, {
      type: 'ADD_SLIDE',
      phaseId: 'ph-1',
      afterSlideId: 'sl-1',
      mode: 'full',
      newSlideId: 'sl-full',
    });
    const fullSlide = pFull.phases[0].slides[1];
    expect(fullSlide.id).toBe('sl-full');
    expect(fullSlide.label).toBe('Intro (copy)');
    expect(fullSlide.arrows).toHaveLength(1);
    expect(fullSlide.arrows).not.toBe(p0.phases[0].slides[0].arrows);
    expect(fullSlide.ball.trajectory).toBeUndefined();

    const pBlank = applyTacticalCommand(pFull, {
      type: 'ADD_SLIDE',
      phaseId: 'ph-1',
      mode: 'blank',
      newSlideId: 'sl-blank',
    });
    const blankSlide = pBlank.phases[0].slides[2];
    expect(blankSlide.id).toBe('sl-blank');
    expect(blankSlide.players).toHaveLength(22);
    expect(blankSlide.arrows).toHaveLength(0);
  });

  it('ADD_PHASE applies kickoff formation coords and RESET_SLIDE_KEEP_SQUAD resets positions & boundaryBox', () => {
    const p0 = createSampleProject();
    const pWithPhase = applyTacticalCommand(p0, {
      type: 'ADD_PHASE',
      name: 'Phase 2',
      newPhaseId: 'ph-2',
      newSlideId: 'sl-2-1',
    });
    const newSlide = pWithPhase.phases[1].slides[0];
    const homePlayers = newSlide.players.filter((pl) => pl.team === 'home');
    const home433 = FORMATION_POSITIONS['4-3-3'];
    homePlayers.forEach((pl, idx) => {
      const def = home433[idx % home433.length];
      const raw = getFormationActualPos(def, 'home', 'full');
      expect(pl.x).toBeCloseTo(def.position === 'GK' ? 7 : raw.x, 1);
    });

    const pReset = applyTacticalCommand(p0, {
      type: 'RESET_SLIDE_KEEP_SQUAD',
      phaseId: 'ph-1',
      slideId: 'sl-1',
    });
    expect(pReset.phases[0].boundaryBox).toEqual(
      getDefaultBoundaryBoxForAspect('16:9'),
    );
    expect(pReset.phases[0].slides[0].arrows).toHaveLength(0);
    expect(pReset.phases[0].slides[0].ball.x).toBe(50);
    expect(pReset.phases[0].slides[0].ball.trajectory).toBeUndefined();
  });
});
```
