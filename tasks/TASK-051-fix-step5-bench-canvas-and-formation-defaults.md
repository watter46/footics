# TASK-051: fix-step5-bench-canvas-and-formation-defaults

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-24
- **Target Files**:
  - `src/lib/types/tactical-unified.ts` (MODIFY)
  - `src/lib/tactical/squad-to-tactical-bridge.ts` (MODIFY)
  - `src/lib/tactical/match-to-tactical-bridge.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-reset-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-player-crud-slice.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-player-move-slice.ts` (MODIFY)
  - `src/features/tactical-unified/core/types.ts` (MODIFY)
  - `src/features/tactical-unified/adapters/tactical-canvas-store-adapter.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/PlayerLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/hud/player-hud.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/right-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/formation-team-toggle.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/formation-presets-data.ts` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/formation-custom-manager.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/squad-sub-panel.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. メインキャンバス（`BillboardObjectLayer` / `PlayerLayer`）は `area === 'pitch'` の選手のみを描画し、試合詳細や Club & Season Presets 適用時に `area === 'bench'` の控え選手がピッチ左上 `(0, 0)` に表示されないこと
- [x] 2. `FormationCustomManager` の Chelsea プリセット適用時に `isFirstEleven` が反転せず、スタメン11人がピッチ、控え選手がベンチに正しく配置されること
- [x] 3. 新規プロジェクト作成（`createDefaultInitialPlayers` / `New Project`）、リセット（`resetSlideKeepSquadData`）、試合詳細連携（`buildMatchTacticalPlayers`）、スカッド注入（`convertSquadToTacticalPlayers`）のすべてでデフォルトが `mode: 'full'`（フルピッチ）であり、フォーメーション指定がない場合のデフォルトが `Home: 4-2-3-1` / `Away: 4-4-2` であること
- [x] 4. クイックフォーメーション（`QUICK_FORMATIONS`）が `['4-4-2', '4-2-3-1', '4-3-3', '4-1-4-1', '3-4-2-1']` の5個であること
- [x] 5. `RightPanel` の展開時横幅が `400px`（`w-[400px] min-w-[400px]`）に拡大され、`FormationTeamToggle` の `Home | Away | Both` ボタンが1段目に独立して窮屈さなく配置されていること
- [x] 6. サブキャンバス（`SquadSubPanel` のベンチ領域）が Konva `<Stage><Layer>` で構築され、ベンチ専用カードではなくメインと同一の `PlayerMarkerItem`（短縮名ラベル、SUB表記・ハンドル・削除ボタンなし）で描画されること
- [x] 7. サブキャンバス内でマーカーを自由な座標 `(x, y)` にドラッグ配置でき、「整理」ボタン押下時および初期配置時に上から `FW ➔ MID ➔ DF ➔ GK`（同グループ内は背番号昇順）の3列グリッド座標（3列×4行基準、5行目以降は縦スクロール可能）に整列されること
- [x] 8. メインキャンバス ⇔ サブキャンバス間で選手マーカーを双方向にドラッグ移動でき、メインから右パネル方向へドラッグした際にサブキャンバスが隠れていれば自動で右パネル展開＆`squad` タブへ切り替わること
- [x] 9. 手動追加したマーカー（`isCustom: true` または `markerType === 'ring'`）のみ、選択時のオブジェクトオプション（`PlayerHud`）に削除ボタンが表示され削除できること（プリセット・試合データの既存選手は削除ボタン非表示）

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { getFormationActualPos, type FormationMode, type FormationType } from '@/lib/data/formations';
import { FORMATION_POSITIONS } from '@/lib/data/formations-data';
import { PlayerMarkerItem } from '@/features/tactical-unified/core/components/PlayerMarkerItem';
import { computeBenchGridPositions, type Player } from '@/lib/types/tactical-unified';
```

### 3.2 Key Interfaces & Types
```ts
// src/lib/types/tactical-unified.ts
// PlayerSchema に isCustom: z.boolean().optional() を追加
export function computeBenchGridPositions(players: Player[]): Player[];

// src/features/tactical-unified/stores/slide-player-move-slice.ts
movePlayerToBench: (slideId: string, playerId: string, x?: number, y?: number) => void;

// src/features/tactical-unified/core/types.ts
moveMarkerToBench?: (id: string, x?: number, y?: number) => void;
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// 1. POSITION_ORDER (FW -> MID -> DF -> GK):
//    FW/CF/ST/LW/RW/SS/AML/AMR = 1, MF/DM/CM/AM/LM/RM/DMC/MC/AMC = 2, DF/CB/LB/RB/LWB/RWB/DC/DL/DR = 3, GK = 4, OTHER = 5
// 2. computeBenchGridPositions: ソート後に col = idx % 3, row = Math.floor(idx / 3) から x = [20, 50, 80][col], y = 14 + row * 22 を付与
// 3. DEFAULT_4231_HOME / DEFAULT_442_AWAY: FORMATION_POSITIONS['4-2-3-1'] と '4-4-2' を getFormationActualPos(pos, team, 'full') で変換したフルピッチ座標に更新（GKは x:7 / x:93, y:50）
// 4. PlayerMarkerItem は変更・分岐追加せず、SquadSubPanel 内の <Stage><Layer> からそのまま呼び出すこと
// 5. 'use client' の付与と Level 2 (core/) のホスト境界・StoreProvider 契約を厳守すること
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: データ層・Full初期フォーメーション・ベンチグリッド座標計算
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/types/tactical-unified.ts`
  - `src/lib/tactical/squad-to-tactical-bridge.ts`
  - `src/lib/tactical/match-to-tactical-bridge.ts`
  - `src/features/tactical-unified/stores/slide-reset-helpers.ts`
  - `src/features/tactical-unified/stores/__tests__/step5-defaults-and-bench-grid.test.ts`
- **契約 (Interface)**:
  ```ts
  export function computeBenchGridPositions(players: Player[]): Player[];
  ```
- **Testing Strategy**: `step5-defaults-and-bench-grid.test.ts` で (1) `createDefaultInitialPlayers` と `resetSlideKeepSquadData` が `full` モードの Home `4-2-3-1` / Away `4-4-2` 座標になること、(2) `buildMatchTacticalPlayers` と `convertSquadToTacticalPlayers` がデフォルト `mode: 'full'` かつ控え選手に `(0,0)` ではなく `FW->MID->DF->GK` 順の3列グリッド座標を付与することを検証。既存テストの座標期待値があれば `full` 座標に合わせて更新。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/stores/__tests__/step5-defaults-and-bench-grid.test.ts` ➔ 実装 ➔ `bun run ai:check src/lib/ src/features/tactical-unified/stores/` PASS
- **Worker Handoff Log**:
  - `PlayerSchema` に `isCustom: z.boolean().optional()` を追加し、`computeBenchGridPositions` をエクスポート（FW->MF->DF->GK->その他、背番号昇順、3列グリッド座標 `x: [20, 50, 80]`, `y: 14 + row * 22`）。
  - `convertSquadToTacticalPlayers` のデフォルトを `mode = 'full'` に更新し、控え選手に `computeBenchGridPositions` を適用。`buildMatchTacticalPlayers` も `mode = 'full'` を呼び出すように更新。

---

### Phase 2: ストア・メインキャンバス描画フィルタ・カスタム選手削除オプション (`PlayerHud`)
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/stores/slide-player-crud-slice.ts`
  - `src/features/tactical-unified/stores/slide-player-move-slice.ts`
  - `src/features/tactical-unified/core/types.ts`
  - `src/features/tactical-unified/adapters/tactical-canvas-store-adapter.ts`
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx`
  - `src/features/tactical-unified/core/components/PlayerLayer.tsx`
  - `src/features/tactical-unified/core/components/hud/player-hud.tsx`
  - `src/features/tactical-unified/core/components/__tests__/player-layer.test.tsx`
- **契約 (Interface)**:
  ```ts
  // BillboardObjectLayer / PlayerLayer: markers.filter(m => m.area !== 'bench') でピッチ選手のみ描画
  // PlayerHud: (isRing || player.isCustom) の場合のみ削除ボタン(Trash2)を表示
  // movePlayerToBench(slideId, playerId, x?, y?): 座標指定時はその(x,y)、未指定時はcomputeBenchGridPositions等でグリッド配置
  ```
- **Testing Strategy**: `player-layer.test.tsx` 等で `area: 'bench'` の選手がメインキャンバスに描画されないこと、`isCustom: true` の選手のみ `PlayerHud` に削除ボタンが出ることを検証。また `BillboardObjectLayer` で右パネル方向へドラッグした際に `#tactical-bench-canvas` の相対座標で `moveMarkerToBench` が呼ばれ、右パネルが自動展開（`squad` タブ）されるよう配線。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/core/components/__tests__/player-layer.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/core/ src/features/tactical-unified/adapters/ src/features/tactical-unified/stores/` PASS
- **Worker Handoff Log**:
  - `BillboardObjectLayer` / `PlayerLayer` で `markers.filter(m => m.area !== 'bench')` を適用し、Level 2 からの `useTacticalUnifiedStore` 直参照を排除して `useCanvasStore` 購読に統一。
  - `PlayerHud` は `(isRing || Boolean(player.isCustom))` のみ削除ボタンを表示。`movePlayerToBench` / `moveMarkerToBench` に `(id, x?, y?)` を追加し、右パネル方向ドロップ時の自動展開（`squad` タブ切替）を配線。

---

### Phase 3: 右パネル幅400px化・FormationタブUIゆとり配置・クイック5種・Preset反転修正
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/right-panel/right-panel.tsx`
  - `src/features/tactical-unified/panels/right-panel/formation-team-toggle.tsx`
  - `src/features/tactical-unified/panels/right-panel/formation-presets-data.ts`
  - `src/features/tactical-unified/panels/right-panel/formation-custom-manager.tsx`
  - `src/features/tactical-unified/panels/right-panel/__tests__/formation-panel-step5.test.tsx`
- **契約 (Interface)**:
  ```ts
  export const QUICK_FORMATIONS: FormationType[] = ['4-4-2', '4-2-3-1', '4-3-3', '4-1-4-1', '3-4-2-1'];
  // RightPanel: isRightPanelOpen 時は 'w-[400px] min-w-[400px]'
  // FormationCustomManager: isFirstEleven: Boolean(p.isFirstEleven) に修正
  ```
- **Testing Strategy**: `formation-panel-step5.test.tsx` で `QUICK_FORMATIONS` の5種表示、パネル幅 `w-[400px]`、`FormationTeamToggle` のレイアウト、Chelsea プリセットの `isFirstEleven` 正常適用を検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/right-panel/__tests__/formation-panel-step5.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/panels/right-panel/` PASS
- **Worker Handoff Log**:
  - RightPanel 展開幅を `w-[400px] min-w-[400px]` に拡大、FormationTeamToggle は 1段目にチーム選択（HOME/AWAY/BOTH）を独立配置し2段目にカラー・表示切替を配置。
  - QUICK_FORMATIONS を `['4-4-2', '4-2-3-1', '4-3-3', '4-1-4-1', '3-4-2-1']` に更新し、FormationCustomManager の `isFirstEleven` 反転（`!p.isFirstEleven`）を `Boolean(p.isFirstEleven)` に修正。

---

### Phase 4: サブキャンバス（Konva Stage + `PlayerMarkerItem` 統一・フリー配置・整理・スクロール・双方向D&D）
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/right-panel/squad-sub-panel.tsx`
  - `src/features/tactical-unified/panels/right-panel/__tests__/squad-panel-step5.test.tsx`
- **契約 (Interface)**:
  ```ts
  // SquadSubPanel: id="tactical-bench-canvas" のコンテナ内に Konva <Stage><Layer> を配置し、
  // teamPlayers.bench を <PlayerMarkerItem> で描画。
  // 3列×4行基準の高さ(280px)、人数超過または下端配置時はStage高さを拡張し親divで縦スクロール。
  // ドラッグ終了時: clientX が右パネル左端より左ならメインキャンバスのピッチ座標に変換して movePlayerToPitch、
  // サブキャンバス内なら updatePlayer で (x, y) を自由更新。クリック時は selectObject(player.id) で選択。
  ```
- **Testing Strategy**: `squad-panel-step5.test.tsx` で (1) サブキャンバスに `PlayerMarkerItem` が描画され旧カード要素（Trash2/GripVertical/SUBバッジ）が存在しないこと、(2) 「整理」ボタンで `FW ➔ MID ➔ DF ➔ GK` の3列グリッド座標に更新されること、(3) サブキャンバス内の自由移動とメインキャンバスへの移動が動作することを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/right-panel/__tests__/squad-panel-step5.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/panels/right-panel/` PASS
- **Worker Handoff Log**:
  - `SquadSubPanel` のベンチ領域を `id="tactical-bench-canvas"` コンテナ内の Konva `<Stage><Layer>` サブキャンバスに移行し、メインと同一の `PlayerMarkerItem` による描画、自由ドラッグ配置・「整理」ボタン（`computeBenchGridPositions` 適用）、基準高さ 280px からの動的 Stage 拡張縦スクロール、およびメインキャンバスへのドロップ（`movePlayerToPitch`）と選択（`selectObject`）を実装完了。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-24
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  - メインキャンバスの控え選手除外（`area === 'pitch'` のみ描画）とベンチサブキャンバス（Konva Stage + PlayerMarkerItem）の統一、3列グリッド整列（FW->MF->DF->GK昇順）、双方向D&D移動を完全実装。
  - フルピッチ初期フォーメーション（4-2-3-1 Home / 4-4-2 Away）、クイックフォーメーション5種、Chelsea プリセット isFirstEleven 反転修正、RightPanel 400px 拡大、カスタム選手のみ削除ボタン表示の受入要件をすべて網羅し、厳格な型・Lint・単体テストをパス。

## 6. Rejections / Additional Tasks (不可逆修正欄)
