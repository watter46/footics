# TASK-163: ドキュメント群の最新戦術ボード仕様・データモデル同期

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-06
- **Target Files**:
  - `docs/spec/tactical-board.md` (MODIFY)
  - `docs/spec/export.md` (MODIFY)
  - `docs/data-model.md` (MODIFY)
  - `docs/app-overview.md` (MODIFY)
  - `docs/tech-stack.md` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `docs/spec/tactical-board.md` の座標系・レイヤー構造・初期比率・境界線・フォーメーション・ベンチ写真の記述が TASK-142〜161 の実装（4層単一座標系 `16:9` 固定スクリーン `0..100`、デフォルト比率 `'16:9'`、`TacticalPhase` 単位の `aspectRatio` / `boundaryBox` 管理と比率切替時の境界線不変、Full/Halfコートフォーメーション配置、ベンチ選手の顔写真マーカー、ワークスペースモード `Board` / `Layout`）に完全同期されていること
- [x] 2. `docs/spec/export.md` の静止画・動画書き出し仕様に「第1層（`16:9` 固定スクリーン 1920×1080）＋第2層（中央配置サブピッチ＋選手・描画物＋3Dカメラ `pitchTransform`）を正規描画した上で、第3層（アクティブ `TacticalPhase` の `boundaryBox`）領域をクロップ出力する（レイアウト画面とエクスポート画面の完全一致）」が明記されていること
- [x] 3. `docs/data-model.md` の型定義パス（`src/lib/types/tactical/` モジュール分割構成）、`TacticalPhase` スキーマ（`aspectRatio`, `boundaryBox` 保持）、新規プロジェクトのデフォルト値（`'16:9'`, `DEFAULT_BOUNDARY_BOX_16_9`）、および `X_MEDIA_PRESETS`（`landscape_16_9`, `portrait_4_5`, `vertical_9_16`, `square_1_1`, `pitch_fit`）が現行実装に同期されていること
- [x] 4. `docs/app-overview.md` と `docs/tech-stack.md` の戦術ボード仕様・座標変換モジュール（`pitch-geometry.ts`, `canvas-screen-coordinates.ts`, `core/utils/geometry.ts`）・ディレクトリ構成（`src/features/tactical-unified/stores/tactical-unified-store.ts` 等）が最新実装に更新されていること

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
- **Invariants (破壊禁止の不変条件と理由)**:
  1. **現時点の実装を唯一の真実（Single Source of Truth）とする**: TASK-150〜161 で確立された「4層単一座標系（`16:9` 固定スクリーン `0..100`）」「`TacticalPhase` 単位の `aspectRatio` / `boundaryBox` 独立管理」「縦向きピッチの3D二重スケーリング防止」「ベンチ選手の顔写真マーカー」を唯一の正として記述し、旧来の「初期値 `4:5`」「比率切替時の境界線自動リセット」「旧3段階座標空間」の記述を残してはならない（後続タスクで Planner / Brainstormer が旧仕様を参照して退行バグを生むのを防ぐため）。
  2. **Open Decisions および他ドメイン仕様の保護**: `docs/app-overview.md` の Open Decisions や、`docs/data-model.md` の試合データ系（`Match`, `EventRow`, `PlayerMaster` 等）の既存仕様は一切削除・改変してはならない。
- **Consumers (呼び出し元・別画面の同期確認リスト)**:
  - `.agents/rules/component-architecture.md` / `.agents/skills/react-konva/SKILL.md` — TASK-162 で同期済みの4層単一座標系・モジュール名と用語・パスが完全一致していること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
// 現行の正規型定義・幾何モジュール構成（ドキュメント記載用）
// src/lib/types/tactical/ (index.ts, primitives.ts, project.ts, slide.ts, player.ts, annotations.ts, ball.ts, formations.ts, capture.ts, factory.ts, migration.ts)
// src/lib/tactical/pitch-geometry.ts (calculatePitchRect, getScreenOuterPitchRect, getScreenPitchBounds)
// src/features/tactical-unified/core/utils/canvas-screen-coordinates.ts (DEFAULT_PITCH_PERSPECTIVE = 1200)
// src/features/tactical-unified/core/utils/geometry.ts (resolveBoundaryBoxPixelRect, pointerToNormalizedCoord, isPointInPolygon, distToSegment)
// src/features/tactical-unified/core/utils/canvas-export-primitives.ts (stageToBlob, exportPngBlob, downloadBlob)
```

### 3.2 Key Interfaces & Types
```ts
// src/lib/types/tactical/project.ts
export type TacticalPhase = {
  id: string;
  name: string;
  aspectRatio: AspectRatio;     // デフォルト '16:9'
  boundaryBox: BoundaryBox;     // デフォルト DEFAULT_BOUNDARY_BOX_16_9 (visible: false)
  slides: Slide[];
};

// src/lib/types/tactical/primitives.ts
export type XMediaPresetKey =
  | 'landscape_16_9'
  | 'portrait_4_5'
  | 'vertical_9_16'
  | 'square_1_1'
  | 'pitch_fit';
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```markdown
<!-- 4層単一座標系の記述パターン -->
1. **第1層: スクリーン外枠（`16:9` 固定・`X: 0〜100, Y: 0〜100` 単一座標系）**: 全画面（ボード・レイアウト・エクスポート）で外枠を `16:9`（1920×1080）に固定。選手・ボールは `[0, 100]` にクランプ、矢印・ゾーン・テキストは `allowOverflow: true` で範囲外配置可。
2. **第2層: 中央配置サブピッチ（`getScreenOuterPitchRect` / `getScreenPitchBounds`）**: `16:9` スクリーン中央に選択アスペクト比（`16:9`: 横向き、`4:5`・`9:16`・`1:1`: 縦向き）のピッチを内接配置し、`canvas-screen-coordinates.ts` で3D投影。
3. **第3層: フェーズ単位の境界線クロップ（`TacticalPhase.boundaryBox`）**: `aspectRatio` と独立してフェーズ単位で保持。レイアウト画面・エクスポート画面は第1層＋第2層を `16:9` で正規描画した後に `boundaryBox` 領域をクロップ出力する。
4. **第4層: フォーメーション配置と比率変換（`getFormationActualPos` / `transformCoord`）**: Full / Half コートモードと向きに応じた単一変換。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 戦術ボード仕様書 (`docs/spec/tactical-board.md`) とエクスポート仕様書 (`docs/spec/export.md`) の最新化
- **Worker Model**: `flash`
- **対象ファイル**: `docs/spec/tactical-board.md`, `docs/spec/export.md`
- **契約 (Exact Contract & Formula)**:
  1. `docs/spec/tactical-board.md`:
     - **§2（正式名称）**:
       - `1. トップバー (TopBar)`: ワークスペースモード切替（`Board`［2Dボード編集］ / `Layout`［3Dカメラ＆境界線レイアウトプレビュー］）、アスペクト比切替（`16:9`, `4:5`, `9:16`, `1:1`）、境界線プリセットメニュー（`XMediaPresetMenu`）等を反映。
       - `3. メインキャンバス (MainCanvas)` & `4. ピッチ枠 (PitchFrame)`: 第1層スクリーン外枠は常に `16:9`（`0〜100` 単一座標）固定であり、その中央にアクティブフェーズの `aspectRatio` に応じた第2層サブピッチ（`getScreenOuterPitchRect`）が内接配置されることを明記。
       - `5. 境界線 / 境界線枠 (BoundaryBox)`: `TacticalPhase` 単位で保持され、比率切替（`setAspectRatio`）によって上書きされない独立した第3層クロップ枠（プリセット: `16:9`, `4:5`, `9:16`, `1:1`, `pitch_fit`）であることを明記。
       - `10. 右パネル / ベンチキャンバス`: `Formation`（Full/Halfコートモード切替、Home/Away/Both一括設定、Swap）、`Squad`（ベンチ選手マーカーの顔写真 `Photo` 表示対応を含む）、`Pitch` / `Screen`（ピッチ外観・背景・3Dカメラ・境界線制御）の構成を反映。
     - **§3 原則3（座標変換とレイヤー構造）**:
       - 旧「3段階の座標空間（`worldToScreen` / `screenToWorld`）」の記述を廃止し、**「4層単一座標系アーキテクチャ（第1層: `16:9` 固定スクリーン `0〜100`、第2層: `pitch-geometry.ts` の `calculatePitchRect` / `getScreenOuterPitchRect` / `getScreenPitchBounds` と `canvas-screen-coordinates.ts` による3D投影、第3層: `TacticalPhase.boundaryBox` と `core/utils/geometry.ts` の `resolveBoundaryBoxPixelRect` による境界線クロップ、第4層: `getFormationActualPos` / `transformCoord` による Full/Half モード対応フォーメーション配置・比率変換）」**に更新する。
       - 選手・ボールは `16:9` スクリーン `[0, 100]` にクランプ（白線外余白は配置可）され、矢印・ゾーン・テキストは `allowOverflow: true` によりスクリーン外（`< 0` や `> 100`）にも配置可能であることを明記する。
       - レイヤー構造にて、`InteractionPreviewLayer` が `DrawingPreviewLayer.tsx` の純粋レンダラー関数（`renderDrawingPreviewNode`）を使用する構造であることを補足する。
     - **§4.1（アスペクト比・境界線）**:
       - `1. アスペクト比とピッチの向き`: 新規プロジェクト・フェーズのデフォルト比率を旧 `4:5` から **`16:9`** に修正する。`aspectRatio` と `boundaryBox` は `TacticalPhase` 単位で保持されることを明記する。
       - `4. 境界線枠（BoundaryBox）`: デフォルトは `DEFAULT_BOUNDARY_BOX_16_9`（`visible: false`）であり、トップバーの比率切替（`setAspectRatio`）はピッチ形状とオブジェクト座標変換のみを行い `boundaryBox` を変更しないこと、プリセット（`16:9`, `4:5`, `9:16`, `1:1`, `pitch_fit`）で変更可能であることを明記する。
     - **§4.4（右パネル・ベンチキャンバス）**:
       - `Formation タブ`: `Full`（フルコート）と `Half`（ハーフコート）の展開モードに応じた座標配置（TASK-156）および縦向きピッチでの横幅維持・3D二重スケーリング防止（TASK-157, 158）を反映。
       - `Squad タブ ＆ ベンチキャンバス`: ベンチキャンバス上の控え選手マーカーも、写真登録時（`insideContent === 'photo'`）はピッチ上と同様に丸型クリップされた選手顔写真（WebP）が表示されること（TASK-160）を明記。
     - **§6（実装完了履歴）**:
       - 第6項として **「6. 4層単一座標系・境界線クロップ統一・ベンチ写真表示・設計クリーンアップ（TASK-142 〜 TASK-161）」** を追記する（ワークスペース `Board`/`Layout` 整理、`16:9` 固定スクリーン単一座標系、`TacticalPhase` 単位の比率・境界線分離、レイアウト・エクスポートの `16:9` 正規描画後 `boundaryBox` クロップ完全一致、Full/Halfフォーメーション配置、縦向きピッチ3D二重スケーリング修正、ベンチメンバー顔写真マーカー、旧Konvaレイヤー・重複幾何関数の完全撤去と `canvas-export-primitives.ts` 分離）。
  2. `docs/spec/export.md`:
     - **§2（静止画・動画の書き出し）**:
       - 描画・クロップ方式として、「第1層（`16:9` 固定スクリーン 1920×1080）＋第2層（アクティブフェーズの `aspectRatio` に基づく中央配置サブピッチ＋選手・描画物＋3Dカメラ `pitchTransform`）を正規描画した上で、第3層（アクティブフェーズの `boundaryBox`）の内側領域をクロップして出力・プレビュー表示する（レイアウト画面とエクスポート画面のクロップ領域・アスペクト比が100%一致する、TASK-151〜154）」ことを明記する。
- **Testing Strategy (Concrete Test Values)**:
  - `rtk grep "デフォルト比率は \*\*`4:5`\*\*" docs/spec/tactical-board.md` が 0 件であり、`16:9` に更新されていること。
  - `bun run ai:check` が exit code 0 で PASS すること。
- **Tasks**:
  - [x] 1. `docs/spec/tactical-board.md` と `docs/spec/export.md` を更新 ➔ `bun run ai:check` PASS
- **Worker Handoff Log**:
  - `docs/spec/tactical-board.md` に 4層単一座標系（`16:9` 固定 `0..100`）、初期比率 `16:9`、`TacticalPhase` 単位の比率・境界線管理、Full/Halfフォーメーション、ベンチ写真表示、TASK-142〜161 履歴を反映。
  - `docs/spec/export.md` に第1層＋第2層描画後の `boundaryBox` クロップ出力（レイアウト画面完全一致）を反映。

---

### Phase 2: データモデル (`docs/data-model.md`)・全体概要 (`docs/app-overview.md`)・技術スタック (`docs/tech-stack.md`) の最新化
- **Worker Model**: `flash`
- **対象ファイル**: `docs/data-model.md`, `docs/app-overview.md`, `docs/tech-stack.md`
- **契約 (Exact Contract & Formula)**:
  1. `docs/data-model.md`:
     - **§1（データ保存の全体方針） & §4（戦術ボード系エンティティ冒頭）**:
       - 型定義ファイルのパス記述を旧 `src/lib/types/tactical-unified.ts（912行）` から、現行のモジュール分割構成 **`src/lib/types/tactical/`（`primitives.ts`, `project.ts`, `slide.ts`, `player.ts`, `annotations.ts`, `ball.ts`, `formations.ts`, `capture.ts`, `factory.ts`, `migration.ts`）およびバレル `src/lib/types/tactical-unified.ts`** に更新する。
     - **§4-1（`TacticalProject` & `TacticalPhase`）**:
       - `TacticalProject.aspectRatio` のデフォルトが `'16:9'`、`boundaryBox` のデフォルトが `DEFAULT_BOUNDARY_BOX_16_9`（`visible: false`）であることを明記。
       - `TacticalPhase` の型定義に `aspectRatio: AspectRatio; // デフォルト '16:9'` と `boundaryBox: BoundaryBox; // デフォルト DEFAULT_BOUNDARY_BOX_16_9` を追加する（TASK-154）。
     - **§4-3（キャンバスオブジェクトの座標系）**:
       - 「すべて `16:9` 固定スクリーン基準の正規化単一座標 `(0.0 ～ 100.0)`。選手・ボールは `[0, 100]` にクランプされ、矢印・ゾーン・テキストは範囲外配置も許容。アスペクト比変換は `getScreenPitchBounds` に基づく `transformCoord(point, fromAspect, toAspect, { clamp })` で実施」に更新する。
     - **§6（X メディア最適化 / 境界線プリセット）**:
       - 旧プリセット表（`single_image_4_5` 等）を、現行の `X_MEDIA_PRESETS`（`XMediaPresetKey`: `landscape_16_9`［16:9 ワイド］, `portrait_4_5`［4:5 縦長］, `vertical_9_16`［9:16 フル縦］, `square_1_1`［1:1 スクエア］, `pitch_fit`［ピッチにフィット］）の定義に更新する。
  2. `docs/app-overview.md`:
     - **§2-2（戦術ボード系）**: エンティティ表に `TacticalPhase`（フェーズ単位のスライド配列・アスペクト比 `aspectRatio`・境界線 `boundaryBox` を管理するフォルダ構造）を追加する。
     - **§3（主要ユースケース UC-04, UC-05）**: UC-04 に「4層単一座標系（`16:9` 固定スクリーン）、フェーズ単位の比率・境界線管理、Full/Halfフォーメーション配置、ベンチ選手顔写真マーカー」、UC-05 に「レイアウト画面と完全一致する `boundaryBox` クロップ出力」を反映する。
  3. `docs/tech-stack.md`:
     - **§1（キャンバス・グラフィクス・アニメーション）**: 座標変換の説明を「4層単一座標系（`16:9` 固定スクリーン `0〜100`、`src/lib/tactical/pitch-geometry.ts` の `calculatePitchRect` / `getScreenOuterPitchRect` / `getScreenPitchBounds`、`src/features/tactical-unified/core/utils/canvas-screen-coordinates.ts` の3D投影、`src/features/tactical-unified/core/utils/geometry.ts` の境界線・幾何計算）」に更新する。
     - **§2（ディレクトリ構成）**: `src/stores/tactical-unified-store.ts` の誤記を実際の配置（`src/features/tactical-unified/stores/tactical-unified-store.ts` および `src/features/tactical-unified/core/store/canvas-store.ts`）に合わせて修正し、`src/stores/` は `ui-store.ts` 等であることを明記する。
- **Testing Strategy (Concrete Test Values)**:
  - `rtk grep "single_image_4_5" docs/data-model.md` が 0 件であること。
  - `rtk grep "src/stores/tactical-unified-store.ts" docs/tech-stack.md` が 0 件であること。
  - `bun run ai:check` が exit code 0 で PASS すること。
- **Tasks**:
  - [x] 1. `docs/data-model.md`, `docs/app-overview.md`, `docs/tech-stack.md` を更新 ➔ `bun run ai:check` PASS
- **Worker Handoff Log**:
  - `docs/data-model.md` に型定義モジュール分割構成、`TacticalPhase` の `aspectRatio` / `boundaryBox`、`X_MEDIA_PRESETS` を同期。
  - `docs/app-overview.md` に `TacticalPhase` と UC-04/UC-05 の最新要件を同期。
  - `docs/tech-stack.md` に 4層単一座標系幾何モジュールおよび `tactical-unified-store.ts` の正確なパスを同期。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-06 12:40
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: 数式/座標/状態遷移の整合性、受入要件の全網羅、Concrete Test Values検証、ハック排除
  - [x] 2. Invariants保護 & Consumer同期: Section 2.5 の不変条件（ちゃぶ台返し防止）遵守、別画面・呼び出し元（Consumers）の更新漏れゼロ
  - [x] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 4. 設計負債 & サイレント破壊防止: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、公開シグネチャ保護、指示外変更の排除
- **Summary**:
  4層単一座標系（16:9固定 0..100）、フェーズ単位の比率・境界線管理（初期比率16:9）、レイアウト画面・エクスポート画面のクロップ出力統一、Full/Halfフォーメーション、ベンチ写真対応等の最新仕様が全5ファイル（spec 2件、data-model、app-overview、tech-stack）へ正確かつ漏れなく同期されていることを確認。他ドメイン仕様やOpen Decisionsも保護されている。

## 6. Rejections / Additional Tasks (不可逆修正欄)
