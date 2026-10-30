# TASK-114: 作図ツール・図形要素の自律プラグイン化（OCP準拠レジストリ統合）

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-30
- **Target Files**:
  - `src/features/tactical-unified/core/components/toolbar/drawing-tool-plugin.ts` (MODIFY)
  - `src/features/tactical-unified/core/hooks/use-canvas-shortcuts.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/drawing-tool-config.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/toolbar/__tests__/toolbar.test.tsx` (MODIFY)
  - `src/features/tactical-unified/core/utils/canvas-drawing-factory.ts` (MODIFY)
  - `src/features/tactical-unified/core/utils/canvas-pointer-tools.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/DrawingPreviewLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/utils/__tests__/canvas-drawing-factory.test.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/hud/hud-targets.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/ContextHud.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/AnnotationLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/__tests__/context-hud-extra.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. `drawing-tool-plugin.ts` にツール定義台帳（`shortcutKey`, `visibility`, `registerDrawingToolPlugin`, `getToolShortcutMap`）を構築し、`getDrawingTools(markerMode)`・`use-canvas-shortcuts.ts`・`use-keyboard-shortcuts.ts`・`drawing-tool-config.ts` の重複定義と条件分岐を台帳駆動に置換すること。
- [x] 2. `use-keyboard-shortcuts.ts` 内のロック判定（`obj.kind` ごとの `if` 分岐）をオブジェクト種別キーマップ駆動に置換すること。
- [x] 3. `canvas-drawing-factory.ts` に作図振る舞い台帳（`DrawingToolBehavior`, `registerDrawingToolBehavior`, `getDrawingToolBehavior`, `resolveToolPreviewColor`）を新設し、`commitDrawingShape` と `canvas-pointer-tools.ts` の `handleToolPointerDown` からツール名別の `if / else if` 分岐を排除すること。
- [x] 4. `DrawingPreviewLayer.tsx` にプレビュー種別レジストリ駆動の `renderDrawingPreviewNode` を実装し、`DrawingPreviewLayer.tsx` と `InteractionPreviewLayer.tsx` の重複プレビュー分岐（`dp.tool === ...`）を共通化して撤去すること。
- [x] 5. `hud-targets.ts`（`registerHudTargetResolver`）、`ContextHud.tsx`（`registerHudContentRenderer`）、`AnnotationLayer.tsx`（`ANNOTATION_LAYER_RENDERERS`）をレジストリ駆動に置換し、`selected.kind` ごとのハードコード `if / &&` 分岐を排除すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import type {
  ArrowAnnotation,
  DrawingTool,
  Player,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import type {
  DrawingPreviewState,
  SelectedObject,
  SelectedObjectKind,
} from '@/features/tactical-unified/core/types';
```

### 3.2 Key Interfaces & Types
```ts
// Phase 1: src/features/tactical-unified/core/components/toolbar/drawing-tool-plugin.ts
export type ToolVisibility = 'core' | '2d-marker' | '3d-marker' | 'shortcut-only';

export interface DrawingToolPlugin {
  id: DrawingTool;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  shortcutKey?: string;
  visibility?: ToolVisibility;
}
export function registerDrawingToolPlugin(plugin: DrawingToolPlugin): void;
export function getToolShortcutMap(): Record<string, DrawingTool>;

// Phase 2: src/features/tactical-unified/core/utils/canvas-drawing-factory.ts
export type PreviewShapeKind =
  | 'line'
  | 'route_line'
  | 'arrow_solid'
  | 'arrow_dash'
  | 'arrow_wavy'
  | 'zone_rect'
  | 'zone_ellipse';

export interface DrawingToolBehavior {
  interactionKind: 'drag-shape' | 'point-place' | 'eraser';
  previewKind?: PreviewShapeKind;
  defaultPreviewColor?: string;
  commitDrag?: (
    preview: DrawingPreviewState,
    color: string,
    strokeWidth: number,
    actions: {
      addArrow: (a: ArrowAnnotation) => void;
      addZone: (z: ZoneAnnotation) => void;
    },
  ) => void;
  placePoint?: (
    normPos: { x: number; y: number },
    ctx: {
      color?: string;
      markersCount: number;
      addText: (t: TextAnnotation) => void;
      addMarker: (m: Player) => void;
      onStartEditText?: (textId: string) => void;
    },
  ) => void;
}
export function registerDrawingToolBehavior(
  tool: string,
  behavior: DrawingToolBehavior,
): void;
export function getDrawingToolBehavior(
  tool: string,
): DrawingToolBehavior | undefined;
export function resolveToolPreviewColor(tool: string, userColor?: string): string;

// Phase 3: src/features/tactical-unified/core/components/hud/hud-targets.ts & ContextHud.tsx
export type HudTargetResolver = (ctx: {
  selected: SelectedObject;
  offset: HudOffsetRect;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  data: {
    markers: Player[];
    arrows: ArrowAnnotation[];
    zones: ZoneAnnotation[];
    texts: TextAnnotation[];
  };
}) => HudTarget | null;
export function registerHudTargetResolver(
  kind: SelectedObjectKind,
  resolver: HudTargetResolver,
): void;

export type HudContentRenderer = (selected: SelectedObject) => React.ReactNode;
export function registerHudContentRenderer(
  kind: SelectedObjectKind,
  renderer: HudContentRenderer,
): void;
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// 1. ショートカット互換性維持:
//    既存の canvas-stage-container.test.tsx 等で 'z' -> 'zone_circle', 'e' -> 'eraser' が検証されている。
//    getToolShortcutMap() は v:'select', l:'line', r:'route_line', a:'arrow_solid', d:'arrow_dash',
//    w:'arrow_wavy', z:'zone_circle', p:'polygon_zone', t:'text', m:'player', o:'player-ring', e:'eraser' を返すこと。
// 2. getDrawingTools(markerMode) のフィルタ仕様:
//    - '2d-only' (既定): visibility === 'core' のみ
//    - '3d-only': visibility === 'core' || visibility === '3d-marker'
//    - 'all': visibility === 'core' || visibility === '2d-marker' || visibility === '3d-marker'
// 3. Level 2 ホスト境界厳守:
//    core/ 配下のファイルには Web 専用ストアや chrome.* を一切 import しないこと。
// 4. Phase 1 / Phase 2 / Phase 3 は対象ファイルが完全に独立しているため、3 Worker 並列実行が可能。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: ツール定義台帳（DrawingToolPlugin）とショートカット・ツールバーの統合
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/core/components/toolbar/drawing-tool-plugin.ts`
  - `src/features/tactical-unified/core/hooks/use-canvas-shortcuts.ts`
  - `src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts`
  - `src/features/tactical-unified/panels/toolbar/drawing-tool-config.ts`
  - `src/features/tactical-unified/core/components/toolbar/__tests__/toolbar.test.tsx`
- **契約 (Interface)**:
  - `drawing-tool-plugin.ts` に `shortcutKey`, `visibility`, `registerDrawingToolPlugin`, `getToolShortcutMap` を追加し、`getDrawingTools(markerMode)` を登録配列の `visibility` フィルタ駆動にする。
  - `use-canvas-shortcuts.ts` と `use-keyboard-shortcuts.ts` の `TOOL_KEYS` 定数を廃止し、`getToolShortcutMap()` を使用する。
  - `use-keyboard-shortcuts.ts` の `hasLockedObject` 判定を `Record<string, 'players' | 'arrows' | 'zones' | 'texts'>` マップ参照に置き換える。
  - `drawing-tool-config.ts` の `PRIMARY_TOOLS` を `getDrawingTools('all')` から導出する。
- **Testing Strategy**:
  - `src/features/tactical-unified/core/components/toolbar/__tests__/toolbar.test.tsx` に `registerDrawingToolPlugin` と `getToolShortcutMap` の単体テストを追加し、`use-canvas-shortcuts.test.tsx` および `use-keyboard-shortcuts.test.ts` が PASS することを確認する。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/core/components/toolbar/__tests__/toolbar.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/core/components/toolbar/drawing-tool-plugin.ts src/features/tactical-unified/core/hooks/use-canvas-shortcuts.ts src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts src/features/tactical-unified/panels/toolbar/drawing-tool-config.ts src/features/tactical-unified/core/components/toolbar/__tests__/toolbar.test.tsx` PASS
- **Worker Handoff Log**:
  - `ToolVisibility`, `registerDrawingToolPlugin`, `getToolShortcutMap`, `drawingToolPlugins` を export。
  - ショートカットマップは 'z' -> 'zone_circle', 'e' -> 'eraser' を含め全12キー完全互換を担保。

### Phase 2: 作図操作・形状コミット・プレビュー描画のプラグイン台帳化
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/core/utils/canvas-drawing-factory.ts`
  - `src/features/tactical-unified/core/utils/canvas-pointer-tools.ts`
  - `src/features/tactical-unified/core/components/DrawingPreviewLayer.tsx`
  - `src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx`
  - `src/features/tactical-unified/core/utils/__tests__/canvas-drawing-factory.test.ts`
- **契約 (Interface)**:
  - `canvas-drawing-factory.ts` に `DrawingToolBehavior` レジストリ（`registerDrawingToolBehavior`, `getDrawingToolBehavior`, `resolveToolPreviewColor`, `getDragShapeToolIds`）を実装し、`commitDrawingShape` をレジストリ委譲にする。
  - `canvas-pointer-tools.ts` の `SHAPE_TOOLS` と `handleToolPointerDown` を `getDrawingToolBehavior(activeTool)` 駆動に置換する。
  - `DrawingPreviewLayer.tsx` に `PREVIEW_SHAPE_RENDERERS` マップ駆動の `renderDrawingPreviewNode(dp, width, height, color, strokeWidth)` を export し、`DrawingPreviewLayer.tsx` と `InteractionPreviewLayer.tsx` の双方から呼び出して重複 JSX 分岐を削除する。
- **Testing Strategy**:
  - `src/features/tactical-unified/core/utils/__tests__/canvas-drawing-factory.test.ts` に `registerDrawingToolBehavior`・`resolveToolPreviewColor`・カスタムツール登録時の `commitDrawingShape` 動作検証テストを追加する。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/core/utils/__tests__/canvas-drawing-factory.test.ts` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/core/utils/canvas-drawing-factory.ts src/features/tactical-unified/core/utils/canvas-pointer-tools.ts src/features/tactical-unified/core/components/DrawingPreviewLayer.tsx src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx src/features/tactical-unified/core/utils/__tests__/canvas-drawing-factory.test.ts` PASS
- **Worker Handoff Log**:
  - 確定export: `PreviewShapeKind`, `DrawingToolBehavior`, `registerDrawingToolBehavior`, `getDrawingToolBehavior`, `getDragShapeToolIds`, `resolveToolPreviewColor`, `renderDrawingPreviewNode`, `PREVIEW_SHAPE_RENDERERS`
  - `canvas-drawing-factory.ts` はファイルサイズ上限（<=300行）を厳守するためタプル・テーブル駆動でデフォルト登録を共通化。`DrawingPreviewLayer` と `InteractionPreviewLayer` の重複描画JSXを `renderDrawingPreviewNode` に集約完了。

### Phase 3: 図形オブジェクト種別（HUD・ターゲット解決・AnnotationLayer）のレジストリ駆動化
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/core/components/hud/hud-targets.ts`
  - `src/features/tactical-unified/core/components/ContextHud.tsx`
  - `src/features/tactical-unified/core/components/AnnotationLayer.tsx`
  - `src/features/tactical-unified/core/components/__tests__/context-hud-extra.test.tsx`
- **契約 (Interface)**:
  - `hud-targets.ts` に `registerHudTargetResolver` と `HUD_TARGET_RESOLVERS` を実装し、`resolveHudTarget` の `if (selected.kind === ...)` 分岐をレジストリ検索に置換する。
  - `ContextHud.tsx` に `registerHudContentRenderer` と `HUD_CONTENT_RENDERERS` を実装し、`selected.kind === ...` の JSX 分岐をレジストリ検索に置換する。
  - `AnnotationLayer.tsx` に `ANNOTATION_LAYER_RENDERERS` 定義リストを導入し、種別ごとの描画ループを宣言的構造に整理する。
- **Testing Strategy**:
  - `src/features/tactical-unified/core/components/__tests__/context-hud-extra.test.tsx` に `registerHudTargetResolver` および `registerHudContentRenderer` によるプラグイン登録の単体テストを追加する。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/core/components/__tests__/context-hud-extra.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/core/components/hud/hud-targets.ts src/features/tactical-unified/core/components/ContextHud.tsx src/features/tactical-unified/core/components/AnnotationLayer.tsx src/features/tactical-unified/core/components/__tests__/context-hud-extra.test.tsx` PASS
- **Worker Handoff Log**:
  - export: `HudTargetResolver`, `HUD_TARGET_RESOLVERS`, `registerHudTargetResolver` (`hud-targets`), `HudContentRenderer`, `HUD_CONTENT_RENDERERS`, `registerHudContentRenderer` (`ContextHud`), `ANNOTATION_LAYER_RENDERERS` (`AnnotationLayer`)
  - 注意点: `resolveHudTarget` と `ContextHud` は Map レジストリを介してカスタム種別を描画可能。`AnnotationLayer` は各図形種別レンダラー配列をイテレート描画。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-30 11:45
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  作図ツール定義・振る舞い・プレビュー描画・HUD・ターゲット解決の全レイヤーでOCP準拠のレジストリ化が完遂。条件分岐・重複定義が排除され、ホスト境界とファイルサイズ制約（<=250行）も厳守されている。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
