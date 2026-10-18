# TASK-002: 機能損失ゼロ・共通キャンバス完全移植 & 4層モデル統合

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-18
- **Target**: `src/features/tactical-unified/core/`, `extension/features/canvas/`

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

---

## 4. Reviewer Checklist & Assessment

### 4.1 Automated Gates (自動検証)
- [x] すべての Phase のチェックボックス (`- [x]`) が完了していること
- [x] `bun run ai:check src/features/tactical-unified/core/ extension/features/canvas/` が exit code 0 で全PASS (11 test files, 45 tests passed)
- [x] `bun run --cwd extension typecheck && bun run --cwd extension build` が exit code 0 で全PASS (WXT 0.20.27 build passed)

### 4.2 Quality & Spec Audit (仕様・品質審査)
- [x] 要件網羅性: 15 の操作シナリオ（パンズーム、多角形、テキスト編集、HUD、ショートカット、範囲選択、回転、波線、消しゴム等）が 1 つも欠落せず動作すること
- [x] 非機能要件: Zero Flicker（初期チラつきゼロ）、Zero Black Margin（余白0%）が保たれていること
- [x] 境界厳守: `core/` 内に `chrome.*` 等のホスト依存が一切存在しないこと
- [x] 行数規約: 各コンポーネントが 200行以内（最大250行以内）であること

### 4.3 Reviewer Decision
- **Status**: `LGTM`
- **Reviewed At**: 2026-10-18 11:32
- **Reviewer Model**: `flash`
- **Summary**: 
  - 要件1〜5の全項目が完全に達成されていることを確認しました。
  - `bun run ai:reviewer:check`（Biome check, Scoped type check, Vitest related, depcruise）および `bun run ai:check`、Extension typecheck & build、全体 typecheck & lint の全自動検証ゲートを exit code 0 でクリア。
  - レイヤー構造（Level 2: `tactical-unified/core/`）内に `chrome.*` や Web 専用依存は混入しておらず、依存ルールも完全に準拠。
  - `createCanvasStore` および `CanvasStoreProvider` による初期 Props 確定注入による Zero Flicker、仮想キャンバス座標系レターボックス計算による Zero Black Margin、Imperative Ref API 高DPIクロップ出力が確実に機能しています。
  - コード行数規約（250行未満）もすべての本番ファイルで達成されています。LGTMと判定します。

---

## 5. Rejections / Additional Tasks (不可逆修正欄)
