# TASK-030: 戦術ボード総合改善（試合連携・フォーメーション・ゴースト・自由ベンチ・UI整理）

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-21
- **Design Artifact**: `/home/watter46/.gemini/antigravity-cli/brain/6dc7093a-877f-4ce3-b57a-004647387c7c/plan.md`
- **Target Files**:
  - `src/features/tactical-unified/hooks/use-tactical-match-init.ts` (MODIFY)
  - `src/lib/tactical/tactical-storage.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-formation-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/objects/ball/components/ball-object.tsx` (MODIFY)
  - `src/features/tactical-unified/objects/arrow/components/ghost-trajectory-arrow.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/hud/context-hud.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/hud/mini-color-picker.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/right-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/squad-sub-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar-panels.tsx` (MODIFY)
  - `src/features/tactical-unified/stores/tool-slice.ts` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar-center.tsx` (MODIFY)
  - `src/features/tactical-unified/objects/player/components/player-layer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/toolbar/drawing-tool-plugin.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-reset-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/playback-controls.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. 【試合連携 & 個別保存】matchIdクエリ時にスタメン/ベンチ自動注入・個別保存・復元。クエリなし時はフリーサンドボックス
- [x] 2. 【フォーメーション適正化】デフォルト Home 4-2-3-1 / Away 4-4-2、フルコートデフォルト、ピッチ白線枠内強制収容、GK位置最適化、Blank Scene枠内収容
- [x] 3. 【右パネル再編】Properties(Inspector)完全撤廃し「Formation」「Squad」2タブ体制。自由配置ベンチキャンバス構築、初期配置・「整理ボタン」で3列グリッド（GK/DF/MF/FW）整列、ピッチ↔ベンチ双方向D&D、オプション自動初期化
- [x] 4. 【キャンバス・ゴースト・HUD】ボール描画復旧、スライド間ゴーストマーカー・曲線矢印ハンドル・アニメーション同期、ドラッグ中HUD非表示徹底、カラーピッカー上下フリップ
- [x] 5. 【ツールバー・タイムライン・フィルタ】Both/Home/Awayで非選択チーム完全描画除外、2Dマーカー追加ボタン撤去（Squad一元化）、リセット時戦術マーカー保護、AutoFit幾何補正、Scene 1復帰

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 試合連携 & 個別保存 (match-to-tactical-bridge / tactical-storage)
```ts
import { injectMatchToTactical, buildMatchTacticalPlayers } from '@/lib/tactical/match-to-tactical-bridge';
import { loadActiveProjectFromDb, saveActiveProjectToDb, getTacticalProjectStorageKey } from '@/lib/tactical/tactical-storage';
// 試合個別保存キー: matchId指定時は `tactical_active_project:${matchId}`、未指定時は `tactical_active_project`
```

### 3.2 フォーメーション & ピッチ幾何 (slide-formation-helpers / pitch-geometry)
```ts
import { buildTeamFormationPlayers, computeSlideAfterFormation } from '@/features/tactical-unified/stores/slide-formation-helpers';
import { calculatePitchRect } from '@/lib/tactical/pitch-geometry';
// GK正規化座標: Home X=5〜8 (ゴールライン直前), Away X=92〜95。Y=50。
// 全ポジションをピッチ白線枠内 (X: 3..97, Y: 3..97) に確実に収容
```

### 3.3 ゴースト矢印・HUD・カラーピッカー (ghost-trajectory-arrow / context-hud / mini-color-picker)
```ts
import { getBezierMidpoint, getQuadraticBezierPoints } from '@/lib/tactical/trajectory';
// isCurved ハンドル: getBezierMidpoint(start, end, cp)。アニメーション再生時は二次ベジェ補間
// ドラッグ中 (isDragging / stageDragging) は ContextHud を null 返却
// mini-color-picker: 画面上端 (y < 200) では下向き展開 (top-full mt-2)
```

### 3.4 右パネル & 自由配置ベンチ (right-panel / squad-sub-panel / tool-slice)
```ts
export type PanelState = { rightPanelTab: 'formation' | 'squad'; isRightPanelOpen: boolean; }; // inspector削除
// ベンチキャンバス: 選手マーカー自由ドラッグ配置 + 「整理」ボタンで GK/DF/MF/FW 3列グリッド整列
// ピッチ↔ベンチ D&D 時に hasViewCone, hasSpotlight 等の個別オプションを初期化 (false)
```

### 3.5 フィルタ・ツールバー・リセット (top-bar-center / player-layer / drawing-tool-plugin / slide-reset-helpers)
```ts
// top-bar-center: activeTeamFilter ('both' | 'home' | 'away')
// player-layer: activeTeamFilter !== 'both' && player.team !== activeTeamFilter の場合描画除外
// drawing-tool-plugin: WEB_DRAWING_TOOLS から TOOL_PLUGIN_PLAYER_2D を除外
// slide-reset-helpers: resetSlideObjectsData では players を維持し、arrows / shapes / lines のみ消去
```

---

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 試合連携基盤 & フォーメーション幾何適正化
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/tactical-storage.ts`
  - `src/features/tactical-unified/hooks/use-tactical-match-init.ts`
  - `src/features/tactical-unified/stores/slide-formation-helpers.ts`
  - `src/features/tactical-unified/stores/slide-helpers.ts`
- **Testing Strategy**:
  - `src/features/tactical-unified/hooks/__tests__/use-tactical-match-init.test.ts`
  - `src/features/tactical-unified/stores/__tests__/slide-formation-helpers.test.ts`
- **Tasks**:
  - [x] 1. `tactical-storage.ts`: `getTacticalProjectStorageKey(matchId)` 実装。`matchId` 指定時は `tactical_active_project:${matchId}` を使用
  - [x] 2. `use-tactical-match-init.ts`: 試合IDクエリ取得、初回アクセス時のスタメン/ベンチ自動注入、試合ごとの個別保存・ロード、クエリなし時はフリーサンドボックス
  - [x] 3. `slide-formation-helpers.ts` & `slide-helpers.ts`: デフォルト Home 4-2-3-1 / Away 4-4-2、フルコート（full）デフォルト、ピッチ白線矩形枠内（3〜97）強制収容、GK位置最適化、Blank Scene枠内収容
- **Worker Handoff Log**:
  - `createDefaultInitialPlayers` (Home 4-2-3-1, Away 4-4-2) を追加し、GK位置 (Home x:7, Away x:93) と白線枠内 (3..97) への収容を確定。`useTacticalMatchInit` & `tactical-storage` で試合固有キー (`tactical_active_project:${matchId}`) 永続化を検証済み。

---

### Phase 2: キャンバス・ボール復旧・ゴースト軌道同期 & HUD適正化
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/objects/ball/components/ball-object.tsx`
  - `src/features/tactical-unified/objects/arrow/components/ghost-trajectory-arrow.tsx`
  - `src/features/tactical-unified/hooks/tactical-animation-canvas.ts`
  - `src/features/tactical-unified/panels/hud/context-hud.tsx`
  - `src/features/tactical-unified/panels/hud/mini-color-picker.tsx`
- **Testing Strategy**:
  - `src/features/tactical-unified/objects/arrow/__tests__/ghost-trajectory-arrow.test.tsx`
  - `src/features/tactical-unified/panels/hud/__tests__/context-hud.test.tsx`
- **Tasks**:
  - [x] 1. `ball-object.tsx`: ボール描画ロジックの復旧と確実なレンダリング（BallLayer経由でCanvasStageContainerにマウント）
  - [x] 2. `ghost-trajectory-arrow.tsx` & `tactical-animation-canvas.ts`: スライド間ゴーストマーカー・曲線矢印制御ハンドル・アニメーション再生同期（PlayerLayerにPlayerGhostTrajectoryを配線）
  - [x] 3. `context-hud.tsx` & `mini-color-picker.tsx`: ドラッグ中/直後のHUD非表示徹底、画面上端での上下フリップ（見切れ防止）
- **Worker Handoff Log**:
  - `BallLayer` を新設してStageへマウントしボール表示を復旧。`PlayerLayer` に `PlayerGhostTrajectory` を配線。`handleDragEnd` の `setIsHudOpen(true)` 削除と `isDragging` ガードによりドラッグ中/直後のHUD非表示を徹底。`MiniColorPicker` の上下フリップを実装。

---

### Phase 3: 右パネル再編（Properties撤廃） & 自由配置ベンチキャンバス
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/stores/tool-slice.ts`
  - `src/features/tactical-unified/panels/right-panel/right-panel.tsx`
  - `src/features/tactical-unified/panels/toolbar/top-bar-panels.tsx`
  - `src/features/tactical-unified/panels/right-panel/squad-sub-panel.tsx`
  - `src/features/tactical-unified/panels/right-panel/formation-bench-item.tsx`
  - `src/features/tactical-unified/tactical-unified-page.tsx`
- **Testing Strategy**:
  - `src/features/tactical-unified/panels/right-panel/__tests__/right-panel.test.tsx`
  - `src/features/tactical-unified/panels/right-panel/__tests__/squad-sub-panel.test.tsx`
- **Tasks**:
  - [x] 1. `tool-slice.ts`, `right-panel.tsx`, `top-bar-panels.tsx`: Properties(Inspector)タブ・トグル完全撤廃、「Formation」「Squad」2タブ体制に集約
  - [x] 2. `squad-sub-panel.tsx` & `formation-bench-item.tsx`: マーカーを自由にドラッグ配置できるベンチキャンバス構築、初期配置および「整理ボタン」押下時のポジション順（GK/DF/MF/FW）3列グリッド再整列、メインピッチ↔ベンチの双方向D&D（tactical-pitch-droppable / tactical-bench-droppable）、ベンチ移動時のオプション（視野角・スポットライト等）自動初期化
- **Worker Handoff Log**:
  - Propertiesタブを撤廃しFormation/Squadの2タブ体制に集約。`squad-sub-panel` にDroppable対応の3列グリッド自由配置ベンチキャンバスとポジション順（GK/DF/MF/FW）「整理」ボタンを実装。メインピッチ↔ベンチの双方向D&D連携および `movePlayerToBench` でのオプション自動初期化を完了。

---

### Phase 4: ツールバー・タイムライン・フィルタ・リセット安全化
- **Worker Model**: `flash_lite`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/toolbar/top-bar-center.tsx`
  - `src/features/tactical-unified/core/components/PlayerLayer.tsx`
  - `src/features/tactical-unified/panels/toolbar/top-bar-more-menu.tsx`
  - `src/features/tactical-unified/core/components/toolbar/drawing-tool-plugin.ts`
  - `src/features/tactical-unified/stores/slide-reset-helpers.ts`
  - `src/features/tactical-unified/panels/timeline/playback-controls.tsx`
- **Testing Strategy**:
  - `src/features/tactical-unified/stores/__tests__/slide-reset-helpers.test.ts`
  - `src/features/tactical-unified/panels/toolbar/__tests__/top-bar-center.test.tsx`
  - `src/features/tactical-unified/panels/toolbar/__tests__/top-bar-more-menu.test.tsx`
  - `src/features/tactical-unified/core/components/__tests__/player-layer.test.tsx`
- **Tasks**:
  - [x] 1. `top-bar-center.tsx` & `PlayerLayer.tsx`: Both/Home/Awayフィルタによるキャンバス完全描画除外
  - [x] 2. `drawing-tool-plugin.ts`: ツールバーから2Dマーカー追加ボタン除外（Squad一元化）
  - [x] 3. `slide-reset-helpers.ts`: ツールバーリセット時の選手マーカー保護（矢印・ゾーン等のみクリア）
  - [x] 4. `playback-controls.tsx` & `top-bar-more-menu.tsx`: 再生リセット時のScene 1復帰、重複Swapメニュー削除
- **Worker Handoff Log**:
  - `PlayerLayer`: `teamVisibility` ('both' | 'home' | 'away') を購読し、`teamVisibility !== 'both'` 時は非選択チーム（`marker.team !== teamVisibility && marker.team !== 'neutral'`）のマーカーおよび接続線をキャンバス描画から完全に除外。単体テスト `player-layer.test.tsx` を追加して検証。
  - `top-bar-more-menu`: TopBarCenter に常時配置されたため不要となった重複「Swap Sides」ボタンを削除。単体テスト `top-bar-more-menu.test.tsx` を追加して検証。
  - `slide-reset-helpers.test.ts` を追加し、リセット時の選手マーカー保護およびロック機能の正常動作を検証。
  - `bun run ai:check` にて型検査、Lint（Biome）、単体テストすべて PASS。

---

### Phase 5: 全体統合検証 & 回帰防止
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/**`
- **Testing Strategy**: `bun run ai:check` による全モジュール検証
- **Tasks**:
  - [x] 1. 試合連携、フォーメーション配置、D&D、ゴースト軌道、リセットの一連の結合テスト実行
  - [x] 2. `bun run ai:check` の全テスト・型検査・Lint PASS
- **Worker Handoff Log**:
  - 全体統合検証を実施。TASK-030における仕様変更（Properties/Inspector撤廃、2DマーカーSquad一元化、ドラッグ範囲マージン拡張、初期4-2-3-1/4-4-2フォーメーション導入）に伴い、既存テスト（`timeline-slide-operations.test.ts`, `right-panel-tabs.test.tsx`, `drawing-toolbar-marker-mode.test.tsx`, `toolbar.test.tsx`, `boundary-box-hud.test.tsx`, `full-tactical-canvas-integration.test.tsx`, `tactical-unified-store.test.ts`）のアサーションおよびセットアップを最新仕様へ整合化。
  - `slide-background-helpers.ts` の `isDefault442Slide` を更新し、新初期配置（4-2-3-1 / 4-4-2）を初期未編集スライドとして正しく判定させて画像背景適用時のスライド不正増加バグを根本解決。
  - `player-marker.tsx` のダブルクリック遷移先を撤廃された inspector から squad タブへ更新し型安全性を回復。
  - `bun run ai:check`（Biome, Scoped TypeScript, 106 tests PASS）および `tactical-unified` 配下の全テストスイート（190+ tests PASS）がすべて exit code 0（GREEN）であることを確認。全受入要件達成。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `flash`
- **Reviewed At**: 2026-10-21
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 試合別復旧・フリーサンドボックス、Home 4-2-3-1/Away 4-4-2ピッチ枠内収容・GK最適化、Properties撤廃/2タブ集約、自由ベンチ3列グリッド/整理ボタン、ボール復旧、ゴースト軌道同期、ドラッグ中HUD抑制、カラーピッカー上下フリップ、チームフィルタ完全除外、2Dマーカー除外、リセット時選手保護、Scene 1復帰がすべて単体テストで担保
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、StoreProvider Context経由取得、初期値確定注入、isDefault442Slide更新によるスライド不正増加防止、Konva/アニメーション副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性 (OCP/SLAP/Shell Purity): 描画ツール定義のレジストリ変更、ヘルパー層（slide-formation-helpers, slide-reset-helpers等）の適切な分離
  - [x] 4. サイレント破壊 & 既存保護: スコープ外変更なし、全190+件のテストスイートがGREEN (exit code 0)
- **Summary**:
  - 4大定性監査全項目合格。Plan Artifact の決定事項が過不足なく堅牢に実装され、既存回帰ゼロで全テスト PASS。LGTM。

## 6. Rejections / Additional Tasks
