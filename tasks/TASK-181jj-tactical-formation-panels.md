# TASK-181jj: Formation 関連サブコンポーネント & FormationPanel の Domain 移行

- **Status**: `DONE`
- **Priority**: HIGH
- **Created**: 2026-11-13
- **Parent**: plan-tactical-legacy-removal.md (181j)
- **Commit**: `feat(tactical): migrate FormationPanel and formation subcomponents to Domain stores`

---

## 🎯 目的・背景

`formation-presets-data.ts`・`formation-batch-display.tsx`・`formation-bench-item.tsx`・`formation-bench-section.tsx`・`formation-custom-manager.tsx`・`formation-panel.tsx` を底上げ（ボトムアップ）で Domain 型と `useDocumentStore` / `useSessionStore` / `formation-placement.ts` / `squad-placement.ts` へ移行し、旧 `tactical-unified-store` / `squad-to-tactical-bridge` / `@/lib/types/tactical-unified` 依存を根絶する。

## 🚨 残存禁止条件 (Negative Contracts)

- 上記 6 ファイルに `tactical-unified-store` / `tactical-unified-selectors` / `squad-to-tactical-bridge` / `@/lib/types/tactical-unified` の参照を残してはならない。

---

## 🏗️ Phase 構成

- **Phase 1**: フォーメーションリーフ群（4プロダクション＋0テスト）
- **Phase 2**: `formation-custom-manager.tsx`・`formation-panel.tsx`（2プロダクション＋0テスト）

---

### Phase 1: フォーメーションデータ & リーフサブコンポーネント

- **担当ファイル**:
  - `src/features/tactical-unified/panels/right-panel/formation-presets-data.ts`
  - `src/features/tactical-unified/panels/right-panel/formation-batch-display.tsx`
  - `src/features/tactical-unified/panels/right-panel/formation-bench-item.tsx`
  - `src/features/tactical-unified/panels/right-panel/formation-bench-section.tsx`

#### Task 1.1 `[MODIFY]` `src/features/tactical-unified/panels/right-panel/formation-presets-data.ts`

**Before:**
```tsx
import type { SeasonFormationPreset } from '@/lib/types/tactical-unified';
```
**After:**
```tsx
import type { SeasonFormationPreset } from '@/lib/types/tactical/project';
```

#### Task 1.2 `[MODIFY]` `src/features/tactical-unified/panels/right-panel/formation-batch-display.tsx`

**Before:**
```tsx
import type { Player } from '@/lib/types/tactical-unified';

interface FormationBatchDisplayProps {
  activeTeam: 'home' | 'away';
  teamPlayers: Player[];
  onApplyBatch: (updates: {
    insideContent?: 'number' | 'photo' | 'none';
    bottomLabel?: 'name' | 'number' | 'none';
    sizeScale?: number;
  }) => void;
  onUpdatePlayer: (id: string, stylePatch: Partial<Player['style']>) => void;
  onApplyBallScaleToAllSlides?: () => void;
  ballSizeScale: number;
  onBallSizeScaleChange: (scale: number) => void;
  onApplyToAllSlides?: () => void;
}
```
**After:**
```tsx
import type { DomainPlayer } from '@/lib/types/tactical/domain-entities';

interface FormationBatchDisplayProps {
  activeTeam: 'home' | 'away';
  teamPlayers: readonly DomainPlayer[];
  onApplyBatch: (updates: {
    insideContent?: 'number' | 'photo' | 'none';
    bottomLabel?: 'name' | 'number' | 'none';
    sizeScale?: number;
  }) => void;
  onUpdatePlayer: (
    id: string,
    stylePatch: Partial<DomainPlayer['style']>,
  ) => void;
  onApplyBallScaleToAllSlides?: () => void;
  ballSizeScale: number;
  onBallSizeScaleChange: (scale: number) => void;
  onApplyToAllSlides?: () => void;
}
```

#### Task 1.3 `[MODIFY]` `src/features/tactical-unified/panels/right-panel/formation-bench-item.tsx`

**Before:**
```tsx
import type { Player } from '@/lib/types/tactical-unified';

interface FormationBenchItemProps {
  player: Player;
  isSelected: boolean;
  onSelect: () => void;
  onSendToPitch: () => void;
  onSwapWith: (pitchId: string) => void;
  pitchPlayers: Player[];
  onRemove: () => void;
}
```
**After:**
```tsx
import type { DomainPlayer } from '@/lib/types/tactical/domain-entities';

interface FormationBenchItemProps {
  player: DomainPlayer;
  isSelected: boolean;
  onSelect: () => void;
  onSendToPitch: () => void;
  onSwapWith: (pitchId: string) => void;
  pitchPlayers: readonly DomainPlayer[];
  onRemove: () => void;
}
```

#### Task 1.4 `[MODIFY]` `src/features/tactical-unified/panels/right-panel/formation-bench-section.tsx`

**Before:**
```tsx
import type { Player } from '@/lib/types/tactical-unified';
import { FormationBenchAddForm } from './formation-bench-add-form';
import { FormationBenchItem } from './formation-bench-item';

interface FormationBenchSectionProps {
  activeTeam: 'home' | 'away';
  teamColor: string;
  benchPlayers: Player[];
  pitchPlayers: Player[];
  onAddToBench: (name: string, shirtNo: string, pos: string) => void;
  onSendToPitch: (benchPlayer: Player) => void;
  onSwapPlayers: (benchId: string, pitchId: string) => void;
  onRemoveBenchPlayer: (id: string) => void;
}
```
**After:**
```tsx
import type { DomainPlayer } from '@/lib/types/tactical/domain-entities';
import { FormationBenchAddForm } from './formation-bench-add-form';
import { FormationBenchItem } from './formation-bench-item';

interface FormationBenchSectionProps {
  activeTeam: 'home' | 'away';
  teamColor: string;
  benchPlayers: readonly DomainPlayer[];
  pitchPlayers: readonly DomainPlayer[];
  onAddToBench: (name: string, shirtNo: string, pos: string) => void;
  onSendToPitch: (benchPlayer: DomainPlayer) => void;
  onSwapPlayers: (benchId: string, pitchId: string) => void;
  onRemoveBenchPlayer: (id: string) => void;
}
```

**Before:**
```tsx
  const [swapTargetId, setSwapTargetId] = useState<string | null>(null);
```
- `FormationBenchSection` 内の `handleSwapWith` 引数型もそのまま動作するため、`onSendToPitch` と `benchPlayers` / `pitchPlayers` が `DomainPlayer` / `readonly DomainPlayer[]` になれば完全一致する。

---

### Phase 2: `formation-custom-manager.tsx` & `formation-panel.tsx`

- **担当ファイル**:
  - `src/features/tactical-unified/panels/right-panel/formation-custom-manager.tsx`
  - `src/features/tactical-unified/panels/right-panel/formation-panel.tsx`

#### Task 2.1 `[MODIFY]` `src/features/tactical-unified/panels/right-panel/formation-custom-manager.tsx`

`useTacticalUnifiedStoreContext` の `applyFormationPreset` と `squad-to-tactical-bridge` の `convertSquadToTacticalPlayers` を廃止し、`useDocumentStore` / `useSessionStore` + `computeDomainPresetPlayers` / `buildDomainSquadPlayers` へ置換する。

**Before:**
```tsx
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { convertSquadToTacticalPlayers } from '@/lib/tactical/squad-to-tactical-bridge';
import type { SeasonFormationPreset } from '@/lib/types/tactical-unified';
```
**After:**
```tsx
import {
  selectDomainActivePhaseAspectRatio,
  selectDomainActiveSlide,
} from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import {
  buildDomainSquadPlayers,
  computeDomainPresetPlayers,
  type DomainSquadPlayerItem,
} from '@/lib/tactical/domain/squad-placement';
import type { SeasonFormationPreset } from '@/lib/types/tactical/project';
```

**Before:**
```tsx
  const activeSlideId = useTacticalUnifiedStoreContext((s) => s.activeSlideId);
  const project = useTacticalUnifiedStoreContext((s) => s.project);
  const applyFormationPreset = useTacticalUnifiedStoreContext(
    (s) => s.applyFormationPreset,
  );
  const updateSlidePlayers = useTacticalUnifiedStoreContext(
    (s) => s.updateSlidePlayers,
  );
```
**After:**
```tsx
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const project = useDocumentStore((s) => s.project);
  const dispatch = useDocumentStore((s) => s.dispatch);
  const activeSlide = selectDomainActiveSlide(
    project,
    activePhaseId,
    activeSlideId,
  );
  const aspectRatio = selectDomainActivePhaseAspectRatio(
    project,
    activePhaseId,
  );
```

- `handleApplySeasonPreset`:
```tsx
  const handleApplySeasonPreset = (preset: SeasonFormationPreset) => {
    if (!activePhaseId || !activeSlideId || !activeSlide) return;
    const nextPlayers = computeDomainPresetPlayers(
      activeSlide,
      project,
      activeTeam,
      preset,
    );
    dispatch({
      type: 'APPLY_SLIDE_COMMAND',
      phaseId: activePhaseId,
      slideId: activeSlideId,
      command: { type: 'REPLACE_PLAYERS', players: nextPlayers },
    });
  };
```
- `handleApplyClubPreset`:
```tsx
  const handleApplyClubPreset = async (clubKey: string) => {
    // クラブプリセットから squadItems: DomainSquadPlayerItem[] を構築後:
    if (!activePhaseId || !activeSlideId || !activeSlide) return;
    const primaryColor =
      activeTeam === 'home' ? project.homeColor.primary : project.awayColor.primary;
    const teamPlayers = buildDomainSquadPlayers(squadItems, {
      team: activeTeam,
      formation: formationName,
      mode: formationMode,
      primaryColor,
      aspectRatio,
    });
    const otherPlayers = activeSlide.players.filter((p) => p.team !== activeTeam);
    dispatch({
      type: 'APPLY_SLIDE_COMMAND',
      phaseId: activePhaseId,
      slideId: activeSlideId,
      command: { type: 'REPLACE_PLAYERS', players: [...otherPlayers, ...teamPlayers] },
    });
  };
```
  (既存の `convertSquadToTacticalPlayers` 呼び出しに依存する取得処理ロジック自体はそのまま維持し、`DomainSquadPlayerItem[]` 作成部分と `REPLACE_PLAYERS` dispatch のみを置換すること)

#### Task 2.2 `[MODIFY]` `src/features/tactical-unified/panels/right-panel/formation-panel.tsx`

**Before:**
```tsx
import { isVerticalPitch } from '@/features/tactical-unified/stores/slide-flip-helpers';
import { selectActiveSlide } from '@/features/tactical-unified/stores/tactical-unified-store';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
```
**After:**
```tsx
import {
  selectDomainActivePhaseAspectRatio,
  selectDomainActiveSlide,
} from '@/features/tactical-unified/stores/domain-selectors';
import { isVerticalPitch } from '@/features/tactical-unified/stores/slide-flip-helpers';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { computeDomainSlideAfterFormation } from '@/lib/tactical/domain/formation-placement';
```

**Before:**
```tsx
  const activeSlide = useTacticalUnifiedStoreContext(selectActiveSlide);
  const activeSlideId = useTacticalUnifiedStoreContext((s) => s.activeSlideId);
  const activePhaseId = useTacticalUnifiedStoreContext((s) => s.activePhaseId);
  const project = useTacticalUnifiedStoreContext((s) => s.project);
  const applyFormation = useTacticalUnifiedStoreContext(
    (s) => s.applyFormation,
  );
  const clearPitchPlayers = useTacticalUnifiedStoreContext(
    (s) => s.clearPitchPlayers,
  );
  const updatePlayer = useTacticalUnifiedStoreContext((s) => s.updatePlayer);
  const updatePlayers = useTacticalUnifiedStoreContext((s) => s.updatePlayers);
  const setTeamColor = useTacticalUnifiedStoreContext((s) => s.setTeamColor);
  const setBallSizeScale = useTacticalUnifiedStoreContext(
    (s) => s.setBallSizeScale,
  );
  const applyPlayerStyleToPhaseSlides = useTacticalUnifiedStoreContext(
    (s) => s.applyPlayerStyleToPhaseSlides,
  );
  const applyBallScaleToPhaseSlides = useTacticalUnifiedStoreContext(
    (s) => s.applyBallScaleToPhaseSlides,
  );
  const swapTeamSides = useTacticalUnifiedStoreContext((s) => s.swapTeamSides);
```
**After:**
```tsx
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const project = useDocumentStore((s) => s.project);
  const dispatch = useDocumentStore((s) => s.dispatch);
  const activeSlide = selectDomainActiveSlide(
    project,
    activePhaseId,
    activeSlideId,
  );
  const aspectRatio = selectDomainActivePhaseAspectRatio(
    project,
    activePhaseId,
  );
```

- ハンドラ置換契約:
  - `handleSelectFormation`: `computeDomainSlideAfterFormation(activeSlide, project, aspectRatio, f, formationMode, activeTeam)` の結果を `{ type: 'APPLY_SLIDE_COMMAND', phaseId: activePhaseId, slideId: activeSlideId, command: { type: 'REPLACE_PLAYERS', players } }` で一括反映。
  - `handleApplyBatch`: 一括更新対象の全選手スタイルをマージした `nextPlayers` を作成し、1 回の `REPLACE_PLAYERS` command でアトミック反映する（1件ごとの連続 dispatch による Undo 履歴分割を防止）。
  - `onUpdatePlayer`: `{ type: 'APPLY_SLIDE_COMMAND', phaseId: activePhaseId, slideId: activeSlideId, command: { type: 'UPDATE_PLAYER', id, patch: { style: { ...target.style, ...stylePatch } } } }`。
  - `onBallSizeScaleChange`: `{ type: 'APPLY_SLIDE_COMMAND', phaseId: activePhaseId, slideId: activeSlideId, command: { type: 'UPDATE_BALL', patch: { sizeScale: scale } } }`。
  - `handleApplyStyleToAllSlides`: `{ type: 'APPLY_PLAYER_STYLE_TO_PHASE_SLIDES', phaseId: activePhaseId, stylePatch: { ... }, targetTeam: activeTeam }`。
  - `handleApplyBallScaleToAllSlides`: `{ type: 'APPLY_BALL_SCALE_TO_PHASE_SLIDES', phaseId: activePhaseId, sizeScale: currentBallScale }`。
  - `onColorChange`: `(team, color) => dispatch({ type: 'SET_TEAM_COLOR', team, primary: color })`。
  - `onClearPitch`: `dispatch({ type: 'APPLY_SLIDE_COMMAND', phaseId: activePhaseId, slideId: activeSlideId, command: { type: 'CLEAR_PITCH_PLAYERS' } })`。
  - `onSwapSides`: `dispatch({ type: 'APPLY_SLIDE_COMMAND', phaseId: activePhaseId, slideId: activeSlideId, command: { type: 'SWAP_TEAM_SIDES' } })`。
  - Note: `aspectRatio` 判定には `isVerticalPitch(aspectRatio)` を使用。
