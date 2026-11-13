# TASK-181hb: フェーズ一括スタイル・チームカラー・比率変更・背景・ピッチ視点命令の追加（旧ストア完全廃止シリーズ）

## 1. Metadata & Goal
- **Status**: `TODO`
- **Commit**: `feat(tactical): add phase bulk style, aspect, background and pitch view commands`
- **Series**: 旧ストア完全廃止シリーズ。181ha（比率変換・背景画像・境界線純粋関数）➔ 181hb（本タスク）➔ 181i ➔ 181j〜。181ha の完了を前提とする。
- **Goal**: 旧 `slide-player-crud-slice.ts`（`applyPlayerStyleToPhaseSlides` / `applyBallScaleToPhaseSlides`）、`project-slice-config-actions.ts`（`setTeamColor` / `setAspectRatio`）、`project-slice-actions.ts`（`setImageBackground` / `restoreDefaultPitch`）、`pitch-slice.ts`（`centerPitchAndBoundary` / `autoFitBoundaryBox` / `applyXMediaPreset`）を `TacticalCommand` と `applyTacticalCommand` へ統合する。旧スライスの削除は 181l。
- **Negative Contracts (完了時に0件であるべき条件)**:
  - Deleted files: なし（追加・拡張のみ。Consumer 移行と旧削除は 181j〜181l）
- **旧操作 ➔ 新命令 対応表（Worker は参照のみ）**:
  - `setAspectRatio(ratio)` ➔ `CHANGE_PHASE_ASPECT_RATIO`
  - `setImageBackground(url)` ➔ `APPLY_IMAGE_BACKGROUND` / `restoreDefaultPitch()` ➔ `RESTORE_DEFAULT_PITCH`
  - `autoFitBoundaryBox(slideId, pitchRect)` ➔ `AUTO_FIT_BOUNDARY_BOX`
  - `applyXMediaPreset(presetKey)` ➔ `APPLY_X_MEDIA_PRESET`
  - `centerPitchAndBoundary(slideId)` ➔ `CENTER_PITCH_AND_BOUNDARY`
  - `applyPlayerStyleToPhaseSlides` ➔ `APPLY_PLAYER_STYLE_TO_PHASE_SLIDES`
  - `applyBallScaleToPhaseSlides` ➔ `APPLY_BALL_SCALE_TO_PHASE_SLIDES`
  - `setTeamColor` ➔ `SET_TEAM_COLOR`

## 2. Architectural Invariants & Consumers
- **Invariants (壊してはいけない前提条件)**:
  1. `CHANGE_PHASE_ASPECT_RATIO` は対象フェーズの `aspectRatio` が既に同一なら `project` を無変更（同一参照）で返し、異なる場合は対象フェーズ内の全スライドを `transformSlideForAspect` で幾何変換する（他フェーズと `boundaryBox` は無変更）。
  2. `APPLY_PLAYER_STYLE_TO_PHASE_SLIDES` と `SET_TEAM_COLOR` は、スタイルやチーム色がドキュメント全体の視覚表現設定であるため、ロック中（`locked: true`）の選手を含め対象チームの全選手へ一括反映する（旧ストアと同一仕様）。
  3. `CENTER_PITCH_AND_BOUNDARY` は対象スライドの `pitchTransform` を `{ panX: 0, panY: 0, zoom: 1, tilt: 0, yaw: 90, isLocked: currentLocked ?? true }` にリセットし、対象フェーズの `boundaryBox` を `{ ...DEFAULT_BOUNDARY_BOX_16_9 }` に戻す。
  4. `APPLY_IMAGE_BACKGROUND` は `newSlideId`（省略時は `crypto.randomUUID()`）を受け取り、単体テストで決定論的に検証可能とする。
- **Consumers (同期更新対象の全ファイルリスト)**:
  - `TacticalCommand` を `switch` で網羅する箇所は `src/lib/tactical/domain/project-reducer.ts` のみ。

## 3. Implementation Phases (タスクファイル > フェーズ > タスク)

### Phase 1: TacticalCommand の拡張と Project Reducer の実装
- **Worker Model**: `flash`
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/domain/commands.ts`
  - `[MODIFY]` `src/lib/tactical/domain/project-reducer.ts`
  - `[ADD]` `src/lib/tactical/__tests__/phase-project-commands.test.ts`

#### Task 1.1: `[MODIFY]` `src/lib/tactical/domain/commands.ts`
**Before (import 部 L15-L22)**
```ts
} from '@/lib/types/tactical/domain-hierarchy';
import type {
  ConnectLine,
  PlayerBadge,
  PlayerFocus,
  VisionCone,
} from '@/lib/types/tactical/player';
```
**After**
```ts
} from '@/lib/types/tactical/domain-hierarchy';
import type {
  ConnectLine,
  MarkerStyle,
  PlayerBadge,
  PlayerFocus,
  VisionCone,
} from '@/lib/types/tactical/player';
import type {
  AspectRatio,
  XMediaPresetKey,
} from '@/lib/types/tactical/primitives';
```

**Before (TacticalCommand 末尾 L199-L214)**
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
      readonly type: 'CHANGE_PHASE_ASPECT_RATIO';
      readonly phaseId: string;
      readonly aspectRatio: AspectRatio;
    }
  | {
      readonly type: 'APPLY_IMAGE_BACKGROUND';
      readonly phaseId: string;
      readonly slideId: string;
      readonly url: string;
      readonly newSlideId?: string;
    }
  | {
      readonly type: 'RESTORE_DEFAULT_PITCH';
      readonly phaseId: string;
    }
  | {
      readonly type: 'AUTO_FIT_BOUNDARY_BOX';
      readonly phaseId: string;
      readonly slideId?: string;
      readonly pitchRect?: { readonly width: number; readonly height: number };
    }
  | {
      readonly type: 'APPLY_X_MEDIA_PRESET';
      readonly phaseId: string;
      readonly presetKey: XMediaPresetKey | 'pitch_fit';
    }
  | {
      readonly type: 'CENTER_PITCH_AND_BOUNDARY';
      readonly phaseId: string;
      readonly slideId: string;
    }
  | {
      readonly type: 'APPLY_PLAYER_STYLE_TO_PHASE_SLIDES';
      readonly phaseId: string;
      readonly stylePatch: Partial<MarkerStyle>;
      readonly targetTeam: 'home' | 'away' | 'both';
    }
  | {
      readonly type: 'APPLY_BALL_SCALE_TO_PHASE_SLIDES';
      readonly phaseId: string;
      readonly sizeScale: number;
    }
  | {
      readonly type: 'SET_TEAM_COLOR';
      readonly team: 'home' | 'away';
      readonly primary: string;
      readonly secondary?: string;
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

#### Task 1.2: `[MODIFY]` `src/lib/tactical/domain/project-reducer.ts`
**Before (import 部 L1-L9)**
```ts
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type {
  DomainSlide,
  DomainTacticalPhase,
  DomainTacticalProject,
} from '@/lib/types/tactical/domain-hierarchy';
import type { TacticalCommand } from './commands';
import { applySlideCommand } from './slide-reducer';
```
**After**
```ts
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type {
  DomainSlide,
  DomainTacticalPhase,
  DomainTacticalProject,
} from '@/lib/types/tactical/domain-hierarchy';
import { DEFAULT_BOUNDARY_BOX_16_9 } from '@/lib/types/tactical/slide';
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
import { applySlideCommand } from './slide-reducer';
```

**Before (switch 末尾 L275-L292)**
```ts
    case 'UPDATE_ALL_SLIDE_TRANSITIONS':
      return {
        ...project,
        phases: project.phases.map((p) => ({
          ...p,
          slides: p.slides.map((s) => ({ ...s, ...command.patch })),
        })),
        updatedAt: now,
      };

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
以下 1.2a〜1.2c の 3 ブロックを上から順に連結して上記 Before と置換する。

**1.2a 比率・背景・境界線フィット case**
```ts
    case 'UPDATE_ALL_SLIDE_TRANSITIONS':
      return {
        ...project,
        phases: project.phases.map((p) => ({
          ...p,
          slides: p.slides.map((s) => ({ ...s, ...command.patch })),
        })),
        updatedAt: now,
      };

    case 'CHANGE_PHASE_ASPECT_RATIO': {
      const targetPhase = project.phases.find((p) => p.id === command.phaseId);
      if (!targetPhase || targetPhase.aspectRatio === command.aspectRatio) {
        return project;
      }
      const oldRatio = targetPhase.aspectRatio;
      return {
        ...project,
        phases: project.phases.map((p) =>
          p.id !== command.phaseId
            ? p
            : {
                ...p,
                aspectRatio: command.aspectRatio,
                slides: p.slides.map((s) =>
                  transformSlideForAspect(s, oldRatio, command.aspectRatio),
                ),
              },
        ),
        updatedAt: now,
      };
    }

    case 'APPLY_IMAGE_BACKGROUND': {
      const targetPhase = project.phases.find((p) => p.id === command.phaseId);
      if (!targetPhase) return project;
      const { phase: updatedPhase } = applyImageBackgroundToPhase(
        targetPhase,
        command.url,
        command.slideId,
        () => command.newSlideId ?? crypto.randomUUID(),
      );
      return {
        ...project,
        phases: project.phases.map((p) =>
          p.id === command.phaseId ? updatedPhase : p,
        ),
        updatedAt: now,
      };
    }

    case 'RESTORE_DEFAULT_PITCH': {
      const targetPhase = project.phases.find((p) => p.id === command.phaseId);
      if (!targetPhase) return project;
      return {
        ...project,
        phases: project.phases.map((p) =>
          p.id === command.phaseId ? restoreDefaultPitchInPhase(p) : p,
        ),
        updatedAt: now,
      };
    }

    case 'AUTO_FIT_BOUNDARY_BOX': {
      const targetPhase = project.phases.find((p) => p.id === command.phaseId);
      if (!targetPhase) return project;
      const slide = command.slideId
        ? targetPhase.slides.find((s) => s.id === command.slideId)
        : targetPhase.slides[0];
      const box = computeAutoFitBoundaryBox({
        aspectRatio: targetPhase.aspectRatio,
        backgroundType: targetPhase.backgroundType,
        pitchTransform: slide?.pitchTransform,
        pitchRect: command.pitchRect,
      });
      return {
        ...project,
        phases: project.phases.map((p) =>
          p.id === command.phaseId ? { ...p, boundaryBox: box } : p,
        ),
        updatedAt: now,
      };
    }
```

**1.2b Xプリセット・中央リセット・選手スタイル一括 case**
```ts
    case 'APPLY_X_MEDIA_PRESET': {
      const targetPhase = project.phases.find((p) => p.id === command.phaseId);
      if (!targetPhase) return project;
      const box = computeXMediaPresetBoundaryBox(
        command.presetKey,
        targetPhase.aspectRatio,
      );
      return {
        ...project,
        phases: project.phases.map((p) =>
          p.id === command.phaseId ? { ...p, boundaryBox: box } : p,
        ),
        updatedAt: now,
      };
    }

    case 'CENTER_PITCH_AND_BOUNDARY': {
      const targetPhase = project.phases.find((p) => p.id === command.phaseId);
      if (!targetPhase) return project;
      return {
        ...project,
        phases: project.phases.map((p) =>
          p.id !== command.phaseId
            ? p
            : {
                ...p,
                boundaryBox: { ...DEFAULT_BOUNDARY_BOX_16_9 },
                slides: p.slides.map((s) =>
                  s.id !== command.slideId
                    ? s
                    : {
                        ...s,
                        pitchTransform: {
                          panX: 0,
                          panY: 0,
                          zoom: 1,
                          tilt: 0,
                          yaw: 90,
                          isLocked: s.pitchTransform?.isLocked ?? true,
                        },
                      },
                ),
              },
        ),
        updatedAt: now,
      };
    }

    case 'APPLY_PLAYER_STYLE_TO_PHASE_SLIDES': {
      if (!project.phases.some((p) => p.id === command.phaseId)) return project;
      return {
        ...project,
        phases: project.phases.map((p) =>
          p.id !== command.phaseId
            ? p
            : {
                ...p,
                slides: p.slides.map((s) => ({
                  ...s,
                  players: s.players.map((pl) =>
                    command.targetTeam === 'both' ||
                    pl.team === command.targetTeam
                      ? { ...pl, style: { ...pl.style, ...command.stylePatch } }
                      : pl,
                  ),
                })),
              },
        ),
        updatedAt: now,
      };
    }
```

**1.2c ボール拡大率一括・チームカラー・メタ更新 case**
```ts
    case 'APPLY_BALL_SCALE_TO_PHASE_SLIDES': {
      if (!project.phases.some((p) => p.id === command.phaseId)) return project;
      return {
        ...project,
        phases: project.phases.map((p) =>
          p.id !== command.phaseId
            ? p
            : {
                ...p,
                slides: p.slides.map((s) => ({
                  ...s,
                  ball: { ...s.ball, sizeScale: command.sizeScale },
                })),
              },
        ),
        updatedAt: now,
      };
    }

    case 'SET_TEAM_COLOR': {
      const colorEntry = {
        primary: command.primary,
        ...(command.secondary ? { secondary: command.secondary } : {}),
      };
      return {
        ...project,
        ...(command.team === 'home'
          ? { homeColor: colorEntry }
          : { awayColor: colorEntry }),
        phases: project.phases.map((p) => ({
          ...p,
          slides: p.slides.map((s) => ({
            ...s,
            players: s.players.map((pl) =>
              pl.team === command.team
                ? { ...pl, style: { ...pl.style, color: command.primary } }
                : pl,
            ),
          })),
        })),
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

#### Task 1.3: `[ADD]` `src/lib/tactical/__tests__/phase-project-commands.test.ts`
モック不使用。純粋関数 I/O テスト。以下 1.3a〜1.3c の 3 ブロックを上から順に 1 ファイルへ連結して作成する。

**1.3a ヘルパー関数**
```ts
import { describe, expect, it } from 'vitest';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type { PitchPlayer } from '@/lib/types/tactical/domain-entities';
import type {
  DomainSlide,
  DomainTacticalPhase,
  DomainTacticalProject,
} from '@/lib/types/tactical/domain-hierarchy';
import { applyTacticalCommand } from '../domain/project-reducer';

const style = {
  markerType: 'circle' as const,
  insideContent: 'number' as const,
  bottomLabel: 'name' as const,
  color: '#034694',
  strokeColor: '#ffffff',
  strokeWidth: 2,
  sizeScale: 1,
  numberSizeScale: 1,
  labelSizeScale: 1,
};

const player = (
  id: string,
  team: 'home' | 'away',
  x: number,
  y: number,
): PitchPlayer => ({
  id,
  area: 'pitch',
  team,
  x: clampToScreenNorm(x),
  y: clampToScreenNorm(y),
  style,
  connectLines: [],
  badges: [],
});

const slide = (id: string, overrides?: Partial<DomainSlide>): DomainSlide => ({
  id,
  index: 0,
  players: [player('h1', 'home', 80, 30), player('a1', 'away', 20, 70)],
  arrows: [],
  zones: [],
  texts: [],
  ball: { x: clampToScreenNorm(50), y: clampToScreenNorm(50), visible: true },
  transitionDurationMs: 1000,
  pauseMs: 500,
  easing: 'ease-in-out',
  ...overrides,
});

const phase = (
  id: string,
  slides: DomainSlide[],
  overrides?: Partial<DomainTacticalPhase>,
): DomainTacticalPhase => ({
  id,
  name: id,
  aspectRatio: '16:9',
  boundaryBox: {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    enabled: true,
    visible: false,
    fitTarget: 'pitch',
  },
  backgroundType: 'pitch',
  slides,
  ...overrides,
});

const makeProject = (phases: DomainTacticalPhase[]): DomainTacticalProject => ({
  id: 'proj-1',
  version: '3.0.0',
  title: 'Test',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  homeColor: { primary: '#034694' },
  awayColor: { primary: '#ef4444' },
  pitchAppearance: {
    pitchBackgroundType: 'solid',
    overlayColor: '#0B303E',
    overlayOpacity: 1,
    lineColor: '#ffffff',
    lineWidth: 2.5,
    lineOpacity: 1,
  },
  screenBackground: { type: 'cinematic' },
  tags: [],
  phases,
});
```

**1.3b 比率・境界線・ピッチ視点テスト**
```ts
describe('CHANGE_PHASE_ASPECT_RATIO & boundary/pitch commands', () => {
  it('指定フェーズのみ比率変更・座標変換し、他フェーズは変更しない', () => {
    const proj = makeProject([
      phase('ph1', [slide('s1')]),
      phase('ph2', [slide('s2')]),
    ]);
    const next = applyTacticalCommand(proj, {
      type: 'CHANGE_PHASE_ASPECT_RATIO',
      phaseId: 'ph1',
      aspectRatio: '9:16',
    });
    expect(next.phases[0].aspectRatio).toBe('9:16');
    expect(next.phases[1].aspectRatio).toBe('16:9');
    expect(next.phases[0].slides[0].players[0].x).not.toBe(80);
    expect(next.phases[1].slides[0].players[0].x).toBe(80);
  });

  it('CENTER_PITCH_AND_BOUNDARY で pitchTransform と boundaryBox を初期化する', () => {
    const proj = makeProject([
      phase(
        'ph1',
        [
          slide('s1', {
            pitchTransform: {
              panX: 100,
              panY: 50,
              zoom: 2,
              tilt: 30,
              yaw: 45,
              isLocked: false,
            },
          }),
        ],
        {
          boundaryBox: {
            x: 20,
            y: 20,
            width: 60,
            height: 60,
            enabled: true,
          },
        },
      ),
    ]);
    const next = applyTacticalCommand(proj, {
      type: 'CENTER_PITCH_AND_BOUNDARY',
      phaseId: 'ph1',
      slideId: 's1',
    });
    expect(next.phases[0].boundaryBox.width).toBe(100);
    expect(next.phases[0].slides[0].pitchTransform).toEqual({
      panX: 0,
      panY: 0,
      zoom: 1,
      tilt: 0,
      yaw: 90,
      isLocked: false,
    });
  });
});
```

**1.3c 背景画像・一括スタイル・チームカラー命令テスト**
```ts
describe('APPLY_IMAGE_BACKGROUND, RESTORE_DEFAULT_PITCH & bulk style commands', () => {
  it('編集済みスライドへの APPLY_IMAGE_BACKGROUND で新規スライドを追加し RESTORE_DEFAULT_PITCH で戻す', () => {
    const proj = makeProject([phase('ph1', [slide('s1')])]);
    const withImg = applyTacticalCommand(proj, {
      type: 'APPLY_IMAGE_BACKGROUND',
      phaseId: 'ph1',
      slideId: 's1',
      url: 'data:image/png;base64,test',
      newSlideId: 's-new',
    });
    expect(withImg.phases[0].backgroundType).toBe('image');
    expect(withImg.phases[0].slides).toHaveLength(2);
    expect(withImg.phases[0].slides[1].id).toBe('s-new');
    expect(
      withImg.phases[0].slides[1].players.every((p) => p.area === 'bench'),
    ).toBe(true);

    const restored = applyTacticalCommand(withImg, {
      type: 'RESTORE_DEFAULT_PITCH',
      phaseId: 'ph1',
    });
    expect(restored.phases[0].backgroundType).toBe('pitch');
    expect(restored.phases[0].backgroundImageUrl).toBeUndefined();
  });

  it('APPLY_PLAYER_STYLE_TO_PHASE_SLIDES / APPLY_BALL_SCALE_TO_PHASE_SLIDES / SET_TEAM_COLOR が一括反映される', () => {
    const proj = makeProject([
      phase('ph1', [slide('s1'), slide('s2', { index: 1 })]),
      phase('ph2', [slide('s3')]),
    ]);

    const styled = applyTacticalCommand(proj, {
      type: 'APPLY_PLAYER_STYLE_TO_PHASE_SLIDES',
      phaseId: 'ph1',
      stylePatch: { insideContent: 'photo', sizeScale: 1.4 },
      targetTeam: 'home',
    });
    for (const s of styled.phases[0].slides) {
      const h = s.players.find((p) => p.team === 'home');
      const a = s.players.find((p) => p.team === 'away');
      expect(h?.style.insideContent).toBe('photo');
      expect(h?.style.sizeScale).toBe(1.4);
      expect(a?.style.insideContent).toBe('number');
    }

    const ballScaled = applyTacticalCommand(styled, {
      type: 'APPLY_BALL_SCALE_TO_PHASE_SLIDES',
      phaseId: 'ph1',
      sizeScale: 1.6,
    });
    expect(
      ballScaled.phases[0].slides.every((s) => s.ball.sizeScale === 1.6),
    ).toBe(true);
    expect(ballScaled.phases[1].slides[0].ball.sizeScale).toBeUndefined();

    const recolored = applyTacticalCommand(ballScaled, {
      type: 'SET_TEAM_COLOR',
      team: 'away',
      primary: '#10b981',
    });
    expect(recolored.awayColor.primary).toBe('#10b981');
    for (const ph of recolored.phases) {
      for (const s of ph.slides) {
        const a = s.players.find((p) => p.team === 'away');
        expect(a?.style.color).toBe('#10b981');
      }
    }
  });
});
```
- **Phase 1 検証**: `bun run ai:check src/lib/tactical/domain/commands.ts src/lib/tactical/domain/project-reducer.ts src/lib/tactical/__tests__/phase-project-commands.test.ts`

## 4. 全 Phase 完了後（Planner）
- `GIT_EXTERNAL_DIFF=difft rtk git diff` で Before ➔ After 通りか確認 ➔ Status を `DONE` ➔ `bun run ai:commit -m "feat(tactical): add phase bulk style, aspect, background and pitch view commands"`
