# TASK-212a: 戦術ライブラリ死蔵モジュール削除と easing のエンジン統合

- **Status**: `TODO`
- **Commit**: `refactor(tactical): remove dead tactical root modules and consolidate easing into engine`
- **Execution Waves**:
  - Wave 1: Phase 1
  - Wave 2: Phase 2, Phase 3 (parallel after Wave 1)
- **Negative Contracts**:
  - `absent: src/lib/tactical/coordinates.ts`
  - `absent: src/lib/tactical/initial-mapping.ts`
  - `absent: src/lib/tactical/image-utils.ts`
  - `absent: src/lib/tactical/easing.ts`
  - `absent: src/lib/tactical/__tests__/coordinates.test.ts`
  - `absent: src/lib/tactical/__tests__/initial-mapping.test.ts`
  - `absent: src/lib/tactical/__tests__/image-utils.test.ts`
  - `rg: toViewPos|toActualPos|getBenchPos|generateInitialMapping|resizeAndCropImageToBlob`
  - `rg(src/lib/tactical/effect-geometry.ts): function applyEasing`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. 6コンテキスト単方向依存を維持し、タイムライン補間・カメラ補間・エフェクト計算が参照する緩急処理は Context 4 (`src/lib/tactical/engine/easing.ts`) に一元化する。
  2. `easing.ts` の `applyEasing` は引き続き `gsap.parseEase` 委譲の挙動（`t` を `[0, 1]` にクランプし、`GSAP_EASE_MAP` 変換後に補間）を保持し、1フレームもアニメーションタイミングを変えない。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. 本番画面からの参照がゼロである `coordinates.ts`、`initial-mapping.ts`、`image-utils.ts` および各専用テストは re-export シムを残さず物理削除する。
  2. `effect-geometry.ts` L27-L34 の自前キュービック `applyEasing` を削除し、`engine/easing.ts` の `applyEasing` を直接利用する。
  3. タイムライン設定メニュー2箇所に重複しているローカル `EASING_OPTIONS` を削除し、`engine/easing.ts` から `TRANSITION_EASING_OPTIONS` をエクスポートして共有する。
- **Consumers (同期更新対象)**:
  - `src/lib/tactical/engine/director-camera.ts`
  - `src/lib/tactical/engine/timeline-evaluator.ts`
  - `src/lib/tactical/effect-geometry.ts`
  - `src/features/tactical-unified/panels/timeline/batch-transition-popover.tsx`
  - `src/features/tactical-unified/panels/timeline/slide-transition-popover.tsx`

## 2. Implementation Phases

### Phase 1: `engine/easing.ts` 新設・エンジン側移行と重複 `applyEasing` 解消
- **Target Files**:
  - `[ADD]` `src/lib/tactical/engine/easing.ts` (~85 lines)
  - `[MODIFY]` `src/lib/tactical/engine/director-camera.ts` (L1-L15, import 更新)
  - `[MODIFY]` `src/lib/tactical/engine/timeline-evaluator.ts` (L1-L20, import 更新)
  - `[MODIFY]` `src/lib/tactical/effect-geometry.ts` (L1-L35, L101, 自前 applyEasing 削除・参照更新)
  - `[DELETE]` `src/lib/tactical/coordinates.ts`
  - `[DELETE]` `src/lib/tactical/__tests__/coordinates.test.ts`
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/easing.ts`
  - `src/lib/types/tactical/effect-config.ts`
- **Contract**:
  ```ts
  export type EasingType =
    | 'linear' | 'easeInOut' | 'cubic' | 'easeOut' | 'easeIn'
    | 'ease-in' | 'ease-out' | 'ease-in-out';

  export interface EasingOption {
    value: EasingType;
    label: string;
    shortLabel: string;
    description: string;
  }

  export const EASING_OPTIONS: EasingOption[];
  export const TRANSITION_EASING_OPTIONS: ReadonlyArray<{ value: 'ease-in-out' | 'linear' | 'ease-in' | 'ease-out'; label: string }>;
  export const GSAP_EASE_MAP: Record<string, string>;
  export function applyEasing(t: number, type?: EasingType | string): number;
  ```
  - 振る舞い仕様・境界条件:
    1. `engine/easing.ts` に既存 `easing.ts` の全エクスポートを移植し、加えて `TRANSITION_EASING_OPTIONS`（`'ease-in-out'`, `'linear'`, `'ease-in'`, `'ease-out'` の日本語ラベル付き定義）を定義する。
    2. `effect-geometry.ts` のローカル `applyEasing` を削除し、`computeArrowEffectState` 等では `@/lib/tactical/engine/easing` の `applyEasing` を呼び出す（`easing` 省略時は `'ease-out'` を渡して既存挙動を維持）。
    3. `coordinates.ts` とその専用テストを物理削除する。
- **Concrete Test Cases**:
  - `src/lib/tactical/__tests__/effect-geometry.test.ts`（純粋関数 I/O）:
    - `case 1`: `computeArrowEffectState` が `easing: 'linear'`, `'ease-in-out'`, `'ease-out'` で境界値 `[0, 1]` の期待進捗を返すこと。
- **Verification**:
  - `bun run ai:check src/lib/tactical/engine/easing.ts src/lib/tactical/engine/director-camera.ts src/lib/tactical/engine/timeline-evaluator.ts src/lib/tactical/effect-geometry.ts src/lib/tactical/__tests__/effect-geometry.test.ts`

### Phase 2: タイムライン Popover 重複定義統合・テスト追加・旧 `easing.ts` 削除
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/timeline/batch-transition-popover.tsx` (L1-L40, L225-L240)
  - `[MODIFY]` `src/features/tactical-unified/panels/timeline/slide-transition-popover.tsx` (L1-L42, L230-L245)
  - `[ADD]` `src/lib/tactical/engine/__tests__/easing.test.ts` (~60 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/timeline/__tests__/slide-transition-popover.test.tsx` (選択肢表示確認)
  - `[DELETE]` `src/lib/tactical/easing.ts`
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/engine/easing.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `batch-transition-popover.tsx` と `slide-transition-popover.tsx` のローカル `EASING_OPTIONS` 配列を削除し、`@/lib/tactical/engine/easing` から `TRANSITION_EASING_OPTIONS` を import して描画する。
    2. 旧 `src/lib/tactical/easing.ts` を物理削除する。
- **Concrete Test Cases**:
  - `src/lib/tactical/engine/__tests__/easing.test.ts`（純粋関数 I/O）:
    - `case 1`: `applyEasing(-0.5, 'linear') === 0`, `applyEasing(1.5, 'linear') === 1`, `applyEasing(0.5, 'linear') === 0.5`。
    - `case 2`: `applyEasing(0, 'ease-in-out') === 0`, `applyEasing(0.5, 'ease-in-out') === 0.5`, `applyEasing(1, 'ease-in-out') === 1`。
    - `case 3`: `TRANSITION_EASING_OPTIONS` が 4種の値（`ease-in-out`, `linear`, `ease-in`, `ease-out`）を含むこと。
  - `src/features/tactical-unified/panels/timeline/__tests__/slide-transition-popover.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: ポップオーバー表示時に `TRANSITION_EASING_OPTIONS` の4選択肢が表示・選択できること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/timeline/batch-transition-popover.tsx src/features/tactical-unified/panels/timeline/slide-transition-popover.tsx src/lib/tactical/engine/__tests__/easing.test.ts src/features/tactical-unified/panels/timeline/__tests__/slide-transition-popover.test.tsx`

### Phase 3: 未利用 `initial-mapping` と `image-utils` の物理削除
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/__tests__/effect-geometry.test.ts` (easing 統合後の境界テスト追加)
  - `[DELETE]` `src/lib/tactical/initial-mapping.ts`
  - `[DELETE]` `src/lib/tactical/__tests__/initial-mapping.test.ts`
  - `[DELETE]` `src/lib/tactical/image-utils.ts`
  - `[DELETE]` `src/lib/tactical/__tests__/image-utils.test.ts`
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/engine/easing.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. 本番利用ゼロの `initial-mapping.ts`、`image-utils.ts` および各専用テストを物理削除する。
    2. `effect-geometry.test.ts` に `engine/easing` 統合後の `computeArrowEffectState` 境界テストを追加する。
- **Concrete Test Cases**:
  - `src/lib/tactical/__tests__/effect-geometry.test.ts`（純粋関数 I/O）:
    - `case 1`: `computeArrowEffectState` が `easing: 'ease-in-out'` と `easing: 'linear'` で異なる進捗曲線値を返し、t=0 で 0・t>=duration で 1 に収束すること。
- **Verification**:
  - `bun run ai:check src/lib/tactical/__tests__/effect-geometry.test.ts`
