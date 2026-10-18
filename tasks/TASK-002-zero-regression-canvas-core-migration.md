# TASK-002: 機能損失ゼロ・共通キャンバス完全移植 & 4層モデル統合

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-18
- **Target**: `src/features/tactical-unified/core/`, `extension/features/canvas/`
- **Conversation IDs (エージェントログ参照用)**:
  - Planner (Parent): `b0b1383a-b5f6-4471-b589-a8960a78b4db`
  - Phase 1 Worker: `d00ae9a2-9f95-4707-8947-1300e426370f`
  - Phase 2 Worker: `1c0c953e-0d44-4369-86c0-3236bf727b01`
  - Phase 3 Worker: `ef7996cf-047e-4380-8e0a-4ab3714f18fc`
  - Phase 4 Worker: `d08ed682-b71e-4848-ad15-3e6c5eed617e`
  - Phase 5 Worker: `6fa3a630-4d7a-493e-98d7-6c8ba5546194`
  - Phase 6 Worker: `c592aba0-5577-4df8-9fcb-1d6e0eb62225`
  - Phase 7 Worker: `cceed807-c9f0-448c-8dc2-f2f56e68b221`
  - Phase 7 Reviewer: `f80388ee-7dba-4119-bead-dd5546769518`


## 2. Requirements (要件)
<!-- Reviewerはこの要件が満たされているかを厳密に審査する -->
- [x] [要件1: 依存シンボル & 描画機能の 100% 完全維持]
  - `git show 34d00b3:src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx` に存在した全機能（パンズーム、多角形ゾーン、テキスト編集、選択HUD、ショートカット、範囲選択、ゾーン回転、波線矢印、ベジェカーブ、消しゴム、連続描画、比率スナップ）を 1 つも欠落させず完全復元する。
- [x] [要件2: 4層モデル & Store Provider パターン (Zero-Flicker)]
  - `createCanvasStore(config: CanvasConfig)` により、Web（戦術盤）と Extension（スクショ編集）で独立した Vanilla Store を生成する。
  - 初期マウント時に Props から直接データを確定注入し、Extension 起動時に 2D ピッチや 22 人の選手が一瞬も表示されない Zero-Flicker を維持する。
- [x] [要件3: 仮想キャンバス幾何計算 & Zero Black Margin]
  - `calculateVirtualCanvasRect` に基づくコンテナ内レターボックス計算（`object-fit: contain`）を維持し、画像周囲の黒マージンを 0% とする。
  - 全ての幾何操作（パンズーム、範囲選択、テキスト配置、HUDクランプ）を仮想キャンバス座標系で動作させる。
- [x] [要件4: Imperative Ref API による高DPIクロップ出力]
  - `CanvasCoreHandle`（`exportPng`, `copyToClipboard`, `undo`, `redo`, `canUndo`, `canRedo`）を `CanvasStageContainer` から `forwardRef` で提供する。
  - `boundaryBox` 有効時、仮想キャンバス座標と正確に同期した 2x スケールの高解像度クロップ画像を生成し、クリップボードおよびダウンロードを完遂する。
- [x] [要件5: ホスト依存ゼロ & 規約厳守]
  - `core/` 配下の全コードに `chrome.*` や Web 専用 DOM / ストア依存を混入させない。
  - 全コンポーネントを 200行以内、単一責任に保ち、Biome / TypeScript strict をパスする。

---

## 3. Implementation Phases (Worker 実装手順)

### Phase 1: 型定義 & Store ファクトリの完全化
- **Worker Model**: `flash`
- **対象スコープ**: `src/features/tactical-unified/core/types.ts`, `src/features/tactical-unified/core/store/`
- **契約 (Interface)**:
  ```ts
  export interface CanvasConfig {
    mode: 'screenshot-edit' | 'tactical-board';
    backgroundImageUrl?: string;
    initialAnnotations?: string;
    markerMode?: '2d-only' | '3d-only' | 'all';
    defaultBoundaryBox?: BoundaryBox;
    aspectRatio?: AspectRatio;
  }

  export interface CanvasState {
    config: CanvasConfig;
    activeTool: DrawingTool;
    continuousDrawing: boolean;
    selectedObjects: SelectedObject[];
    pitchTransform: PitchTransform;
    boundaryBox: BoundaryBox;
    annotations: AnnotationsData;
    // ...
  }

  export function createCanvasStore(config: CanvasConfig): CanvasStoreApi;
  ```
- **Testing Strategy**:
  - 対象: `src/features/tactical-unified/core/__tests__/canvas-store.test.ts`
  - ケース:
    - `screenshot-edit` モードで初期選手が 0 人であること（Zero-Flicker）
    - `eraseAtPoint` で線分・多角形・テキストが正確に消去されること
    - 連続描画フラグ `continuousDrawing` のトグルと維持
    - 全19種の `DrawingTool` が型安全に切り替わること
- **Steps**:
  - [x] 1. 失敗するテスト作成 (RED): `canvas-store.test.ts`
  - [x] 2. 最小限の実装を行う (GREEN):
    - `core/types.ts` を全スキーマ対応に拡張
    - `core/store/slices/` または `core/store/` に Annotation, Pitch, Tool, History, Clipboard アクションを完全実装
    - `createCanvasStore` で初期Props確定注入を実装
- **Phase Verification**:
  - [x] `bun run ai:check src/features/tactical-unified/core/types.ts src/features/tactical-unified/core/store/` が exit code 0 で全PASS
- **Worker Handoff Log**:
  - 確定export: `createCanvasStore`, `useCanvasStore`, `CanvasStoreProvider`, `CanvasState`, `CanvasActions`, `SelectedObject`, `CanvasClipboard`, `CanvasHistorySnapshot`
  - 注意点: 行数上限200行を維持するため消去幾何を `canvas-store-eraser.ts`、ピッチを `canvas-store-pitch.ts`、クリップボードを `canvas-store-clipboard.ts` に分割。`selectedObjects` と `selectedIds` は自動同期。

---

### Phase 2: ポインタディスパッチャ & 幾何フック群の移植
- **Worker Model**: `flash`
- **対象スコープ**: `src/features/tactical-unified/core/hooks/`
- **契約 (Interface)**:
  ```ts
  export function useCanvasPointerInteraction(options: UseCanvasPointerInteractionOptions): {
    drawingState: DrawingPreviewState | null;
    selectionBox: SelectionBox | null;
    activePolygonId: string | null;
    mousePreviewPos: { x: number; y: number } | null;
    isPitchLocked: boolean;
    isPanning: boolean;
    isSpacePressed: boolean;
    handleWheel: (e: KonvaEventObject<WheelEvent>) => void;
    handlePointerDown: (e: KonvaEventObject<PointerEvent>) => void;
    handlePointerMove: (e: KonvaEventObject<PointerEvent>) => void;
    handlePointerUp: (e: KonvaEventObject<PointerEvent>) => void;
  };
  ```
- **Testing Strategy**:
  - 対象: `src/features/tactical-unified/core/hooks/__tests__/use-canvas-pointer.test.ts`
  - ケース:
    - ホイールズーム時に `pitchTransform.zoom` がカーソル基準で拡大縮小すること
    - Space押下ドラッグで `pitchTransform.panX / panY` が平行移動すること
    - 多角形ツールでクリックごとに頂点が追加され、始点近接で閉路確定すること
    - 空白ドラッグで範囲選択矩形（SelectionBox）が拡張されること
- **Steps**:
  - [x] 1. 失敗するテスト作成 (RED)
  - [x] 2. 最小限の実装を行う (GREEN):
    - `useCanvasZoomPan`, `useCanvasPolygonZone`, `useCanvasZoneRotation`, `useCanvasSelectionBox` を仮想キャンバス座標系に対応させて `core/hooks/` へ移植
    - `useCanvasPointerInteraction` で統合ルーティング
- **Phase Verification**:
  - [x] `bun run ai:check src/features/tactical-unified/core/hooks/` が exit code 0 で全PASS
- **Worker Handoff Log**:
  - 確定export: `useCanvasPointerInteraction`, `useCanvasZoomPan`, `useCanvasPolygonZone`, `useCanvasZoneRotation`, `useCanvasSelectionBox`, `UseCanvasPointerInteractionOptions`, `CanvasPointerInteractionResult`
  - 注意点: hook 150行制限とBiome認知複雑度規約のため、ポインタイベント振り分けを `canvas-pointer-dispatcher.ts`、状態セレクタを `canvas-pointer-state.ts`、ツール生成を `canvas-pointer-tools.ts` に分割。

---

### Phase 3: オブジェクト描画レイヤーの完全移植
- **Worker Model**: `flash`
- **対象スコープ**: `src/features/tactical-unified/core/components/`
- **契約 (Interface)**:
  ```tsx
  export function AnnotationLayer(props: AnnotationLayerProps): React.ReactNode;
  export function PlayerLayer(props: PlayerLayerProps): React.ReactNode;
  export function DrawingPreviewLayer(props: DrawingPreviewLayerProps): React.ReactNode;
  ```
- **Testing Strategy**:
  - 対象: `src/features/tactical-unified/core/components/__tests__/annotation-layer.test.tsx`
  - ケース:
    - 多角形ゾーン（`shapeType: 'polygon'`）が Konva Line として正確にレンダリングされること
    - 矢印選択時にベジェ制御点ハンドルが表示され、ドラッグで形状変化すること
    - 波線矢印（`arrow_wavy`）で正弦波の頂点が描画されること
    - 3D足元リングマーカーに背番号およびチームカラーが反映されること
- **Steps**:
  - [x] 1. 失敗するテスト作成 (RED)
  - [x] 2. 最小限の実装を行う (GREEN):
    - `ZoneObject`, `ArrowObject`（ハンドル群含む）, `TextObject` を `core/components/` にホスト非依存化して移植
    - `AnnotationLayer.tsx` を差し替え
    - `PlayerLayer.tsx` を移植（2D選手および3D足元リング完全対応）
    - `DrawingPreviewLayer.tsx` で多角形プレビュー線・範囲選択枠を描画
- **Phase Verification**:
  - [x] `bun run ai:check src/features/tactical-unified/core/components/AnnotationLayer.tsx src/features/tactical-unified/core/components/PlayerLayer.tsx src/features/tactical-unified/core/components/DrawingPreviewLayer.tsx` が exit code 0 で全PASS
- **Worker Handoff Log**:
  - 確定export: `AnnotationLayer`, `PlayerLayer`, `DrawingPreviewLayer`, `ArrowObject`, `ZoneObject`, `TextObject`
  - 注意点: 1ファイル200行（上限250行）規約に従い、`annotations/`（矢印制御点・波線計算・ベジェ）と `zones/`（多角形・シェイプ・ハンドル）に責務分割。`slideId` を排除し `id` による単一ストア更新へ統一。全6テストPASS。

---

### Phase 4: HUD & インラインエディタ & ツールバーの復元
- **Worker Model**: `flash`
- **対象スコープ**: `src/features/tactical-unified/core/components/`
- **契約 (Interface)**:
  ```tsx
  export function ContextHud(props: ContextHudProps): React.ReactNode;
  export function BoundaryBoxHud(props: BoundaryBoxHudProps): React.ReactNode;
  export function PitchInlineTextEditor(props: PitchInlineTextEditorProps): React.ReactNode;
  export function CoreDrawingToolbar(props: CoreDrawingToolbarProps): React.ReactNode;
  ```
- **Testing Strategy**:
  - 対象: `src/features/tactical-unified/core/components/__tests__/hud-and-editor.test.tsx`
  - ケース:
    - 矢印・ゾーン・マーカー単一選択時に直上に `ContextHud` が表示され、色・太さ変更が反映されること
    - `BoundaryBoxHud` で 4:5 などの比率ボタン押下時に `boundaryBox` が中央スナップすること
    - テキストダブルクリックで `PitchInlineTextEditor` が開き、Enter で保存されること
    - `CoreDrawingToolbar` で全11ツール、連続描画ロック、消しゴムが切り替わること
- **Steps**:
  - [x] 1. 失敗するテスト作成 (RED)
  - [x] 2. 最小限の実装を行う (GREEN):
    - `ContextHud`（および各サブHUD）を Level 2 に移植
    - `BoundaryBoxHud` を移植し `BoundaryBoxOverlay` と連携
    - `PitchInlineTextEditor` を仮想キャンバス座標（`normToScreen`）でマウント
    - `CoreDrawingToolbar` を全11ツール・ロック・消しゴム対応に拡張
- **Phase Verification**:
  - [x] `bun run ai:check src/features/tactical-unified/core/components/` が exit code 0 で全PASS
- **Worker Handoff Log**:
  - 確定export: `ContextHud`, `BoundaryBoxHud`, `PitchInlineTextEditor`, `CoreDrawingToolbar`, `hud/*` (`ArrowHud`, `ZoneHud`, `TextHud`, `PlayerHud`, `useHudPosition`, `MiniColorPicker`)
  - 注意点: 1ファイル200行（上限250行）および hook 150行規約を遵守するため、`useHudPosition` の幾何ターゲット計算を `hud-targets.ts` に、Toolbar のツール定義を `toolbar-tools.ts` に、BoundaryBox のチルト操作を `BoundaryBoxTiltControls.tsx` に分離。全5テストPASS。

---

### Phase 5: CanvasStageContainer 統合 & Imperative Ref エクスポート完全化
- **Worker Model**: `flash`
- **対象スコープ**: `src/features/tactical-unified/core/components/CanvasStageContainer.tsx`, `src/features/tactical-unified/core/hooks/use-canvas-export.ts`
- **契約 (Interface)**:
  ```tsx
  export const CanvasStageContainer = forwardRef<CanvasCoreHandle, CanvasStageProps>(...);
  ```
- **Testing Strategy**:
  - 対象: `src/features/tactical-unified/core/components/__tests__/canvas-stage-container.test.tsx`
  - ケース:
    - `ref.current.exportPng({ crop: true })` が BoundaryBox の枠内のみを 2x 解像度で出力すること
    - `ref.current.copyToClipboard()` がエラーなく実行されること
    - キーボードショートカット（V, A, P, T, Delete, Ctrl+Z）がコンテナ上で動作すること
- **Steps**:
  - [x] 1. 失敗するテスト作成 (RED)
  - [x] 2. 最小限の実装を行う (GREEN):
    - `CanvasStageContainer` に全レイヤー、HUD、エディタ、ツールバーを統合
    - `useCanvasExport` で仮想キャンバスのレターボックスオフセットを厳密補正したピクセル完全クロップを実装
    - キーボードショートカットリスナーを接続
- **Phase Verification**:
  - [x] `bun run ai:check src/features/tactical-unified/core/components/CanvasStageContainer.tsx src/features/tactical-unified/core/hooks/use-canvas-export.ts` が exit code 0 で全PASS
- **Worker Handoff Log**:
  - 確定export: `CanvasStageContainer`, `useCanvasExport`, `useCanvasShortcuts`, `CanvasOverlays`, `dispatchCanvasShortcut`
  - 注意点: 1ファイル200行（上限250行）及び hook 150行規約を遵守するため、オーバーレイ群を `CanvasOverlays.tsx`、ショートカット判定を `canvas-shortcuts-handler.ts` に分離。全ショートカット（ツール12種、Space、Delete、Backspace、Undo/Redo、SelectAll、Escape）および 2x クロップ出力を実装し全6テストPASS。

---

### Phase 6: Extension 結合検証 & 全体ビルドゲート通過
- **Worker Model**: `flash_lite`
- **対象スコープ**: `extension/features/canvas/`, `src/features/tactical-unified/`
- **Testing Strategy**:
  - 対象: Extension 単体テスト、型検査、プロダクションビルド
  - ケース:
    - 全自動テストが PASS すること
    - Zero Flicker, Zero Black Margin が維持されていること
    - Extension ビルドがエラー 0 件で通過すること
- **Steps**:
  - [x] 1. `extension/features/canvas/components/QuickAnnotationCanvas.tsx` で刷新された Core をマウント
  - [x] 2. 既存の Extension テストの実行と検証
  - [x] 3. プロジェクト全体の型検査・Lint・ビルド確認
- **Phase Verification**:
  - [x] `bun run ai:check src/features/tactical-unified/core/ extension/features/canvas/` が exit code 0 で全PASS
  - [x] `bun run typecheck && bun run lint` が exit code 0 で全PASS
  - [x] `bun run --cwd extension compile && bun run --cwd extension build` が exit code 0 で全PASS
- **Worker Handoff Log**:
  - 確定export: `QuickAnnotationCanvas`, `QuickAnnotationCanvasProps`, `QuickAnnotationCanvasHandle`
  - 注意点: `QuickAnnotationCanvas` が刷新された `CanvasStoreProvider` および `CanvasStageContainer` に完全接続。45件の全テスト通過、Scoped TypeCheck・Lint・Extension WXT Build 全ゲート通過。

### Phase 7: ツールバー Compound Component 化 & 描画バグ修正 & マーカーオプション復元
- **Worker Model**: `flash`
- **対象スコープ**: `src/features/tactical-unified/core/`, `extension/features/canvas/`
- **遵守ルール**:
  1. コンポーネント内に `isExtension` や `process.env` 等による環境分岐を書かない（ホスト境界厳守）。
  2. [機能一覧の差分] プラグイン・レジストリ方式を採用し、`DrawingToolPlugin[]` を外側から注入する。
  3. [UIパーツの有無] Slot / Compound Component 方式を採用し、不要な側（Extension）には渡さない／組み立てない。
- **Testing Strategy**:
  - 対象: `src/features/tactical-unified/core/`, `extension/features/canvas/`
  - ケース:
    - `commitDrawingShape` で Straight Line, Route Line, Wavy Arrow, Dashed Arrow が正確な属性でコミットされること
    - 3Dマーカー生成時に背番号が空・非表示（`insideContent: 'none'`, `bottomLabel: 'none'`）であること
    - Text に縁取り（stroke）がつかないこと
    - 未選択オブジェクトのドラッグ開始時に即座に選択され、ドラッグできること
    - `DraggableToolbar` が画面外に出ないようクランプされ、Extension 側で PitchLock 等の不要パーツなしで動作すること
- **Steps**:
  - [x] 1. 描画バグ修正 & Text 縁取り削除 & 3D マーカー背番号削除 (`canvas-drawing-factory.ts`, `use-zone-polygon.ts`, `TextObject.tsx`)
  - [x] 2. オブジェクト即時ドラッグ可能化 & リアクティブ追従 (`ZoneShapeNode.tsx`, `ZonePolygonNode.tsx`, `TextObject.tsx`, `PlayerLayer.tsx`, `use-hud-position.ts`)
  - [x] 3. 3D Player Marker オプション復元 (`player-quick-actions.tsx`, `player-hud.tsx`, `PlayerLayer.tsx`)
  - [x] 4. プラグイン・レジストリ & Compound Component ツールバー構築 (`drawing-tool-plugin.ts`, `core-toolbar-icons.tsx`, `DraggableToolbar.tsx`, `ToolbarToolsGroup.tsx`, 各種アクションパーツ, `CanvasStageContainer.tsx`)
  - [x] 5. Extension (`QuickAnnotationCanvas.tsx`) への組み込み & テスト更新
- **Phase Verification**:
  - [x] `bun run ai:check src/features/tactical-unified/core/ extension/features/canvas/` が exit code 0 で全PASS (13 test files, 53 tests passed)
  - [x] `bun run --cwd extension compile && bun run --cwd extension build` が exit code 0 で全PASS
- **Worker Handoff Log**:
  - 確定export: `DraggableToolbar`, `ToolbarToolsGroup`, `ToolbarContinuousLock`, `ToolbarEraser`, `ToolbarResetButton`, `ToolbarPitchLock`, `ToolbarBoundaryBoxToggle`, `ToolbarDivider`, `EXTENSION_DRAWING_TOOLS`, `WEB_DRAWING_TOOLS`, `DRAWING_TOOLS_CORE`, `PlayerQuickActions`
  - 注意点: プラグイン・レジストリ方式および Compound Component ツールバーを導入し、Web と Extension で環境分岐（`isExtension` 等）をゼロに保ちながら機能差分とUIパーツ有無を安全に分離。全13テストファイル53テストPASS、Extension ビルド成功。全ファイル200行（最大250行）規約を厳守。

---

### Phase 8: オブジェクト追従最適化・HUD分離・ツールバー右固定・デフォルト値復元 & 3Dマーカー付属要素刷新
- **Worker Model**: `flash`
- **対象スコープ**: `src/features/tactical-unified/core/`, `extension/features/canvas/`
- **要件 & 設計方針**:
  1. **デフォルト値の復元**:
     - 矢印・ライン全般: 色 `#ffffff` (白), 太さ `3`
     - ゾーン全般: 色 `#f59e0b` (琥珀イエロー), 透明度 `0.25`
     - テキスト: 色 `#ffffff` (白), サイズ `16`
     - 3D マーカー: 色 `#3b82f6` (ブルー), リング `#ffffff`
     - コネクトライン: 色 `#38bdf8` (シアン), 太さ `2`
     - 視野コーン: 色 `#3b82f6` (ブルー)
     - スポットライト: 色 `#ffffff` (白)
     - `canvas-store.ts` の一括初期値 `#ef4444` を撤廃し、オブジェクト種別ごとの本来のデフォルト値を反映
  2. **ツールバーの右側黒帯中央固定配置**:
     - スクリーンショットの両脇にある黒い余白（レターボックス領域）の右側中央に配置
     - ドラッグハンドルおよびドラッグ可動機能を撤廃し、固定配置スタイルを採用
  3. **ドラッグ状態と選択状態の分離 & HUD 表示制御**:
     - ドラッグ中およびドラッグ直後は HUD（オプションメニュー）を表示せず、配置・移動操作に専念
     - クリック選択時（非ドラッグタップ）に初めて HUD を表示
     - HUD 表示位置はオブジェクト上部（32px 余白）を基本とし、ビューポート外にはみ出さないよう画面内にクランプ
     - ライン制御点やマーカー視野ハンドルに重なって操作を妨げない配置
  4. **3D Marker 付属要素の改善**:
     - **コネクタ（Connect Line）**: クリック選択可能化、色・太さオプション HUD の追加、マーカー移動時のリアルタイム同期
     - **視野（Vision Cone）**: 扇形に `listening={false}` を適用して誤ドラッグを防止。視野ハンドル操作時のリアルタイム変形追従（`batchDraw()`）
     - **HUD アイコン強調**: マーカー HUD 内の Vision Cone / Connect Line / Spotlight トグルボタンで、ON 時にアクティブ状態（背景色・アクセントカラー等）を明示
- **Testing Strategy**:
  - 対象: `src/features/tactical-unified/core/`, `extension/features/canvas/`
  - ケース:
    - 各ツールのデフォルト描画オブジェクトが赤ではなく復元されたデフォルト値（白・琥珀・青等）を持つこと
    - ドラッグ移動中に HUD が非表示となり、クリック選択時にのみ表示されること
    - マーカー HUD で Vision Cone / Connect Line / Spotlight の有効状態が視覚的に識別できること
    - コネクタラインが選択可能で色・太さを変更できること
    - 視野の扇形クリックでマーカー移動が誤発火しないこと
- **Steps**:
  - [x] 1. オブジェクトデフォルト値の復元 (`canvas-store.ts`, `tool-slice.ts`, `canvas-drawing-factory.ts`)
  - [x] 2. ツールバーの右側黒帯中央固定化 (`DraggableToolbar.tsx` / `FixedToolbar.tsx`, `CanvasStageContainer.tsx`, `QuickAnnotationCanvas.tsx`)
  - [x] 3. ドラッグ状態と選択状態の分離 & HUD 表示制御 (`use-hud-position.ts`, `ContextHud.tsx`, 各オブジェクトノード)
  - [x] 4. 3D Marker 付属要素のリアクティブ追従 & コネクタ選択・HUDアイコン強調 (`PlayerLayer.tsx`, `PlayerQuickActions.tsx`, `player-vision-cone.tsx`, `player-vision-cone-handles.tsx`, `player-hud.tsx`)
  - [x] 5. 単体テスト作成 & Scoped ai:check 通過 & Extension ビルド通過
- **Phase Verification**:
  - [x] `bun run ai:check src/features/tactical-unified/core/ extension/features/canvas/` が exit code 0 で全PASS
  - [x] `bun run --cwd extension compile && bun run --cwd extension build` が exit code 0 で全PASS
- **Worker Handoff Log**:
  - 確定export: `FixedToolbar`, `DraggableToolbar`, `PlayerConnectLines`, `ConnectLineHud`, `resolveHudTarget`, `useHudPosition`
  - 注意点:
    - デフォルト値の復元: 矢印・ライン(`#ffffff`, 太さ`3`)、ゾーン(`#f59e0b`, 不透明度`0.25`)、テキスト(`#ffffff`, サイズ`16`)、3Dマーカー(`#3b82f6`, リング`#ffffff`)、コネクトライン(`#38bdf8`, 太さ`2`)。一括赤色フォールバックを完全撤廃。
    - ツールバー固定配置: `DraggableToolbar` を `FixedToolbar` へ刷新し、キャンバス右側レターボックス領域中央に固定配置（CSS変数 `--toolbar-right`, `--toolbar-transform` 制御）。
    - ドラッグ中 HUD 分離: `isDragging` フラグおよび `isHudOpen` フラグをストアで管理。ドラッグ移動中は HUD を完全非表示にし、クリック選択時のみ 32px マージン・画面内クランプで表示。
    - 3Dマーカー付属要素刷新: コネクトラインを単独選択・HUD編集可能にし、ドラッグ移動中に `batchDraw()` でリアルタイム追従。Vision Cone に `listening={false}` を適用して誤ドラッグを防止し、ハンドル操作中のリアルタイム変形を実現。HUD トグルボタンの ON 状態を強調表示。
    - コード規約厳守: `PlayerConnectLines.tsx` (93行) へのロジック分離により `PlayerLayer.tsx` (216行) を 250行以下に抑え、`canvas-store.ts` (191行) も 200行以下を厳守。全14テストファイル60件テスト全PASS、Extension WXT Build 通過。

---

## 4. Reviewer Checklist & Assessment

### 4.1 Automated Gates (自動検証)
- [x] すべての Phase のチェックボックス (`- [x]`) が完了していること
- [x] `bun run ai:check src/features/tactical-unified/core/ extension/features/canvas/` が exit code 0 で全PASS (14 test files, 60 tests passed)
- [x] `bun run --cwd extension compile && bun run --cwd extension build` が exit code 0 で全PASS (WXT 0.20.27 build passed)
- [x] `bun run typecheck && bun run lint` が exit code 0 で全PASS

### 4.2 Quality & Spec Audit (仕様・品質審査)
- [x] 要件網羅性: 15 の操作シナリオ（パンズーム、多角形、テキスト編集、HUD、ショートカット、範囲選択、回転、波線、消しゴム等）が 1 つも欠落せず動作すること
- [x] 非機能要件: Zero Flicker（初期チラつきゼロ）、Zero Black Margin（余白0%）が保たれていること
- [x] 境界厳守: `core/` 内に `chrome.*` や `isExtension` 等のホスト依存・環境分岐が一切存在しないこと
- [x] 行数規約: 各コンポーネントが 200行以内（最大250行以内）であること
- [x] 追従・HUD・デフォルト値: オブジェクト追従、HUD表示分離、ツールバー右固定、デフォルト値復元、3Dマーカー付属要素が完全実装されていること

### 4.3 Reviewer Decision
- **Status**: `LGTM`
- **Reviewed At**: 2026-10-18 15:35
- **Reviewer Model**: `flash`
- **Summary**: Phase 8 におけるオブジェクト追従最適化、ドラッグ中HUD非表示＆クリック選択時HUD表示分離、ツールバー右側黒帯中央固定化、オブジェクト種別ごとのデフォルト値復元（白/琥珀/青/シアン）、コネクトライン単独選択・HUD編集＆リアルタイム追従、視野扇形誤ドラッグ防止＆ハンドルリアルタイム変形追従、HUDトグルボタンON時アクセント強調の全要件が完全実装されていることを確認しました。行数制限および自動検証ゲートも全PASSしており、LGTMとして承認します。

---

## 5. Rejections / Additional Tasks (不可逆修正欄)
- Phase 7: ブラウザ検証で判明したツールバー・描画バグ・即時ドラッグ・マーカーオプションの修正と Compound Component 化
- Phase 8: オブジェクト追従最適化・HUD分離・ツールバー右固定・デフォルト値復元 & 3Dマーカー付属要素刷新


