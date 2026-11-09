# TASK-174: 戦術オブジェクトエフェクト拡張（ゾーンパルス・点線矢印Flow・選手ゴースト軌道・波紋調整）

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-10
- **Target Files**:
  - `src/lib/types/tactical/annotations.ts` (MODIFY)
  - `src/lib/types/tactical/player.ts` (MODIFY)
  - `src/lib/tactical/effect-geometry.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/animation-node-updater.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/animation-zone-updater.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/tactical-animation-canvas.ts` (MODIFY)
  - `src/lib/tactical/export/renderers/zone-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/renderers/arrow-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/renderers/player-renderer.ts` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/effect-inspector-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/arrow-effect-section.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/marker-effect-section.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/zone-effect-section.tsx` (NEW)
  - `src/features/tactical-unified/panels/right-panel/player-trajectory-effect-section.tsx` (NEW)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. **ゾーンパルスエフェクト**:
  - `ZoneAnnotation` に `effect: ZoneEffectConfigSchema.optional()`（`type: 'none' | 'pulse'`, `duration: 0.1~10s`, `minOpacity: 0~1`, `maxOpacity: 0~1`）を追加。
  - アニメーション再生時、ゾーンの `opacity` が時間経過に応じて滑らかなサイン波で周期的に明滅する（Konva描画 + MP4エクスポート描画の両方で同一挙動）。
- [x] 2. **点線矢印 Flow / Grow-and-Flow エフェクト**:
  - `ArrowEffectTypeSchema` に `'flow' | 'grow-and-flow'` を追加。
  - `flow`: 矢印の配置・長さは固定のまま、点線破線（`dashOffset`）が先端（進行方向）に向かって流れる。
  - `grow-and-flow`: 伸長完了（progress === 1）後に点線が進行方向へ流れ続ける。
  - Konva（`arrowEntry.node.dashOffset(...)`）および MP4エクスポート（`ctx.lineDashOffset`）の両方で同期。
- [x] 3. **選手移動ゴースト軌跡エフェクト (Trajectory Effect)**:
  - `Player` に `trajectoryEffect: PlayerTrajectoryEffectConfigSchema.optional()`（`enabled: boolean`, `lineStyle: 'solid' | 'dashed'`, `color?: string`, `exitAction: 'keep' | 'auto-hide'`）を追加。
  - スライド再生中に選手が移動する場合、移動開始地点に丸印（●）を描画し、現在移動中の選手に向かって線（実線/点線）が追従して伸びる。
- [x] 4. **波紋エフェクトカスタマイズ**:
  - `MarkerEffectConfigSchema` に `color: z.string().optional()` を追加（未指定時は選手のマーカー色）。
  - `maxRadiusScale`（最大拡大倍率）と `color` をインスペクター（右パネル）から調整可能にする。
- [x] 5. **インスペクターUI統合**:
  - ゾーン選択時に `ZoneEffectSection`（パルス設定）を表示。
  - 矢印選択時に `ArrowEffectSection` で `flow`, `grow-and-flow` を選択可能にする。
  - 選手選択時に `MarkerEffectSection`（波紋カラー・倍率スライダー）および `PlayerTrajectoryEffectSection`（軌跡ON/OFF、実線/点線、到達後キープ/消去）を表示。

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
- **Invariants (破壊禁止の不変条件と理由)**:
  1. **Konva描画と動画エクスポート描画の完全数式一致**: プレビュー（`tactical-animation-canvas.ts` / `animation-node-updater.ts`）と動画レンダラー（`src/lib/tactical/export/renderers/*`）は必ず `src/lib/tactical/effect-geometry.ts` の純粋関数を共用し、プレビューと書き出し動画の見た目ズレをゼロにする。
  2. **4層コンポーネントモデル & ホスト境界**: Level 2 以下のドメインコンポーネントであり、Chrome Extension / Web の両方で動作可能とする。`chrome.*` 等のホスト依存を絶対に混入させない。
  3. **既存データ互換性**: 各 effect 設定はすべて `.optional()` で定義し、未設定（undefined）の場合は従来どおり通常描画（エフェクトなし）として破綻なく動作すること。
- **Consumers (呼び出し元・別画面の同期確認リスト)**:
  - `src/lib/tactical/export/tactical-frame-effects.ts` — エクスポート時のエフェクト反映
  - `src/features/tactical-unified/core/components/annotations/ArrowObject.tsx` — 通常編集モードでの描画
  - `src/features/tactical-unified/panels/right-panel/effect-inspector-panel.tsx` — 右パネルの選択オブジェクト別アコーディオン

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { z } from 'zod';
import type { ArrowAnnotation, ZoneAnnotation } from '@/lib/types/tactical/annotations';
import type { Player, MarkerEffectConfig } from '@/lib/types/tactical/player';
import { computeArrowEffectState, computeRippleRings } from '@/lib/tactical/effect-geometry';
```

### 3.2 Key Interfaces & Types
```ts
// ゾーンパルス
export const ZoneEffectConfigSchema = z.object({
  type: z.enum(['none', 'pulse']).default('none'),
  duration: z.number().min(0.1).max(10).default(1.2),
  minOpacity: z.number().min(0).max(1).default(0.15),
  maxOpacity: z.number().min(0).max(1).default(0.45),
});

// 点線矢印エフェクト
export const ArrowEffectTypeSchema = z.enum(['none', 'grow', 'flow', 'grow-and-flow']);

// 選手軌跡エフェクト
export const PlayerTrajectoryEffectConfigSchema = z.object({
  enabled: z.boolean().default(false),
  lineStyle: z.enum(['solid', 'dashed']).default('solid'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  exitAction: z.enum(['keep', 'auto-hide']).default('keep'),
});
```

---

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: スキーマ・幾何計算の純粋ロジック拡張
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/types/tactical/annotations.ts` (MODIFY)
  - `src/lib/types/tactical/player.ts` (MODIFY)
  - `src/lib/tactical/effect-geometry.ts` (MODIFY)
  - `src/lib/tactical/__tests__/effect-geometry.test.ts` (MODIFY)
- **契約 (Exact Contract & Formula)**:
  1. `computeZonePulseOpacity(timeInSlideMs: number, config?: ZoneEffectConfig, baseOpacity = 0.25): number`:
     - `config?.type !== 'pulse'` の場合は `baseOpacity` を返す。
     - `cycle = (timeInSlideMs / 1000) / config.duration;`
     - `pulse = (Math.sin(cycle * Math.PI * 2 - Math.PI / 2) + 1) / 2;` (0〜1)
     - `return config.minOpacity + pulse * (config.maxOpacity - config.minOpacity);`
  2. `computeArrowFlowDashOffset(timeInSlideMs: number, config?: ArrowEffectConfig, speed = 25): number`:
     - 先端へ向かって流すため負方向へシフト: `-(timeInSlideMs / 1000) * speed;`
  3. `computeArrowEffectState` に `flow`, `grow-and-flow` をサポート:
     - `flow`: `progress: 1`, `visible: true`, `opacity: 1`, `dashOffset: computeArrowFlowDashOffset(...)`
     - `grow-and-flow`: 伸長中は `dashOffset: 0`、伸長完了後（time > delay + duration）に `dashOffset` を流す。
  4. `computeRippleRings` に `config.color` 伝播サポート。
- **Testing Strategy (Concrete Test Values)**:
  - `src/lib/tactical/__tests__/effect-geometry.test.ts` にテスト追加:
    - パルス: `duration = 1.0`, `min = 0.2`, `max = 0.6` のとき、t=0s -> 0.2, t=0.25s -> 0.4, t=0.5s -> 0.6, t=0.75s -> 0.4
    - 点線Flow: t=1000ms, speed=20 -> dashOffset = -20
- **Tasks**:
  - [x] 1. TDD実装: `src/lib/tactical/__tests__/effect-geometry.test.ts` に RED テスト作成
  - [x] 2. 型定義（annotations.ts, player.ts）更新
  - [x] 3. `src/lib/tactical/effect-geometry.ts` 実装 ➔ テスト PASS
- **Worker Handoff Log**:
  - Export: `computeZonePulseOpacity`, `computeArrowFlowDashOffset`, `ZoneEffectConfigSchema`, `PlayerTrajectoryEffectConfigSchema`.
  - Gotcha: `ArrowEffectState` に `dashOffset?: number`, `RippleRing` に `color?: string` を拡張。`grow-and-flow` は伸長完了後の経過時間 `timeInSlideMs - delayMs - durationMs` で dashOffset を滑らかに開始。

---

### Phase 2: Konva リアルタイム描画ループの反映
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/hooks/animation-node-updater.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/animation-zone-updater.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/tactical-animation-canvas.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/__tests__/tactical-animation-canvas.test.ts` (MODIFY)
- **契約 (Exact Contract & Formula)**:
  1. `updateZoneNodes`:
     - 引数に `timeInSlideMs: number` を追加。
     - ゾーンの `effect?.type === 'pulse'` の場合、`computeZonePulseOpacity` で計算した `opacity` を適用。
  2. `updateArrowNodes`:
     - `aState` に `dashOffset?: number` を伝播し、`arrowEntry.node.dashOffset(aState.dashOffset ?? 0)` を設定。
  3. 選手移動の軌跡エフェクト:
     - `updatePlayerNodes` または新規軌跡レイヤーにて、`pState.trajectoryEffect?.enabled` かつ移動中の場合、開始座標（スライド始点）に `●`、そこから現在位置までのラインを描画。
- **Testing Strategy (Concrete Test Values)**:
  - `tactical-animation-canvas.test.ts`:
    - パルスゾーンのアニメーションフレームで opacity が変化することの検証。
    - 点線矢印で dashOffset が時間に応じてマイナス値へ更新されることの検証。
- **Tasks**:
  - [x] 1. `animation-zone-updater.ts` にパルス計算統合
  - [x] 2. `animation-node-updater.ts` に dashOffset および軌跡ノード更新を統合
  - [x] 3. `tactical-animation-canvas.ts` の `renderFrameToCanvas` から時刻を渡して連動
- **Worker Handoff Log**:
  - Export: `updateZoneNodes` (引数に `timeInSlideMs` 追加), `updatePlayerTrajectory` (`animation-trajectory-updater.ts`), `tactical-timeline.ts` 分割抽出。
  - Gotcha: `updatePlayerTrajectory` は `playerGroup` 内ローカル座標に始点マーカー（●）と追従ライン（実線/点線）を配置し、playerGroup 移動に逆算追従。`findOne` 未実装モックへのフォールバック付き。

---

### Phase 3: 動画エクスポート描画 (Canvas 2D) の反映
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/export/renderers/zone-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/renderers/arrow-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/renderers/player-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/__tests__/zone-renderer.test.ts` (MODIFY / NEW)
- **契約 (Exact Contract & Formula)**:
  1. `renderZone`: `frameCtx.timeInSlideMs` から `computeZonePulseOpacity` を呼び出し、塗りつぶし・枠線の透明度を計算。
  2. `renderArrow`: `a.effect` が `flow` または `grow-and-flow` の場合、`ctx.lineDashOffset = dashOffset;` を設定して描画。
  3. `renderPlayers`: `p.trajectoryEffect?.enabled` の場合、移動元座標に丸（●）を描画し現在位置まで線をストローク。
- **Testing Strategy (Concrete Test Values)**:
  - レンダラーのテストにて、`timeInSlideMs` を与えた場合に `lineDashOffset` や `globalAlpha` / `fillStyle` が期待通り設定されることをモック Canvas コンテキストで検証。
- **Tasks**:
  - [x] 1. `zone-renderer.ts` にパルス透明度反映
  - [x] 2. `arrow-renderer.ts` に `lineDashOffset` 反映
  - [x] 3. `player-renderer.ts` に移動軌跡描画反映
- **Worker Handoff Log**:
  - Export: `renderPlayerTrajectory` (`player-trajectory-renderer.ts`), `FrameRenderContext.timeInSlideMs`.
  - Gotcha: `player-renderer.ts` 300行上限対策で `player-trajectory-renderer.ts` に分離。矢印は `a.dashOffset` 優先かつ `(a.effect)` フォールバック対応。波紋リングのカスタムカラー（`ring.color`）描画も同期。

---

### Phase 4: 右パネル (Effect Inspector) UI 実装
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/right-panel/zone-effect-section.tsx` (NEW)
  - `src/features/tactical-unified/panels/right-panel/player-trajectory-effect-section.tsx` (NEW)
  - `src/features/tactical-unified/panels/right-panel/arrow-effect-section.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/marker-effect-section.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/effect-inspector-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/__tests__/effect-inspector-panel.test.tsx` (MODIFY)
- **契約 (Exact Contract & Formula)**:
  1. `ZoneEffectSection`: ゾーン選択時、「パルス (明滅)」のトグル、周期スライダー (0.2s〜3.0s)、最小/最大不透明度設定。
  2. `ArrowEffectSection`: エフェクト選択に `flow` と `grow-and-flow` を追加（点線矢印時のみ選択肢として有効化、実線の場合は点線化を案内）。
  3. `MarkerEffectSection`: 波紋カラーピッカー（未指定ならチーム色）と最大半径スライダー（1.0〜5.0）を追加。
  4. `PlayerTrajectoryEffectSection`: 軌跡ON/OFF、実線/点線（`lineStyle`）、キープ/自動消去（`exitAction`）の設定UI。
  5. `EffectInspectorPanel`: ゾーン選択時、矢印選択時、選手マーカー選択時に対応するセクションを展開表示。
- **Testing Strategy (Concrete Test Values)**:
  - `effect-inspector-panel.test.tsx`:
    - ゾーン選択時に `ZoneEffectSection` が表示され、パルストグルで `updateZone` が呼ばれること。
    - 選手選択時に `MarkerEffectSection` のカラー選択や `PlayerTrajectoryEffectSection` が表示されること。
- **Tasks**:
  - [x] 1. `zone-effect-section.tsx` 作成
  - [x] 2. `player-trajectory-effect-section.tsx` 作成
  - [x] 3. `marker-effect-section.tsx`, `arrow-effect-section.tsx`, `effect-inspector-panel.tsx` 改修
  - [x] 4. 単体テスト PASS
- **Worker Handoff Log**:
  - Export: `ZoneEffectSection`, `DEFAULT_ZONE_EFFECT`, `PlayerTrajectoryEffectSection`, `DEFAULT_PLAYER_TRAJECTORY_EFFECT`.
  - Gotcha: `ArrowEffectSection` は点線判定（`dashArray.length > 0`）で `flow` / `grow-and-flow` を選択肢に有効化し実線時は点線化ボタンを提供。`EffectInspectorPanel` はゾーン選択時（`zone-effect-inspector`）と選手選択時の波紋・移動軌跡をシームレスに展開表示。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-10 03:17
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: ゾーンパルス・点線Flow・選手軌跡・波紋調整の全4要件が過不足なく実装され、テストが通っているか。
  - [x] 2. Invariants保護 & Consumer同期: Konva アニメーションと MP4 動画エクスポートの計算式が `effect-geometry.ts` で完全に同期されているか。
  - [x] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2 以下の純粋コンポーネントであり、Store Provider 経由で状態操作されているか。
  - [x] 4. 設計負債 & サイレント破壊防止: 既存の矢印伸長（`grow`）や波紋（`ripple`）が壊れていないか、未設定データに対する安全なフォールバックがあるか。
- **Summary**: Konva 描画と MP4 動画エクスポート描画の幾何計算完全同期（effect-geometry 共用）、ホスト境界・Store Provider 準拠、軌跡・パルス・点線 Flow・波紋カスタマイズの全4要件を高水準に達成。ファイル分割（tactical-timeline, player-trajectory-renderer 等）も SLAP 原則に沿って適切に行われている。

## 6. Rejections / Additional Tasks (不可逆修正欄)
