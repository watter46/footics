# TASK-212d: marker-geometry の compiler 移設と視覚アセットの shared/ 切り出し

- **Status**: `TODO`
- **Commit**: `refactor(tactical): organize marker-geometry into compiler and visual assets into shared`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2, Phase 4, Phase 5 (parallel)
  - Wave 2: Phase 3 (sequential after Phase 2)
- **Negative Contracts**:
  - `absent: src/lib/tactical/marker-geometry.ts`
  - `absent: src/lib/tactical/marker-geometry.test.ts`
  - `absent: src/lib/tactical/pitch-svg.ts`
  - `absent: src/lib/tactical/pitch-texture-geometry.ts`
  - `absent: src/lib/tactical/marker-assets.ts`
  - `absent: src/lib/tactical/soccer-ball-svg.ts`
  - `rg: @/lib/tactical/(marker-geometry|pitch-svg|pitch-texture-geometry|marker-assets|soccer-ball-svg)`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. `marker-geometry.ts` は `DomainPlayer` と Stage サイズからマーカー境界点・半径を算出する Context 5 責務のため `compiler/marker-geometry.ts` へ配置する。
  2. ピッチSVG・テクスチャカバー・マーカーSVGパス・ボールSVGの視覚アセット4本は描画・Core 層が参照する共通ディレクトリ `src/lib/tactical/shared/` へ切り出す。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `TASK-212c` 完了後（`shared/pitch-geometry.ts` 存在下）を前提とするか、Phase 2 で `shared/pitch-svg.ts` が `pitch-geometry` の正しいパス（`./pitch-geometry`）を参照するよう統一する。
  2. 旧 `src/lib/tactical/marker-geometry.test.ts` も Context 5 配下 `src/lib/tactical/compiler/__tests__/marker-geometry.test.ts` へ正規配置する。
- **Consumers (同期更新対象)**:
  - `marker-geometry`: `PlayerConnectingGuide.tsx`
  - `pitch-svg` / `pitch-texture-geometry`: `BackgroundImageLayer.tsx`, `pitch-marble-background.tsx`, `pitch-renderer.ts`
  - `marker-assets`: `player-marker-ring.tsx`, `player-ring-renderer.ts`, `player-focus-spotlight.tsx`
  - `soccer-ball-svg`: `use-ball-image.ts`

## 2. Implementation Phases

### Phase 1: `compiler/marker-geometry.ts` 移設とテスト移動
- **Target Files**:
  - `[ADD]` `src/lib/tactical/compiler/marker-geometry.ts` (~90 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/PlayerConnectingGuide.tsx` (import path)
  - `[ADD]` `src/lib/tactical/compiler/__tests__/marker-geometry.test.ts` (~60 lines)
  - `[DELETE]` `src/lib/tactical/marker-geometry.ts`
  - `[DELETE]` `src/lib/tactical/marker-geometry.test.ts`
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/marker-geometry.ts`
  - `src/lib/tactical/marker-geometry.test.ts`
- **Contract**:
  ```ts
  export function getPlayerMarkerRadius(player: DomainPlayer, stageSize: { width: number; height: number }): number;
  export function getMarkerBoundaryPoint(center: { x: number; y: number }, target: { x: number; y: number }, player: DomainPlayer, stageSize: { width: number; height: number }, onlyRing?: boolean): { x: number; y: number };
  ```
  - 振る舞い仕様・境界条件:
    1. `marker-geometry.ts` とそのテストを `compiler/` 配下へ移設し、`PlayerConnectingGuide.tsx` の import を更新する。
- **Concrete Test Cases**:
  - `src/lib/tactical/compiler/__tests__/marker-geometry.test.ts`（純粋関数 I/O）:
    - `case 1`: 既存 `marker-geometry.test.ts` の全テストケースがそのまま通過すること。
- **Verification**:
  - `bun run ai:check src/lib/tactical/compiler/marker-geometry.ts src/features/tactical-unified/core/components/PlayerConnectingGuide.tsx src/lib/tactical/compiler/__tests__/marker-geometry.test.ts`

### Phase 2: `shared/pitch-svg.ts` と `shared/pitch-texture-geometry.ts` 新設（Part 1）
- **Target Files**:
  - `[ADD]` `src/lib/tactical/shared/pitch-svg.ts` (~230 lines)
  - `[ADD]` `src/lib/tactical/shared/pitch-texture-geometry.ts` (~45 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/BackgroundImageLayer.tsx` (import path)
  - `[MODIFY]` `src/lib/tactical/export/renderers/pitch-renderer.ts` (import path)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/pitch-svg.ts`
  - `src/lib/tactical/pitch-texture-geometry.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `shared/pitch-svg.ts` は `./pitch-geometry` を参照するよう記述し（`TASK-212c` 未完了の場合は一時ビルド整合のため実行順を `212c` ➔ `212d` とする）、全公開 API を維持する。
    2. `BackgroundImageLayer.tsx` と `pitch-renderer.ts` の import を `@/lib/tactical/shared/*` へ更新する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/background-image-layer.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: SVG 読み込み・背景描画の既存テストが通過すること。
- **Verification**:
  - `bun run ai:check src/lib/tactical/shared/pitch-svg.ts src/lib/tactical/shared/pitch-texture-geometry.ts src/features/tactical-unified/core/components/BackgroundImageLayer.tsx src/lib/tactical/export/renderers/pitch-renderer.ts`

### Phase 3: `pitch-marble-background.tsx`・関連テスト更新と旧ピッチアセット削除 (Part 2)
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/pitch-marble-background.tsx` (import path)
  - `[MODIFY]` `src/lib/tactical/__tests__/pitch-svg.test.ts` (import path)
  - `[MODIFY]` `src/lib/tactical/__tests__/pitch-texture-geometry.test.ts` (import path)
  - `[DELETE]` `src/lib/tactical/pitch-svg.ts`
  - `[DELETE]` `src/lib/tactical/pitch-texture-geometry.ts`
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/shared/pitch-svg.ts`
  - `src/lib/tactical/shared/pitch-texture-geometry.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `pitch-marble-background.tsx` および 2件のテストを `@/lib/tactical/shared/pitch-svg`・`@/lib/tactical/shared/pitch-texture-geometry` へ更新し、旧2ファイルを物理削除する。
- **Concrete Test Cases**:
  - `src/lib/tactical/__tests__/pitch-svg.test.ts` / `pitch-texture-geometry.test.ts`（純粋関数 I/O）:
    - `case 1`: 既存アセットテストがすべて通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/pitch-marble-background.tsx src/lib/tactical/__tests__/pitch-svg.test.ts src/lib/tactical/__tests__/pitch-texture-geometry.test.ts`

### Phase 4: `shared/marker-assets.ts` 切り出しと Consumers 更新
- **Target Files**:
  - `[ADD]` `src/lib/tactical/shared/marker-assets.ts` (~50 lines)
  - `[MODIFY]` `src/features/tactical-unified/objects/player/components/player-marker-ring.tsx` (import path)
  - `[MODIFY]` `src/lib/tactical/export/renderers/player-ring-renderer.ts` (import path)
  - `[MODIFY]` `src/features/tactical-unified/objects/player/components/player-focus-spotlight.tsx` (import path)
  - `[DELETE]` `src/lib/tactical/marker-assets.ts`
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/marker-assets.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `MARKER_PATHS`, `SPOTLIGHT_BEAM_PATH`, 各 ViewBox 定数を `shared/marker-assets.ts` へ移植し、Consumer 3ファイルの import を更新して旧ファイルを削除する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/objects/player/components/__tests__/player-marker-ring-fade.test.tsx`（実コンポーネント検証）:
    - `case 1`: リングマーカーの描画テストが通過すること。
- **Verification**:
  - `bun run ai:check src/lib/tactical/shared/marker-assets.ts src/features/tactical-unified/objects/player/components/player-marker-ring.tsx src/lib/tactical/export/renderers/player-ring-renderer.ts src/features/tactical-unified/objects/player/components/player-focus-spotlight.tsx`

### Phase 5: `shared/soccer-ball-svg.ts` 切り出しと Consumer 更新
- **Target Files**:
  - `[ADD]` `src/lib/tactical/shared/soccer-ball-svg.ts` (~120 lines)
  - `[MODIFY]` `src/features/tactical-unified/objects/ball/hooks/use-ball-image.ts` (import path)
  - `[DELETE]` `src/lib/tactical/soccer-ball-svg.ts`
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/soccer-ball-svg.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `SOCCER_BALL_SVG` と画像ローダ関数群を `shared/soccer-ball-svg.ts` へ移植し、`use-ball-image.ts` の import を更新して旧ファイルを削除する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/objects/ball/__tests__/ball-object.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: ボール描画・画像取得の既存テストが通過すること。
- **Verification**:
  - `bun run ai:check src/lib/tactical/shared/soccer-ball-svg.ts src/features/tactical-unified/objects/ball/hooks/use-ball-image.ts src/features/tactical-unified/objects/ball/__tests__/ball-object.test.tsx`
