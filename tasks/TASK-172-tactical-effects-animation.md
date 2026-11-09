# TASK-172: 戦術ボード エフェクトアニメーション基盤（多重波紋 ＆ 矢印伸長）

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-09
- **Target Files**:
  - `src/lib/types/tactical/annotations.ts` (MODIFY)
  - `src/lib/types/tactical/player.ts` (MODIFY)
  - `src/lib/tactical/effect-geometry.ts` (NEW)
  - `src/lib/tactical/interpolation-annotation.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/animation-node-updater.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/tactical-animation-canvas.ts` (MODIFY)
  - `src/lib/tactical/export/renderers/arrow-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/renderers/player-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/tactical-frame-renderer.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/hud/arrow-hud.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/effect-inspector-panel.tsx` (NEW)
  - `src/features/tactical-unified/panels/right-panel/right-panel.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. 矢印伸長（Grow Arrow）エフェクトのデータモデル（`ArrowEffectConfig`）およびマーカー多重波紋（Ripple Pulse）のデータモデル（`MarkerEffectConfig`）が定義され、既存データと完全な後方互換性を持つこと。
- [x] 2. 幾何計算純粋関数（`effect-geometry.ts`）において、指定進行度（0.0〜1.0）に応じた点列トリミング・終端接線角度、および時間に応じた波紋同心円リング（半径・透明度）が決定論的に算出されること。
- [x] 3. ボード編集画面および演出（レイアウト）画面の Konva アニメーション再生（GSAP 連携）において、スライド内経過時間に応じた矢印伸長と波紋リング描画がスムーズに反映されること。
- [x] 4. 非再生時（編集中・停止時）は常に 100%（Progress = 1.0）の静止状態が維持され、矢印の選択・変形・削除の操作性が一切損なわれないこと。
- [x] 5. 16:9 MP4 / Canvas 2D 動画エクスポート時にも同一の幾何計算純粋関数が使用され、Konva 描画と完全な数学的一致（Mathematical Parity）が保たれること。
- [x] 6. 矢印 HUD の「⚡️」ボタンからワンタッチで伸長エフェクトをトグル可能であり、右パネルの「エフェクト」セクションから詳細パラメータ（遅延、時間、維持、退場動作、波紋リング数など）を調整可能であること。

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
- **Invariants (破壊禁止の不変条件と理由)**:
  1. **停止中・編集中は常に 100%（Progress = 1.0）の静止表示**:
     - *Why*: 通常編集時にエフェクトが作動して矢印が消えたり縮んでいると、ユーザーが矢印を選択・変形・移動・削除できなくなるため。エフェクトは `isPlaying === true` および動画エクスポート時のみ作動させる。
  2. **Konva（画面）と Canvas 2D（動画エクスポート）の計算完全一致（Mathematical Parity）**:
     - *Why*: Konva 側と動画エクスポート側で別々に幾何計算を行うと、16:9 MP4 書き出し時に矢じりの位置や向き、波紋の半径が微妙にズレる描画パリティ破壊が発生する。点列トリミング・接線角度・波紋半径の計算式は共通の純粋関数（`src/lib/tactical/effect-geometry.ts`）に集約する。
  3. **単一の真実源（Single Source of Truth）**:
     - *Why*: ボード画面の右パネル（作図時の個別設定）と演出（レイアウト）画面の右パネルで同一のデータモデル（`ArrowAnnotation.effect`, `Player.style.markerEffect`）を参照・同期させ、画面間の不整合を根絶する。
  4. **オプショナル・後方互換性の担保**:
     - *Why*: 既存の保存データやJSONインポートにおいて `effect` プロパティが存在しない場合でも、`effect: undefined` または `type: 'none'` として安全にフォールバックし、既存プロジェクトを絶対に壊さない（サイレント破壊防止）。
- **Consumers (呼び出し元・別画面の同期確認リスト)**:
  - `src/features/tactical-unified/hooks/animation-node-updater.ts` — Konva ノードへの progress/tipAngle 反映
  - `src/lib/tactical/export/renderers/arrow-renderer.ts` — Canvas 2D での矢印トリミング描画
  - `src/lib/tactical/export/renderers/player-renderer.ts` — Canvas 2D での多重波紋描画
  - `src/features/tactical-unified/panels/right-panel/right-panel.tsx` — 右パネルでの選択オブジェクト種別に応じたアコーディオン表示
  - `src/features/tactical-unified/core/components/hud/arrow-hud.tsx` — HUD でのワンタッチエフェクト切り替え

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import type { ArrowAnnotation, ArrowEffectConfig } from '@/lib/types/tactical/annotations';
import type { Player, MarkerEffectConfig } from '@/lib/types/tactical/player';
import type { InterpolatedArrowState } from '@/lib/tactical/interpolation-annotation';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/core/store';
import { computeArrowEffectState, trimRenderPoints, computeRippleRings } from '@/lib/tactical/effect-geometry';
```

### 3.2 Key Interfaces & Types
```ts
// src/lib/types/tactical/annotations.ts
export type ArrowEffectType = 'none' | 'grow';
export type EffectEasing = 'linear' | 'ease-out' | 'ease-in-out';
export type EffectExitAction = 'keep' | 'auto-hide';

export interface ArrowEffectConfig {
  type: ArrowEffectType;        // 'grow': 始点から終点へ伸びるアニメーション
  delay: number;               // スライド開始からの遅延秒数 (既定: 0.5s, 0.0〜5.0s)
  duration: number;            // 伸長にかかる秒数 (既定: 0.8s, 0.1〜3.0s)
  holdDuration: number;        // 伸びきった後の維持秒数 (既定: 0.5s, 0.0〜5.0s)
  exitAction: EffectExitAction;// 'auto-hide' (フェードアウト消去) | 'keep' (スライド終了まで残す)
  fadeDuration: number;        // 消去時のフェード秒数 (既定: 0.3s)
  easing: EffectEasing;        // 既定: 'ease-out'
}

// src/lib/types/tactical/player.ts
export type MarkerEffectType = 'none' | 'ripple';

export interface MarkerEffectConfig {
  type: MarkerEffectType;       // 'ripple': 多重リング波紋アニメーション
  delay: number;               // スライド開始からの遅延秒数 (既定: 0.0s)
  duration: number;            // 1サイクルの秒数 (既定: 1.0s)
  ringsCount: number;          // 同心円リングの重なり数 (既定: 3, 範囲: 2〜4)
  repeatCount: number;         // 繰り返し回数 (既定: 2, 0=無限ループ)
  maxRadiusScale: number;      // 最大拡大倍率 (既定: 2.5)
  exitAction: EffectExitAction;// 'auto-hide' | 'keep'
}

// src/lib/tactical/interpolation-annotation.ts
export interface InterpolatedArrowState {
  id: string;
  arrowType: ArrowAnnotation['arrowType'];
  curveType: ArrowAnnotation['curveType'];
  points: NormalizedPoint[];
  controlPoint?: NormalizedPoint;
  color: string;
  strokeWidth: number;
  opacity: number;
  visible: boolean;
  sourcePlayerId?: string;
  targetPlayerId?: string;
  endMarker?: ArrowAnnotation['endMarker'];
  dashArray?: number[];
  arrowHead?: boolean;
  // 新規追加
  progress?: number;           // 0.0 〜 1.0 (描画進捗率)
  tipAngle?: number;           // 矢頭（ヘッド）の回転角度 (ラジアン)
}
```

### 3.3 Reference Pattern (既存実装・描画抜粋)
```ts
// src/lib/tactical/export/renderers/arrow-renderer.ts
export function renderArrows(context: FrameRenderContext, arrows: Record<string, InterpolatedArrowState>): void {
  for (const arrow of Object.values(arrows)) {
    if (!arrow.visible) continue;
    // points を Canvas 2D パスとして描画
  }
}

// src/features/tactical-unified/hooks/animation-node-updater.ts
export function updateArrowNodes(
  arrows: Record<string, InterpolatedArrowState>,
  registry: CanvasNodesRegistry,
  stageWidth: number,
  stageHeight: number,
  offsetX = 0,
  offsetY = 0
): void {
  for (const [id, arrow] of Object.entries(arrows)) {
    const node = registry.get(id);
    if (!node) continue;
    // node.visible(arrow.visible); node.opacity(arrow.opacity);
  }
}
```

---

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 型定義 & 幾何計算・補間ロジック (Domain & Geometry Engine)
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/types/tactical/annotations.ts` (MODIFY)
  - `src/lib/types/tactical/player.ts` (MODIFY)
  - `src/lib/tactical/effect-geometry.ts` (NEW)
  - `src/lib/tactical/interpolation-annotation.ts` (MODIFY)
  - `src/lib/tactical/__tests__/effect-geometry.test.ts` (NEW)
  - `src/lib/tactical/__tests__/interpolation-annotation.test.ts` (MODIFY or NEW)
- **契約 (Exact Contract & Formula)**:
  1. `ArrowAnnotationSchema` に `effect: ArrowEffectConfigSchema.optional()` を追加（既定値は undefined または type: 'none'）。
  2. `PlayerSchema` の `style` または直下に `markerEffect: MarkerEffectConfigSchema.optional()` を追加。
  3. `src/lib/tactical/effect-geometry.ts` に以下の純粋関数を実装：
     - `computeArrowEffectState(timeInSlideMs: number, config?: ArrowEffectConfig): { progress: number; opacity: number; visible: boolean }`
       - `time < delay`: `visible = false, progress = 0.0, opacity = 0.0`
       - `delay <= time < delay + duration`: `progress = ease((time - delay) / duration), opacity = 1.0, visible = true`
       - `delay + duration <= time < delay + duration + holdDuration`: `progress = 1.0, opacity = 1.0, visible = true`
       - (exitAction === 'auto-hide') `time < delay + duration + holdDuration + fadeDuration`: `progress = 1.0, opacity = 1.0 - (time - (delay + duration + holdDuration)) / fadeDuration, visible = true`
       - (exitAction === 'auto-hide') それ以降: `visible = false, opacity = 0.0, progress = 1.0`
       - (exitAction === 'keep') それ以降: `visible = true, opacity = 1.0, progress = 1.0`
     - `trimRenderPoints(points: NormalizedPoint[], progress: number): { trimmedPoints: NormalizedPoint[]; tipAngle: number }`
       - `progress <= 0`: 始点のみ2点複製、角度は始点から第2点への角度
       - `progress >= 1.0`: 全点そのまま、角度は最終線分の角度 `Math.atan2(pEnd.y - pPrev.y, pEnd.x - pPrev.x)`
       - 2点（直線）: 目標点 $E' = (S_x + (E_x - S_x) \times p, S_y + (E_y - S_y) \times p)$、角度 $\theta = \operatorname{atan2}(E_y - S_y, E_x - S_x)$
       - 複数点（曲線分割点列）: 累積距離テーブルから目標距離 $D = L \times p$ に達する区間 $[P_k, P_{k+1}]$ を特定し線形補間、角度 $\theta = \operatorname{atan2}(P_{k+1}.y - P_k.y, P_{k+1}.x - P_k.x)$
     - `computeRippleRings(timeInSlideMs: number, config?: MarkerEffectConfig, baseRadius?: number): Array<{ radius: number; opacity: number }>`
       - $p_i = ((time - delay) / duration + i / ringsCount) \bmod 1.0$
       - $R_i = \text{baseRadius} \times (1.0 + (maxRadiusScale - 1.0) \times p_i)$
       - $\alpha_i = \max(0, 1.0 - p_i)$
       - repeatCount 到達後は空配列（または非表示）
  4. `src/lib/tactical/interpolation-annotation.ts` の `InterpolatedArrowState` に `progress?: number`, `tipAngle?: number` を追加。
- **Testing Strategy (Concrete Test Values)**:
  - テストファイル: `src/lib/tactical/__tests__/effect-geometry.test.ts`
  - 直線トリミング:
    - 始点 `{x: 0, y: 0}`, 終点 `{x: 100, y: 0}`, `progress = 0.5` ➔ `trimmedPoints[1] = {x: 50, y: 0}`, `tipAngle = 0`
    - 始点 `{x: 0, y: 0}`, 終点 `{x: 0, y: 100}`, `progress = 0.5` ➔ `trimmedPoints[1] = {x: 0, y: 50}`, `tipAngle = Math.PI / 2`
  - 状態遷移計算:
    - `delay = 500ms`, `duration = 800ms`, `holdDuration = 500ms`, `fadeDuration = 300ms`, `exitAction = 'auto-hide'`, `easing = 'linear'`
    - `t = 200ms` ➔ `{ visible: false, progress: 0.0, opacity: 0.0 }`
    - `t = 900ms` ➔ `{ visible: true, progress: 0.5, opacity: 1.0 }`
    - `t = 1300ms` ➔ `{ visible: true, progress: 1.0, opacity: 1.0 }`
    - `t = 1600ms` ➔ `{ visible: true, progress: 1.0, opacity: 1.0 }`
    - `t = 1950ms` ➔ `{ visible: true, progress: 1.0, opacity: 0.5 }`
    - `t = 2200ms` ➔ `{ visible: false, opacity: 0.0 }`
- **Tasks**:
  - [x] 1. TDD実装: `src/lib/tactical/__tests__/effect-geometry.test.ts` を作成（RED）
  - [x] 2. 型定義更新: `annotations.ts`, `player.ts`, `interpolation-annotation.ts`
  - [x] 3. 幾何関数実装: `effect-geometry.ts` を実装しテスト PASS（GREEN）
  - [x] 4. 検証: `bun run ai:check src/lib/types/tactical/annotations.ts src/lib/types/tactical/player.ts src/lib/tactical/effect-geometry.ts src/lib/tactical/interpolation-annotation.ts`
- **Worker Handoff Log**:
  - Export: `computeArrowEffectState`, `trimRenderPoints`, `computeRippleRings`, `ArrowEffectConfig`, `MarkerEffectConfig`。
  - Gotcha: 各Config時間は秒単位・関数引数はミリ秒単位。未設定/停止時は常に`progress: 1.0`・`visible: true`を返却。

---

### Phase 2: Konva アニメーション・ノード更新 (Screen Rendering Engine)
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/hooks/animation-node-updater.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/tactical-animation-canvas.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/__tests__/animation-node-updater.test.ts` (MODIFY or NEW)
- **契約 (Exact Contract & Formula)**:
  1. `animation-node-updater.ts` の `updateArrowNodes`:
     - 各矢印の `arrow.progress`（0.0〜1.0）が存在する場合、`trimRenderPoints` でトリミングした点列をキャンバス座標系（stageWidth, stageHeight, offsets）に投影し、Konva Line / Arrow ノードの `points()` を更新。
     - `arrow.visible`, `arrow.opacity` を Konva ノードに適用。
  2. `animation-node-updater.ts` の `updatePlayerNodes`:
     - プレイヤーの波紋エフェクト（`player.style?.markerEffect` または付随エフェクト状態）が存在し、かつ再生中の場合、プレイヤーの Konva Group ノード配下に同心円リング用 Konva Node（または専用の Effect Layer）を描画・更新。
     - 非再生時（編集中）は波紋リングを一切表示しない（Invariants 1 厳守）。
  3. `tactical-animation-canvas.ts`:
     - GSAP タイムライン / 再生ループ内で、現在のスライド内経過ミリ秒 `timeInSlideMs` を計算。
     - `computeArrowEffectState` を各矢印に対して呼び出し、`InterpolatedArrowState` に `progress`, `opacity`, `visible` を注入して `updateArrowNodes` に渡す。
     - 再生停止（`isPlaying === false`）時は、強制的に全矢印の `progress = 1.0`, `opacity = 1.0`, `visible = true` でノードを復帰させる。
- **Testing Strategy (Concrete Test Values)**:
  - テスト: `src/features/tactical-unified/hooks/__tests__/animation-node-updater.test.ts`
  - `progress = 0.5` を持つ矢印が渡された際、Konva ノードの `points()` が元の半分の距離の座標で更新されること。
  - `visible = false` の矢印が渡された際、Konva ノードの `visible()` が `false` になること。
- **Tasks**:
  - [x] 1. テスト追加: `animation-node-updater.test.ts` で progress に応じたノード更新のテストを作成
  - [x] 2. `animation-node-updater.ts` でトリミング点列反映と波紋リング描画を実装
  - [x] 3. `tactical-animation-canvas.ts` で再生ループ時間とエフェクト計算の配線を実装
  - [x] 4. 検証: `bun run ai:check src/features/tactical-unified/hooks/animation-node-updater.ts src/features/tactical-unified/hooks/tactical-animation-canvas.ts`
- **Worker Handoff Log**:
  - Export: `updateArrowNodes`, `updatePlayerNodes`, `updatePlayerRippleRings`, `updateZoneNodes`。
  - Gotcha: `updatePlayerNodes` は `isPlaying === true` 時のみ波紋ノードを更新し、停止中・編集中は完全非表示化（Invariants 1 厳守）。Konva モック対応のためノードメソッド存在判定をガード。

---

### Phase 3: Canvas 2D 動画エクスポート描画 (Export Engine Parity)
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/export/renderers/arrow-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/renderers/player-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/tactical-frame-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts` (MODIFY or NEW)
- **契約 (Exact Contract & Formula)**:
  1. `src/lib/tactical/export/renderers/arrow-renderer.ts`:
     - `renderArrows` 内で `arrow.progress`（0.0〜1.0）が設定されている場合、`trimRenderPoints` でトリミングした点列を用いて Canvas 2D パスを描画。
     - 先端の矢頭（Arrow Head）がある場合、`tipAngle` またはトリミング後の終端接線ベクトルを用いて正確な向きに三角ヘッドを描画。
     - `context.globalAlpha = arrow.opacity` を適用。
  2. `src/lib/tactical/export/renderers/player-renderer.ts`:
     - プレイヤーの波紋エフェクトが有効な場合、`computeRippleRings` で計算された各同心円について `context.arc(cx, cy, ring.radius, 0, Math.PI * 2)` をストローク描画。
     - `globalAlpha` に各リングの透明度を乗算。
  3. `src/lib/tactical/export/tactical-frame-renderer.ts`:
     - 各フレーム描画時（スライド内時間 `currentTimeMs`）、`computeArrowEffectState` で矢印の状態を計算し、`InterpolatedArrowState` に注入して `renderArrows` を呼び出す。
     - プレイヤーの波紋計算結果を `renderPlayers` に供給。
- **Testing Strategy (Concrete Test Values)**:
  - テスト: `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts`
  - スライド開始直後（delay 未満）のフレームでは矢印が描画されないこと（または透明度 0）。
  - 伸長中のフレームでトリミングされた先端座標が Konva 側計算と完全一致すること。
- **Tasks**:
  - [x] 1. テスト追加: エクスポートフレーム生成時のエフェクト描画パリティテストを作成
  - [x] 2. `arrow-renderer.ts` でトリミング点列と矢頭描画を実装
  - [x] 3. `player-renderer.ts` で多重波紋リング描画を実装
  - [x] 4. `tactical-frame-renderer.ts` でフレーム時間に応じたエフェクト注入を実装
  - [x] 5. 検証: `bun run ai:check src/lib/tactical/export/renderers/arrow-renderer.ts src/lib/tactical/export/renderers/player-renderer.ts src/lib/tactical/export/tactical-frame-renderer.ts`
- **Worker Handoff Log**:
  - Export: `renderArrows`, `renderPlayers`, `renderTacticalFrameToCanvas`, `computeFrameEffects`, `isPauseFrame`。
  - Gotcha: `arrow-renderer`は`progress`に応じた点列トリミング・矢頭/ドット再配置を行い、`player-renderer`はマーカー下層へ波紋リングを描画。共通エフェクト計算は`tactical-frame-effects`に集約。

---

### Phase 4: UI / UX（HUD「⚡️」ボタン ＆ 右パネルエフェクトインスペクター）
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/core/components/hud/arrow-hud.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/effect-inspector-panel.tsx` (NEW)
  - `src/features/tactical-unified/panels/right-panel/right-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/__tests__/effect-inspector-panel.test.tsx` (NEW)
- **契約 (Exact Contract & Formula)**:
  1. `src/features/tactical-unified/core/components/hud/arrow-hud.tsx`:
     - HUD ボタン群に「⚡️」アイコンボタンを追加。
     - クリック時、選択中の矢印の `effect.type === 'grow'` であれば `type: 'none'`、そうでなければ `type: 'grow'` に切り替えるアクションを呼び出す。
     - エフェクト有効時はボタンをハイライト（アクティブ）表示。
  2. `src/features/tactical-unified/panels/right-panel/effect-inspector-panel.tsx`:
     - 4層モデル: Level 2（Domain UI Block）。
     - `useTacticalUnifiedStoreContext()` から選択中アイテム（矢印またはマーカー）を取得。
     - 矢印選択時:
       - エフェクト種別: なし / 伸長 (Grow)
       - 開始遅延 (Delay): スライダー ＋ 数値入力（0.0〜5.0s, 0.1s単位）
       - 伸長時間 (Duration): スライダー ＋ 数値入力（0.1〜3.0s, 0.1s単位）
       - 維持時間 (Hold): スライダー ＋ 数値入力（0.0〜5.0s, 0.1s単位）
       - 退場動作 (Exit Action): セグメント [自動消去 (Auto-hide) / 残す (Keep)]
       - イージング: Ease-out / Linear / Ease-in-out
     - マーカー選択時:
       - エフェクト種別: なし / 波紋 (Ripple)
       - 開始遅延 / 周期時間 / 同心円数 (2〜4) / 繰り返し回数 (1, 2, 無限)
  3. `src/features/tactical-unified/panels/right-panel/right-panel.tsx`:
     - 矢印またはマーカー（選手）選択時、右パネルに `EffectInspectorPanel` をアコーディオンとして組み込み。
- **Testing Strategy (Concrete Test Values)**:
  - テスト: `src/features/tactical-unified/panels/right-panel/__tests__/effect-inspector-panel.test.tsx`
  - 矢印選択時に「エフェクト」設定が表示され、数値を変更すると store の updateArrow が呼ばれること。
  - HUD の「⚡️」ボタンをクリックすると toggleEffect が呼ばれること。
- **Tasks**:
  - [x] 1. `effect-inspector-panel.test.tsx` テスト作成
  - [x] 2. `arrow-hud.tsx` に「⚡️」ボタン追加
  - [x] 3. `effect-inspector-panel.tsx` を新規作成
  - [x] 4. `right-panel.tsx` にインスペクターを組み込み
  - [x] 5. 検証: `bun run ai:check src/features/tactical-unified/core/components/hud/arrow-hud.tsx src/features/tactical-unified/panels/right-panel/effect-inspector-panel.tsx src/features/tactical-unified/panels/right-panel/right-panel.tsx`
- **Worker Handoff Log**:
  - Export: `EffectInspectorPanel`, `DEFAULT_ARROW_EFFECT`, `DEFAULT_MARKER_EFFECT`, `ArrowEffectSection`, `MarkerEffectSection`, `NumberSliderField`。
  - Gotcha: 単一責任・行数上限遵守のため矢印/マーカーセクションを分離。HUDの⚡️トグル・インスペクターの遅延/時間/退場動作/イージング等の変更をStore Context経由で安全に反映。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-09 23:20
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: 数式/座標/状態遷移の整合性、受入要件の全網羅、Concrete Test Values検証、ハック排除
  - [x] 2. Invariants保護 & Consumer同期: Section 2.5 の不変条件（停止中・編集中は常に100%静止表示、数学的パリティ）遵守、呼び出し元の更新漏れゼロ
  - [x] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 4. 設計負債 & サイレント破壊防止: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、公開シグネチャ保護、既存保存データフォールバック
- **Summary**:
  4大定性監査（ドメイン論理・Invariants保護・ホスト境界・設計負債防止）をすべてクリア。純粋関数（effect-geometry.ts）によるKonva描画とCanvas 2D動画エクスポートの数学的パリティが完全に保たれており、編集中100%静止表示のInvariantsも遵守。UIコンポーネントも適切にモジュール分割され、後方互換性も万全です。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
