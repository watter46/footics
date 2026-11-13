# TASK-181jb: Storage・DB・補間・写真パックのDomain型直接受入拡張

- **Status**: DONE
- **Priority**: HIGH
- **Created**: 2026-11-13
- **Parent**: plan-tactical-legacy-removal.md (181j)
- **Commit**: `feat(tactical): accept DomainTacticalProject and readonly DomainSlide arrays in storage, DB, interpolation, and photo packing`

---

## 🎯 目的・背景

`DocumentStore`（`DomainTacticalProject`）および `DomainSlide[]` を直接永続化・再生時間計算・写真プリロード／パックへ渡せるようにするため、既存永続化層・補間ヘルパー・写真パック関数の引数型を Legacy / Domain 両受入へ拡張する（二重実装を作らず既存関数の型を拡張）。

## 🚨 残存禁止条件 (Negative Contracts)

- `saveActiveProjectToDbDomain` などの重複関数を新設してはならない（既存関数の引数型拡張で対応すること）。
- `...existing code...` 等の省略記法を残してはならない。

---

## 🏗️ Phase 構成

- **Phase 1**: Storage・DB・カメラセグメント・補間時間計算の `Domain` 型受入（4プロダクションファイル）
- **Phase 2**: 再生スナップ計算・共有写真パックの `readonly DomainSlide[]` 受入（2プロダクションファイル）

---

### Phase 1: Storage・DB・補間時間計算の Domain 型受入

- **担当ファイル**:
  - `src/lib/tactical/tactical-storage.ts`
  - `src/lib/db/tactical-projects-db.ts`
  - `src/lib/tactical/interpolation-camera.ts`
  - `src/lib/tactical/unified-interpolation.ts`

#### Task 1.1 `[MODIFY]` `src/lib/tactical/tactical-storage.ts`

**Before:**
```ts
import { db } from '@/lib/db/schema';
import {
  ensureTacticalProject,
  type TacticalProject,
} from '@/lib/types/tactical-unified';
```
**After:**
```ts
import { db } from '@/lib/db/schema';
import type { DomainTacticalProject } from '@/lib/types/tactical/domain-hierarchy';
import {
  ensureTacticalProject,
  type TacticalProject,
} from '@/lib/types/tactical-unified';
```

**Before:**
```ts
export async function saveActiveProjectToDb(
  project: TacticalProject,
  matchId?: string | null,
): Promise<void> {
  try {
    const effectiveMatchId = matchId ?? project.matchId;
    await db.keyval.put({
      key: getTacticalProjectStorageKey(effectiveMatchId),
      value: project,
      updatedAt: Date.now(),
    });
    // Multi-project synchronization
    if (db.tactical_projects) {
      await db.tactical_projects.put(project);
    }
```
**After:**
```ts
export async function saveActiveProjectToDb(
  project: TacticalProject | DomainTacticalProject,
  matchId?: string | null,
): Promise<void> {
  try {
    const effectiveMatchId = matchId ?? project.matchId;
    await db.keyval.put({
      key: getTacticalProjectStorageKey(effectiveMatchId),
      value: project,
      updatedAt: Date.now(),
    });
    // Multi-project synchronization
    if (db.tactical_projects) {
      await db.tactical_projects.put(project as TacticalProject);
    }
```

#### Task 1.2 `[MODIFY]` `src/lib/db/tactical-projects-db.ts`

**Before:**
```ts
import {
  createDefaultProject,
  ensureTacticalProject,
  type TacticalProject,
} from '@/lib/types/tactical-unified';
```
**After:**
```ts
import type { DomainTacticalProject } from '@/lib/types/tactical/domain-hierarchy';
import {
  createDefaultProject,
  ensureTacticalProject,
  type TacticalProject,
} from '@/lib/types/tactical-unified';
```

**Before:**
```ts
export async function saveTacticalProject(
  project: TacticalProject,
  syncActive = true,
): Promise<void> {
```
**After:**
```ts
export async function saveTacticalProject(
  project: TacticalProject | DomainTacticalProject,
  syncActive = true,
): Promise<void> {
```

**Before:**
```ts
export function exportTacticalProjectToJson(project: TacticalProject): void {
```
**After:**
```ts
export function exportTacticalProjectToJson(
  project: TacticalProject | DomainTacticalProject,
): void {
```

#### Task 1.3 `[MODIFY]` `src/lib/tactical/interpolation-camera.ts`

**Before:**
```ts
import type {
  CameraTransitionMode,
  DirectorCameraTrack,
  PitchTransform,
  Slide,
} from '@/lib/types/tactical-unified';
```
**After:**
```ts
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import type {
  CameraTransitionMode,
  DirectorCameraTrack,
  PitchTransform,
  Slide,
} from '@/lib/types/tactical-unified';

export type SlideTimingLike = Pick<
  Slide,
  | 'transitionDurationMs'
  | 'pauseMs'
  | 'cameraTransitionMode'
  | 'cameraDurationMs'
>;
```

**Before:**
```ts
/** スライド配列から各セグメントの実効時間およびカメラスパンを解決 */
export function resolveEffectiveSlideSegments(
  slides: Slide[],
): EffectiveSlideSegment[] {
```
**After:**
```ts
/** スライド配列から各セグメントの実効時間およびカメラスパンを解決 */
export function resolveEffectiveSlideSegments(
  slides: readonly (Slide | DomainSlide | SlideTimingLike)[],
): EffectiveSlideSegment[] {
```

#### Task 1.4 `[MODIFY]` `src/lib/tactical/unified-interpolation.ts`

**Before:**
```ts
// Unified Tactical Canvas — Animation Interpolation & Zone Vertex Morphing Engine
import type { DirectorCameraTrack, Slide } from '@/lib/types/tactical-unified';
import { applyEasing } from './easing';
```
**After:**
```ts
// Unified Tactical Canvas — Animation Interpolation & Zone Vertex Morphing Engine
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import type { DirectorCameraTrack, Slide } from '@/lib/types/tactical-unified';
import { applyEasing } from './easing';
```

**Before:**
```ts
import {
  hasActiveDirectorCameraTrack,
  type InterpolatedPitchTransformState,
  interpolatePitchTransform,
  type ResolveSyntheticDirectorCameraOptions,
  resolveCameraAtTime,
  resolveEffectiveSlideSegments,
  resolveSyntheticDirectorCamera,
} from './interpolation-camera';
```
**After:**
```ts
import {
  hasActiveDirectorCameraTrack,
  type InterpolatedPitchTransformState,
  interpolatePitchTransform,
  type ResolveSyntheticDirectorCameraOptions,
  resolveCameraAtTime,
  resolveEffectiveSlideSegments,
  resolveSyntheticDirectorCamera,
  type SlideTimingLike,
} from './interpolation-camera';
```

**Before:**
```ts
/** 全スライドの総再生時間 (ms) を計算 */
export function calculateUnifiedTotalDuration(slides: Slide[]): number {
  if (slides.length <= 1) return 0;
  return resolveEffectiveSlideSegments(slides).reduce(
    (sum, seg) => sum + seg.effectiveDurationMs,
    0,
  );
}

/** 単一スライドを含む総再生時間 (ms) を解決 */
export function resolvePlaybackDurationMs(slides: Slide[]): number {
  if (!slides || slides.length === 0) return 0;
  if (slides.length === 1) {
    const s = slides[0] as Slide & {
      duration?: number;
      pauseDuration?: number;
    };
```
**After:**
```ts
/** 全スライドの総再生時間 (ms) を計算 */
export function calculateUnifiedTotalDuration(
  slides: readonly (Slide | DomainSlide | SlideTimingLike)[],
): number {
  if (slides.length <= 1) return 0;
  return resolveEffectiveSlideSegments(slides).reduce(
    (sum, seg) => sum + seg.effectiveDurationMs,
    0,
  );
}

/** 単一スライドを含む総再生時間 (ms) を解決 */
export function resolvePlaybackDurationMs(
  slides: readonly (Slide | DomainSlide | SlideTimingLike)[],
): number {
  if (!slides || slides.length === 0) return 0;
  if (slides.length === 1) {
    const s = slides[0] as (Slide | DomainSlide | SlideTimingLike) & {
      duration?: number;
      pauseDuration?: number;
    };
```

- **検証 (Phase 1)**:
  ```bash
  bun run ai:check src/lib/tactical/tactical-storage.ts src/lib/db/tactical-projects-db.ts src/lib/tactical/interpolation-camera.ts src/lib/tactical/unified-interpolation.ts src/lib/tactical/__tests__/tactical-storage.test.ts
  ```

---

### Phase 2: 再生スナップ計算・共有写真パックの readonly DomainSlide 受入

- **担当ファイル**:
  - `src/features/tactical-unified/hooks/tactical-playback-controls.ts`
  - `src/lib/tactical/export/share-photos.ts`

#### Task 2.1 `[MODIFY]` `src/features/tactical-unified/hooks/tactical-playback-controls.ts`

**Before:**
```ts
import {
  getInterpolatedUnifiedSlideFrame,
  resolveEffectiveSlideSegments,
} from '@/lib/tactical/unified-interpolation';
import type { Slide } from '@/lib/types/tactical-unified';
```
**After:**
```ts
import {
  getInterpolatedUnifiedSlideFrame,
  resolveEffectiveSlideSegments,
  type SlideTimingLike,
} from '@/lib/tactical/unified-interpolation';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import type { Slide } from '@/lib/types/tactical-unified';
```

**Before:**
```ts
export function getSlideSnapTime(slides: Slide[], targetIndex: number): number {
```
**After:**
```ts
export function getSlideSnapTime(
  slides: readonly (Slide | DomainSlide | SlideTimingLike)[],
  targetIndex: number,
): number {
```

#### Task 2.2 `[MODIFY]` `src/lib/tactical/export/share-photos.ts`

**Before:**
```ts
function extractTargetPlayers(
  scenes: TacticalSceneLike[],
): Map<string, PlayerPhotoTarget> {
  const target = new Map<string, PlayerPhotoTarget>();
  for (const scene of scenes) {
    if (!scene.players) continue;
    const list: TacticalPlayerLike[] = Array.isArray(scene.players)
      ? scene.players
      : Object.values(scene.players);
```
**After:**
```ts
function extractTargetPlayers(
  scenes: readonly TacticalSceneLike[],
): Map<string, PlayerPhotoTarget> {
  const target = new Map<string, PlayerPhotoTarget>();
  for (const scene of scenes) {
    if (!scene.players) continue;
    const list: readonly TacticalPlayerLike[] = Array.isArray(scene.players)
      ? scene.players
      : Object.values(scene.players);
```

**Before:**
```ts
export async function packPlayerPhotos(
  scenes: TacticalSceneLike[],
): Promise<Record<string, string>> {
```
**After:**
```ts
export async function packPlayerPhotos(
  scenes: readonly TacticalSceneLike[],
): Promise<Record<string, string>> {
```

**Before:**
```ts
export async function preloadPlayerPhotos(
  scenes: TacticalSceneLike[],
  existingPhotos?: Record<string, string>,
): Promise<Record<string, ImageBitmap>> {
```
**After:**
```ts
export async function preloadPlayerPhotos(
  scenes: readonly TacticalSceneLike[],
  existingPhotos?: Record<string, string>,
): Promise<Record<string, ImageBitmap>> {
```

- **検証 (Phase 2)**:
  ```bash
  bun run ai:check src/features/tactical-unified/hooks/tactical-playback-controls.ts src/lib/tactical/export/share-photos.ts
  ```
