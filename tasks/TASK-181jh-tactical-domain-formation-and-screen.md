# TASK-181jh: Domain フォーメーション・スカッド配置ヘルパー & 画面背景・境界線パネル移行

- **Status**: `DONE`
- **Priority**: HIGH
- **Created**: 2026-11-13
- **Parent**: plan-tactical-legacy-removal.md (181j)
- **Commit**: `feat(tactical): add pure domain formation/squad placement helpers and migrate pitch/screen panels`

---

## 🎯 目的・背景

Right Panel のフォーメーション・スカッド移行および `squad-actions.ts` 移行に必要な純粋 Domain 配置関数群 (`formation-placement.ts`, `squad-placement.ts`) を新設し、画面背景・境界線・ピッチ外観設定 (`pitch-appearance-panel.tsx`, `screen-background-panel.tsx`, `screen-boundary-section.tsx`) から旧 `tactical-unified-store` / `tactical-unified` 型依存を除去する。

## 🚨 残存禁止条件 (Negative Contracts)

- `pitch-appearance-panel.tsx`・`screen-background-panel.tsx`・`screen-boundary-section.tsx` に `tactical-unified-store` / `tactical-unified-selectors` / `@/lib/types/tactical-unified` の参照を残してはならない。
- 新設 `formation-placement.ts`・`squad-placement.ts` にストア依存や `tactical-unified` 参照を含めてはならない。

---

## 🏗️ Phase 構成

- **Phase 1**: `formation-placement.ts`・`squad-placement.ts`・`formation-placement.test.ts`（2プロダクション＋1テスト）
- **Phase 2**: `pitch-appearance-panel.tsx`・`screen-background-panel.tsx`・`screen-boundary-section.tsx`（3プロダクション＋0テスト）

---

### Phase 1: Pure Domain フォーメーション & スカッド配置ヘルパー

- **担当ファイル**:
  - `src/lib/tactical/domain/formation-placement.ts`
  - `src/lib/tactical/domain/squad-placement.ts`
  - `src/lib/tactical/domain/__tests__/formation-placement.test.ts`

#### Task 1.1 `[ADD]` `src/lib/tactical/domain/formation-placement.ts`

```ts
import {
  type FormationMode,
  type FormationType,
  getFormationActualPos,
  getFormationActualPosVertical,
} from '@/lib/data/formations';
import { FORMATION_POSITIONS } from '@/lib/data/formations-data';
import { matchPlayersToFormationPositions } from '@/lib/tactical/player-formatting';
import { clampToScreenNorm, type ScreenNormCoord } from '@/lib/types/tactical/branded';
import type { BenchPlayer, DomainPlayer, PitchPlayer } from '@/lib/types/tactical/domain-entities';
import { isVerticalAspectRatio } from '@/lib/types/tactical/primitives';
import type { DomainTacticalProject, DomainTacticalSlide } from '@/lib/types/tactical/project';
import type { AspectRatio } from '@/lib/types/tactical/slide';

export const DEFAULT_DOMAIN_MARKER_STYLE = {
  markerType: 'circle' as const,
  insideContent: 'number' as const,
  bottomLabel: 'name' as const,
  strokeColor: '#ffffff',
  strokeWidth: 2,
  sizeScale: 1.0,
  numberSizeScale: 1.0,
  labelSizeScale: 1.0,
};

export function createDefaultDomainPlayer(
  team: 'home' | 'away' | 'neutral',
  x: number,
  y: number,
  color: string,
  area: 'pitch' | 'bench' = 'pitch',
  id?: string,
): DomainPlayer {
  const base = {
    id: id ?? crypto.randomUUID(),
    team,
    x: clampToScreenNorm(x),
    y: clampToScreenNorm(y),
    style: { ...DEFAULT_DOMAIN_MARKER_STYLE, color },
  };
  return area === 'bench' ? { ...base, area: 'bench' } : { ...base, area: 'pitch', connectLines: [], badges: [] };
}

export function resolveFormationCoords(
  pos: { top: number; left: number },
  side: 'home' | 'away',
  mode: FormationMode,
  aspectRatio: AspectRatio,
): { x: ScreenNormCoord; y: ScreenNormCoord } {
  const raw = isVerticalAspectRatio(aspectRatio)
    ? getFormationActualPosVertical(pos, side, mode)
    : getFormationActualPos(pos, side, mode, aspectRatio);
  return { x: clampToScreenNorm(raw.x), y: clampToScreenNorm(raw.y) };
}

export function computeDomainSlideAfterFormation(
  slide: DomainTacticalSlide,
  project: DomainTacticalProject,
  aspectRatio: AspectRatio,
  formationName: FormationType,
  mode: FormationMode,
  team: 'home' | 'away',
): readonly DomainPlayer[] {
  const template = FORMATION_POSITIONS[formationName];
  if (!template) return slide.players;
  const isSwapped = slide.isSidesSwapped ?? false;
  const effectiveSide: 'home' | 'away' = isSwapped ? (team === 'home' ? 'away' : 'home') : team;
  const primaryColor = team === 'home' ? project.homeColor.primary : project.awayColor.primary;
  const otherPlayers = slide.players.filter((p) => p.team !== team);
  const teamBench = slide.players.filter((p): p is BenchPlayer => p.team === team && p.area === 'bench');
  const teamPitch = slide.players.filter((p): p is PitchPlayer => p.team === team && p.area === 'pitch');

  if (teamPitch.length === 0) {
    const created: DomainPlayer[] = template.map((tPos) => {
      const coords = resolveFormationCoords(tPos, effectiveSide, mode, aspectRatio);
      return {
        ...(createDefaultDomainPlayer(team, coords.x, coords.y, primaryColor, 'pitch') as PitchPlayer),
        shirtNo: String(tPos.id),
        position: tPos.position,
      };
    });
    return [...otherPlayers, ...created, ...teamBench];
  }

  const matched = matchPlayersToFormationPositions([...teamPitch], template);
  const updatedPitch = matched.map(({ player, templatePos }) => {
    const coords = resolveFormationCoords(templatePos, effectiveSide, mode, aspectRatio);
    return { ...player, position: templatePos.position, x: coords.x, y: coords.y };
  });
  return [...otherPlayers, ...updatedPitch, ...teamBench];
}
```

#### Task 1.2 `[ADD]` `src/lib/tactical/domain/squad-placement.ts`

```ts
import type { FormationMode, FormationType } from '@/lib/data/formations';
import { FORMATION_POSITIONS } from '@/lib/data/formations-data';
import { matchPlayersToFormationPositions } from '@/lib/tactical/player-formatting';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type { BenchPlayer, DomainPlayer, PitchPlayer } from '@/lib/types/tactical/domain-entities';
import type { DomainTacticalProject, DomainTacticalSlide, SeasonFormationPreset } from '@/lib/types/tactical/project';
import type { AspectRatio } from '@/lib/types/tactical/slide';
import { createDefaultDomainPlayer, DEFAULT_DOMAIN_MARKER_STYLE, resolveFormationCoords } from './formation-placement';

export interface DomainSquadPlayerItem {
  readonly playerId: number;
  readonly name: string;
  readonly shirtNo?: number | string;
  readonly position?: string;
  readonly isFirstEleven?: boolean;
  readonly photoUrl?: string;
  readonly slotVertical?: number;
  readonly slotHorizontal?: number;
}

function getBenchPosRank(position?: string): number {
  if (!position) return 5;
  const p = position.toUpperCase().trim();
  if ('FW,CF,ST,LW,RW,SS,AML,AMR'.includes(p)) return 1;
  if ('MF,DM,CM,AM,LM,RM,DMC,MC,AMC'.includes(p)) return 2;
  if ('DF,CB,LB,RB,LWB,RWB,DC,DL,DR'.includes(p)) return 3;
  return p === 'GK' ? 4 : 5;
}

function getBenchShirtNoVal(shirtNo?: string): number {
  if (!shirtNo) return Number.POSITIVE_INFINITY;
  const n = Number.parseInt(shirtNo, 10);
  return Number.isNaN(n) ? Number.POSITIVE_INFINITY : n;
}

export function computeDomainBenchGridPositions(players: readonly BenchPlayer[]): BenchPlayer[] {
  const sorted = [...players].sort((a, b) => {
    const rankDiff = getBenchPosRank(a.position) - getBenchPosRank(b.position);
    return rankDiff !== 0 ? rankDiff : getBenchShirtNoVal(a.shirtNo) - getBenchShirtNoVal(b.shirtNo);
  });
  const xCols = [20, 50, 80];
  return sorted.map((p, idx) => ({
    ...p,
    x: clampToScreenNorm(xCols[idx % 3] ?? 20),
    y: clampToScreenNorm(14 + Math.floor(idx / 3) * 22),
  }));
}

export function computeDomainPresetPlayers(
  slide: DomainTacticalSlide,
  project: DomainTacticalProject,
  team: 'home' | 'away',
  preset: SeasonFormationPreset,
): readonly DomainPlayer[] {
  const primaryColor = team === 'home' ? project.homeColor.primary : project.awayColor.primary;
  const otherPlayers = slide.players.filter((p) => p.team !== team);
  const existingTeam = slide.players.filter((p) => p.team === team);
  const existingBench = existingTeam.filter((p): p is BenchPlayer => p.area === 'bench');
  const nextPitch: PitchPlayer[] = preset.players.slice(0, 11).map((p, idx) => {
    const base = existingTeam[idx];
    const x = clampToScreenNorm(team === 'home' ? p.x : 100 - p.x);
    const y = clampToScreenNorm(p.y);
    return {
      ...(base && base.area === 'pitch'
        ? base
        : (createDefaultDomainPlayer(team, x, y, primaryColor, 'pitch') as PitchPlayer)),
      name: p.name,
      shirtNo: p.shirtNo,
      position: p.position,
      x,
      y,
      style: {
        ...(base?.style ?? { ...DEFAULT_DOMAIN_MARKER_STYLE, color: primaryColor }),
        color: primaryColor,
        photoUrl: p.photoUrl,
        insideContent: p.photoUrl ? 'photo' : 'number',
      },
    };
  });
  return [...otherPlayers, ...nextPitch, ...existingBench];
}

export function buildDomainSquadPlayers(
  players: readonly DomainSquadPlayerItem[],
  options: { team: 'home' | 'away'; formation?: FormationType; mode?: FormationMode; primaryColor: string; aspectRatio?: AspectRatio },
): readonly DomainPlayer[] {
  const { team, formation = '4-2-3-1', mode = 'full', primaryColor, aspectRatio = '16:9' } = options;
  const template = FORMATION_POSITIONS[formation] ?? FORMATION_POSITIONS['4-2-3-1'];
  const explicit = players.filter((p) => p.isFirstEleven !== false);
  const starters = explicit.length <= 11 ? explicit : explicit.slice(0, 11);
  const starterIds = new Set(starters.map((s) => s.playerId));
  const substitutes = players.filter((p) => !starterIds.has(p.playerId));
  const pitchPlayers: PitchPlayer[] = matchPlayersToFormationPositions([...starters], template).map(({ player, templatePos }) => {
    const coords = resolveFormationCoords(templatePos, team, mode, aspectRatio);
    return {
      ...(createDefaultDomainPlayer(team, coords.x, coords.y, primaryColor, 'pitch') as PitchPlayer),
      playerId: String(player.playerId),
      name: player.name,
      shirtNo: player.shirtNo !== undefined ? String(player.shirtNo) : undefined,
      position: player.position ?? templatePos.position,
      style: { ...DEFAULT_DOMAIN_MARKER_STYLE, color: primaryColor, photoUrl: player.photoUrl, insideContent: player.photoUrl ? 'photo' : 'number' },
    };
  });
  const rawBench: BenchPlayer[] = substitutes.map((sub) => ({
    ...(createDefaultDomainPlayer(team, 20, 14, primaryColor, 'bench') as BenchPlayer),
    playerId: String(sub.playerId),
    name: sub.name,
    shirtNo: sub.shirtNo !== undefined ? String(sub.shirtNo) : undefined,
    position: sub.position,
    style: { ...DEFAULT_DOMAIN_MARKER_STYLE, color: primaryColor, photoUrl: sub.photoUrl, insideContent: sub.photoUrl ? 'photo' : 'number' },
  }));
  return [...pitchPlayers, ...computeDomainBenchGridPositions(rawBench)];
}
```

#### Task 1.3 `[ADD]` `src/lib/tactical/domain/__tests__/formation-placement.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { createDefaultTacticalProject } from '@/features/tactical-unified/stores/tactical-store-provider';
import { computeDomainSlideAfterFormation, createDefaultDomainPlayer } from '../formation-placement';
import { buildDomainSquadPlayers, computeDomainBenchGridPositions, computeDomainPresetPlayers } from '../squad-placement';

describe('formation & squad placement pure domain helpers', () => {
  it('computes formation coordinates for home pitch players without mutating away team', () => {
    const project = createDefaultTacticalProject();
    const slide = project.phases[0]!.slides[0]!;
    const updated = computeDomainSlideAfterFormation(slide, project, '16:9', '4-3-3', 'full', 'home');
    expect(updated.filter((p) => p.team === 'home' && p.area === 'pitch')).toHaveLength(11);
    expect(updated.filter((p) => p.team === 'away')).toEqual(slide.players.filter((p) => p.team === 'away'));
  });

  it('sorts bench players by position rank (FW -> MF -> DF -> GK) and assigns 3-column grid', () => {
    const gk = { ...createDefaultDomainPlayer('home', 0, 0, '#0000ff', 'bench', 'gk'), position: 'GK', shirtNo: '12' };
    const st = { ...createDefaultDomainPlayer('home', 0, 0, '#0000ff', 'bench', 'st'), position: 'ST', shirtNo: '9' };
    if (gk.area !== 'bench' || st.area !== 'bench') throw new Error('expected bench');
    const sorted = computeDomainBenchGridPositions([gk, st]);
    expect(sorted[0]?.id).toBe('st');
    expect(Number(sorted[0]?.x)).toBe(20);
    expect(sorted[1]?.id).toBe('gk');
    expect(Number(sorted[1]?.x)).toBe(50);
  });

  it('builds Domain starters and bench grid from club squad items', () => {
    const items = Array.from({ length: 13 }, (_, idx) => ({
      playerId: idx + 1,
      name: `Player ${idx + 1}`,
      shirtNo: idx + 1,
      position: idx === 0 ? 'GK' : 'CM',
      isFirstEleven: idx < 11,
    }));
    const result = buildDomainSquadPlayers(items, {
      team: 'home',
      formation: '4-2-3-1',
      primaryColor: '#034694',
      aspectRatio: '16:9',
    });
    expect(result.filter((p) => p.area === 'pitch')).toHaveLength(11);
    expect(result.filter((p) => p.area === 'bench')).toHaveLength(2);
  });

  it('applies season formation preset players onto active team', () => {
    const project = createDefaultTacticalProject();
    const slide = project.phases[0]!.slides[0]!;
    const updated = computeDomainPresetPlayers(slide, project, 'home', {
      id: 'preset-1',
      name: 'Sample',
      players: [{ name: 'Palmer', shirtNo: '20', position: 'AM', x: 60, y: 45 }],
    });
    const homePitch = updated.filter((p) => p.team === 'home' && p.area === 'pitch');
    expect(homePitch).toHaveLength(1);
    expect(homePitch[0]?.name).toBe('Palmer');
  });
});
```

---

### Phase 2: PitchAppearancePanel & ScreenBackgroundPanel & ScreenBoundarySection

- **担当ファイル**:
  - `src/features/tactical-unified/panels/right-panel/pitch-appearance-panel.tsx`
  - `src/features/tactical-unified/panels/right-panel/screen-background-panel.tsx`
  - `src/features/tactical-unified/panels/right-panel/screen-boundary-section.tsx`

#### Task 2.1 `[MODIFY]` `src/features/tactical-unified/panels/right-panel/pitch-appearance-panel.tsx`

**Before:**
```tsx
import {
  DEFAULT_PITCH_APPEARANCE,
  type PitchAppearanceConfig,
} from '@/lib/types/tactical-unified';
```
**After:**
```tsx
import {
  DEFAULT_PITCH_APPEARANCE,
  type PitchAppearanceConfig,
} from '@/lib/types/tactical/slide';
```

#### Task 2.2 `[MODIFY]` `src/features/tactical-unified/panels/right-panel/screen-background-panel.tsx`

**Before:**
```tsx
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { DEFAULT_SCREEN_BACKGROUND } from '@/lib/types/tactical-unified';
import { ScreenBoundarySection } from './screen-boundary-section';

export function ScreenBackgroundPanel() {
  const screenBackground = useTacticalUnifiedStoreContext(
    (s) => s.project.screenBackground ?? DEFAULT_SCREEN_BACKGROUND,
  );
  const updateScreenBackground = useTacticalUnifiedStoreContext(
    (s) => s.updateScreenBackground,
  );
```
**After:**
```tsx
import { useDocumentStore } from '@/features/tactical-unified/stores/tactical-store-provider';
import {
  DEFAULT_SCREEN_BACKGROUND,
  type ScreenBackgroundConfig,
} from '@/lib/types/tactical/slide';
import { ScreenBoundarySection } from './screen-boundary-section';

export function ScreenBackgroundPanel() {
  const screenBackground = useDocumentStore(
    (s) => s.project.screenBackground ?? DEFAULT_SCREEN_BACKGROUND,
  );
  const dispatch = useDocumentStore((s) => s.dispatch);
  const updateScreenBackground = (patch: Partial<ScreenBackgroundConfig>) => {
    dispatch({
      type: 'UPDATE_PROJECT_META',
      patch: { screenBackground: { ...screenBackground, ...patch } },
    });
  };
```

#### Task 2.3 `[MODIFY]` `src/features/tactical-unified/panels/right-panel/screen-boundary-section.tsx`

**Before:**
```tsx
import { selectActiveSlide } from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import {
  type BoundaryBox,
  createXBoundaryBox,
  DEFAULT_BOUNDARY_BOX_FULL,
} from '@/lib/types/tactical-unified';
```
**After:**
```tsx
import { selectDomainActivePhase } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import {
  type BoundaryBox,
  createXBoundaryBox,
  DEFAULT_BOUNDARY_BOX_FULL,
} from '@/lib/types/tactical/slide';
```

**Before:**
```tsx
  const activeSlide = useTacticalUnifiedStoreContext(selectActiveSlide);
  const updateActiveSlideBoundaryBox = useTacticalUnifiedStoreContext(
    (s) => s.updateActiveSlideBoundaryBox,
  );

  const boundaryBox = activeSlide?.boundaryBox;
  const isBoundaryVisible = boundaryBox?.visible ?? false;

  const handleToggleBoundary = () => {
    updateActiveSlideBoundaryBox({
      x: boundaryBox?.x ?? 0,
      y: boundaryBox?.y ?? 0,
      width: boundaryBox?.width ?? 100,
      height: boundaryBox?.height ?? 100,
      fitTarget: boundaryBox?.fitTarget ?? 'canvas',
      enabled: true,
      visible: !isBoundaryVisible,
    });
  };
```
**After:**
```tsx
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activePhase = useDocumentStore((s) =>
    selectDomainActivePhase(s.project, activePhaseId),
  );
  const dispatch = useDocumentStore((s) => s.dispatch);

  const boundaryBox = activePhase?.boundaryBox;
  const isBoundaryVisible = boundaryBox?.visible ?? false;

  const updatePhaseBoundaryBox = (nextBox: BoundaryBox) => {
    if (!activePhaseId) return;
    dispatch({
      type: 'UPDATE_PHASE',
      phaseId: activePhaseId,
      patch: { boundaryBox: nextBox },
    });
  };

  const handleToggleBoundary = () => {
    updatePhaseBoundaryBox({
      x: boundaryBox?.x ?? 0,
      y: boundaryBox?.y ?? 0,
      width: boundaryBox?.width ?? 100,
      height: boundaryBox?.height ?? 100,
      fitTarget: boundaryBox?.fitTarget ?? 'canvas',
      enabled: true,
      visible: !isBoundaryVisible,
    });
  };
```

**Before:**
```tsx
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const box = getPresetBox(presetId);
    updateActiveSlideBoundaryBox(box);
  };
```
**After:**
```tsx
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const box = getPresetBox(presetId);
    updatePhaseBoundaryBox(box);
  };
```
