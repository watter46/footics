# TASK-031: 戦術ボード総合改善の高精度完遂（試合連携・自由ベンチ・ゴースト完全化・幾何補正）

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-21
- **Design Artifact**: `/home/watter46/.gemini/antigravity-cli/brain/c2ed8fa3-3d8b-44c6-bc2c-59b80300d362/plan.md`
- **Target Files**:
  - `src/features/dashboard/widgets/team-summary/components/team-summary-header.tsx` (MODIFY)
  - `src/features/national-dashboard/components/NationalDashboard.tsx` (MODIFY)
  - `src/features/tactical-unified/hooks/use-tactical-match-init.ts` (MODIFY)
  - `src/features/tactical-unified/stores/project-slice.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/CanvasStageContainer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/PlayerLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/BallLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/squad-sub-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/formation-bench-item.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/hud/context-hud.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/playback-controls.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar-center.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/BoundaryBoxHud.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. 【試合詳細リンク】ダッシュボードから `/tactical?matchId=${matchId}` で遷移し、Dexie の数値キー（`Number(matchId)`）に対応して初回スタメン・ベンチ自動配置＆個別プロジェクト保存を確実に動作させる (#1)
- [x] 2. 【ピッチデフォルト 4:5 & 縦型スケール】新規プロジェクトのアスペクト比を `'4:5'` とし、縦型比率（`'4:5'`, `'9:16'`）でマーカーサイズを 0.85 倍に縮小 (#4)
- [x] 3. 【幾何統一・ゴースト追従・ボール補正】Stage 矩形とピッチ実矩形を完全一致させ、アニメーション再生時の内側寄り・比率変更時のボール白線ズレを根絶。ドラッグ中もゴースト矢印終点がマーカーにリアルタイム追従 (#3, #7, #8)
- [x] 4. 【メインキャンバス ↔ ベンチ双方向移動】ベンチ「投入（＋）」でピッチ内安全空き位置へ配置。Context HUD の「ベンチ退避」ボタンまたはドラッグ退避でベンチへ戻し、visionCone等の個別オプションを全自動初期化 (#2)
- [x] 5. 【再生リセット削除 & メンバー維持リセット新設 & 境界線HUD整理】再生横の `RotateCcw` ボタンを削除。TopBar に「メンバー維持型リセット」ボタンを新設（スタメン維持、初期配置・ボール50,50・境界線100%・描画全消去）。境界線HUDは「全画面」「ピッチにフィット」の2ボタンのみラベル付きで残す (#5, #6)

---

## 3. Context Snippets (型・関数・参照パターン)

### A. 試合連携 (use-tactical-match-init.ts)
```typescript
const numericMatchId = Number(matchId);
const match = !Number.isNaN(numericMatchId)
  ? await db.matches.get(numericMatchId)
  : await db.matches.get(matchId);
```

### B. メンバー維持リセット (project-slice.ts)
```typescript
resetSlideKeepSquad: (slideId: string) => {
  // 既存の players (pitch & bench) の ID, name, number, team は維持
  // area: 'pitch' の選手のみ Home 4-2-3-1, Away 4-4-2 の初期座標 (x, y) にリセット
  // ball: { x: 50, y: 50 }
  // boundaryBox: { ...DEFAULT_BOUNDARY_BOX_FULL }
  // arrows: [], zones: [], lines: [], texts: []
}
```

### C. 縦型スケール (PlayerMarkerItem.tsx)
```typescript
const isVerticalAspect = aspectRatio === '4:5' || aspectRatio === '9:16';
const verticalScale = isVerticalAspect ? 0.85 : 1.0;
const radius = baseDim * 0.032 * sizeScale * verticalScale;
```

---

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 試合詳細連携 & プロジェクト初期設定（#1, #4）
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/dashboard/widgets/team-summary/components/team-summary-header.tsx`
  - `src/features/national-dashboard/components/NationalDashboard.tsx`
  - `src/features/tactical-unified/hooks/use-tactical-match-init.ts`
  - `src/lib/types/tactical-unified.ts`
- **Tasks**:
  - [x] 1. `team-summary-header.tsx` & `NationalDashboard.tsx`: 戦術ボードリンクを `/tactical?matchId=${encodeURIComponent(matchId)}` に修正
  - [x] 2. `use-tactical-match-init.ts`: `Number(matchId)` に対応し、Dexie から取得した試合データでスタメン・ベンチを自動注入＆個別保存
  - [x] 3. `tactical-unified.ts`: 新規プロジェクト・スライド作成時およびフォーメーション生成時のデフォルト `aspectRatio` を `'4:5'` に設定
- **Worker Handoff Log**:
  - `team-summary-header.tsx` および `NationalDashboard.tsx` の戦術ボードリンクを `matchId` クエリパラメータ付きに修正。
  - `use-tactical-match-init.ts` で `Number(matchId)` に対応し、数値・文字列両方のDexieキーに対応。
  - `src/lib/types/tactical-unified.ts` のデフォルト比率を `'4:5'` に更新し、プロジェクト生成時の初期設定を 4:5 に統一。
  - `boundary-box-hud.test.tsx` の 16:9 比率テストがデフォルト変更後も安定して動作するよう微修正。
  - `bun run ai:check` および `rtk vitest run src/features/tactical-unified/` (349件全GREEN) を確認。

---

### Phase 2: ピッチ幾何統一 & 縦型スケール & ゴースト完全追従（#3, #4, #7, #8）
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/core/components/CanvasStageContainer.tsx`
  - `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx`
  - `src/features/tactical-unified/core/components/PlayerLayer.tsx`
  - `src/features/tactical-unified/core/components/BallLayer.tsx`
  - `src/features/tactical-unified/hooks/tactical-animation-canvas.ts`
- **Tasks**:
  - [x] 1. `CanvasStageContainer.tsx`: Stage 矩形をピッチのアスペクト比に合わせて中央 contain 配置し、Stage = ピッチ実矩形（余白なし）で統一
  - [x] 2. `PlayerMarkerItem.tsx`: `aspectRatio === '4:5' || aspectRatio === '9:16'` 時にマーカーサイズを `0.85` 倍縮小
  - [x] 3. `PlayerLayer.tsx` & `BallLayer.tsx`: 移動のあった全選手・ボールにゴースト表示。ドラッグ中（`handleMarkerDragMove`）にゴースト矢印終点をリアルタイム追従更新
- **Worker Handoff Log**:
  - `CanvasStageContainer.tsx` および `FullTacticalCanvas.tsx` で `imageAspect` にスライド/プロジェクトの `ASPECT_RATIOS[aspectRatio]` を供給し、Stage 矩形（vRect）がピッチ実比率で contain 配置されるよう統一。
  - `BackgroundImageLayer.tsx` のピッチ描画を Stage 全面（x: 0, y: 0, width, height）に統一し余白計算の二重化を解消。
  - `tactical-animation-canvas.ts` の `calculatePitchDimensions` を修正し、Stage 寸法をそのままピッチ寸法として返却（再生時と静止時の完全幾何一致）。
  - `PlayerMarkerItem.tsx` および `PlayerGhostTrajectory.tsx` で `aspectRatio === '4:5' || aspectRatio === '9:16'` 時にマーカー半径を 0.85 倍にスケール。
  - `PlayerLayer.tsx` および `BallGhostTrajectory.tsx` / `ball-object.tsx` で非選択時も移動のあった選手・ボールのゴースト軌道（矢印・ゴーストマーカー・ゴーストボール）を常時表示。
  - `trajectory-arrow-drag-updater.ts` を実装し、選手およびボールのドラッグ中（`onDragMove`）にゴースト矢印終点とベジェ中間ハンドルをリアルタイム追従更新。
  - `bun run ai:check` および `rtk vitest run src/features/tactical-unified/` (360件全GREEN) を確認。

---

### Phase 3: メインキャンバス ↔ ベンチの双方向移動（#2）
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/right-panel/squad-sub-panel.tsx`
  - `src/features/tactical-unified/panels/right-panel/formation-bench-item.tsx`
  - `src/features/tactical-unified/panels/hud/context-hud.tsx`
  - `src/features/tactical-unified/core/components/hud/player-hud.tsx`
  - `src/features/tactical-unified/core/components/PlayerLayer.tsx`
  - `src/features/tactical-unified/stores/slide-player-move-slice.ts`
  - `src/features/tactical-unified/stores/slide-player-move-helper.ts`
- **Tasks**:
  - [x] 1. `squad-sub-panel.tsx` & `formation-bench-item.tsx`: ベンチの「投入（＋）」押下時、ピッチの安全な空き位置へ `area: 'pitch'` で配置
  - [x] 2. `context-hud.tsx` & `player-hud.tsx`: マーカー選択時 HUD に「ベンチへ退避」ボタンを追加
  - [x] 3. 退避アクション実行時、該当マーカーの visionCone, focus, badges, connectLines, trajectory 等の個別オプションを全自動クリア
- **Worker Handoff Log**:
  - `slide-player-move-helper.ts` に純粋関数 `findSafePitchPosition` を新設。既存ピッチ選手とのユークリッド距離を基に、チーム別探索領域（Home: 25..55, Away: 45..75, y: 20..80）から重ならない最大余裕座標（Max-Min distance）を自動算出。
  - `slide-player-move-slice.ts` の `movePlayerToPitch` で座標省略時に `findSafePitchPosition` による安全配置を自動適用。
  - `movePlayerToBench` において、`area: 'bench'` への更新時に `visionCone: undefined`, `focus: undefined`, `badges: []`, `connectLines: []`, `trajectory: undefined` を確実に全自動クリアし、関連する `arrows` および `selectedObjects` の選択状態も解除。
  - ホスト境界・4層アーキテクチャに準拠し、`core/types.ts` に `moveMarkerToBench?: (id: string) => void` を追加。`tactical-canvas-store-adapter.ts` および `canvas-store-actions.ts` でアダプター実装を提供。
  - `player-hud.tsx` に「ベンチへ退避」（アイコン: `ArrowDownToLine`）ボタンを配置し、ワンクリックでの退避と選択解除（HUDクローズ）を実現。
  - `PlayerLayer.tsx` の `handleDragEnd` において、右端（キャンバス幅外または画面右端340pxのベンチパネル領域上）へドロップされた場合に `movePlayerToBench` を自動発火する退避ドラッグを実装。
  - `tactical-unified-page.tsx` で `@dnd-kit` のタッチ・ポインタ座標計算を堅牢化。
  - 専用テスト `src/features/tactical-unified/__tests__/pitch-bench-transition.test.ts`（9件全GREEN）を作成。`bun run ai:check` および `rtk vitest run src/features/tactical-unified/` (369件全GREEN) を確認。

---

### Phase 4: TopBar メンバー維持リセット & 再生ボタン整理 & 境界線 HUD 整理（#5, #6, #7）
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/timeline/playback-controls.tsx`
  - `src/features/tactical-unified/panels/toolbar/top-bar-center.tsx`
  - `src/features/tactical-unified/core/components/BoundaryBoxHud.tsx`
  - `src/features/tactical-unified/stores/project-slice.ts`
- **Tasks**:
  - [x] 1. `playback-controls.tsx`: `RotateCcw`（再生リセット）ボタンを完全削除
  - [x] 2. `project-slice.ts`: `resetSlideKeepSquad(slideId)` を実装（メンバー維持、初期フォーメーション配置、ボール(50,50)、境界線100%、自由描画全消去）
  - [x] 3. `top-bar-center.tsx`: メンバー維持リセットボタンを配置
  - [x] 4. `BoundaryBoxHud.tsx`: プリセット比率ボタンを削除し、「全画面（100%）」と「ピッチにフィット」の2ボタンのみテキストラベル付きで残す
- **Worker Handoff Log**:
  - `playback-controls.tsx`: 再生ボタン横の `RotateCcw`（Reset to first scene）ボタンおよび関連ハンドラを完全削除。
  - `slide-reset-helpers.ts` に純粋関数 `resetSlideKeepSquadData` を実装。ピッチ・ベンチのメンバー構成（選手ID, name, shirtNo, team, position, area等）を維持したまま、ピッチ選手のみ初期フォーメーション（Home 4-2-3-1, Away 4-4-2）の規定位置 `(x, y)` に戻し、ボールを中央 `(50, 50)`、境界線を全画面（100% × 100%）、自由描画オブジェクト（arrows, zones, texts）を全消去。
  - `project-slice.ts`: `resetSlideKeepSquad(slideId?: string)` アクションを新設。ファイルサイズ制限（350行）を遵守するため `fitProjectPlayers` を `slide-reset-helpers.ts` に移管し 337行に抑制。
  - `top-bar-center.tsx`: メンバー維持型リセットボタン（アイコン: `RotateCcw`、タイトル: "配置・オブジェクトをリセット（メンバー維持）"）を新設。
  - `BoundaryBoxHud.tsx`: プリセット比率ボタン（16:9, 9:16, 4:5, 1:1）を削除し、「全画面（Full）」「ピッチフィット（Fit Pitch）」の2つのボタンのみテキストラベル付きで整理。
  - 単体テスト・結合テスト（`slide-reset-helpers.test.ts`, `tactical-unified-store.test.ts`, `top-bar-center.test.tsx`, `hud-and-editor.test.tsx`）を TDD で更新・拡充。
  - `bun run ai:check`（Biome, TypeScript, Vitest）および `rtk vitest run src/features/tactical-unified/`（全372件 GREEN）を確認。

---

### Phase 5: 全体検証 & Reviewer 4大定性監査
- **Worker Model**: `flash`
- **Tasks**:
  - [x] 1. `bun run ai:check`（Biome, TypeScript, Vitest）を実行し全件 GREEN
  - [x] 2. Reviewer による 4大定性監査（要件網羅、ホスト境界/StoreProvider/Zero-Flicker、OCP/SLAP、回帰防止）
- **Worker Handoff Log**:
  - `bun run ai:check` にて全39ファイル対象の Biome, Scoped TypeCheck, Vitest（12ファイル・113テスト）全件 exit code 0（GREEN）を確認。
  - `rtk vitest run src/features/tactical-unified/` で全372テスト全件 PASS。
  - Reviewer による4大定性監査を依頼し、全観点満点合格で LGTM を受領。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `flash`
- **Reviewed At**: 2026-10-22
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 8つの仕様（試合連携・4:5縦型スケール・幾何統一・ゴースト追従・双方向ベンチ移動・メンバー維持リセット・HUD整理・再生リセット削除）が完全実装され、テストで担保されている
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2 core にホスト依存なく、抽象コールバック注入と Konva ノード直接更新により再レンダリング・Flickerゼロを担保
  - [x] 3. 設計負債 & 拡張性 (OCP/SLAP/Shell Purity): 幾何アルゴリズムが純粋関数に分離され、Store は 337行で上限（350行）を遵守
  - [x] 4. サイレント破壊 & 既存保護: スコープ外変更なし、戦術ボード全体のテスト 372件全GREEN
- **Summary**:
  8つのユーザー合意要件が極めて高品質に実装され、4大定性監査全項目合格。文脈のズレが根本から解消されたことを確認し一発承認 LGTM。

## 6. Rejections / Additional Tasks
なし（一発承認 LGTM）
