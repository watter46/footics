# ツールアーキテクチャ & プラグイン設計ガイドライン
## (Extensible Tool Architecture: 矢印ツールを例にした 4-Tier 実践例)

- **作成日時**: 2026-10-17
- **対象**: `src/features/tactical-unified/core/tools/`, `extension/features/canvas/`
- **目的**: 最も頻繁に拡張・変更される「描画ツール（矢印・線・マーカー・ゾーン等）」を題材に、4層コンポーネントモデルを適用した**保守性・拡張性に優れたプラグイン型設計（Open-Closed Principle）**の具体例を定義する。
- **制約**: 本ドキュメント作成コンテキストでは設計のみを行い、コードの変更・削除は行わない。

---

## 1. 従来の設計の何が破綻していたか？（Why Old Design Failed）

従来の戦術ボードでは、ツールが追加されるたびに以下のように **複数のファイルに `if-else` や `switch` が散らばる「密結合（アンチパターン）」** になっていた。

```
【従来の破綻構造: 1つのツール追加で5ファイル以上を修正】
1. DrawingTool 型定義に 'arrow_curved' を追加
2. drawing-tool-config.ts にアイコンとラベルを追加
3. use-canvas-pointer-interaction.ts の pointerDown/Up に if (tool === 'arrow_curved') を追加
4. drawing-preview-layer.tsx の JSX に {drawingState.tool === 'arrow_curved' && <Arrow ... />} を追加
5. annotation-layer.tsx の JSX にレンダリング判定を追加
6. drawing-toolbar.tsx に markerMode に応じたフィルタリング if 文を追加
```

### 弊害:
- **開放閉鎖原則（OCP）の完全違反**: ツールを1つ追加・変更するたびに既存のコアコード（StageやPreviewLayer）を修正するため、既存機能にデグレが発生しやすい。
- **Web と Extension の分離不能**: Extension に不要なツール（22人選手マーカー等）の描画ロジックまで強制的に読み込まれ、バンドルサイズ肥大と副作用を誘発する。

---

## 2. 4層モデルに基づく「プラグイン型ツールアーキテクチャ」

ツールを **「定義・生成インタラクション・プレビュー描画・確定オブジェクト描画」を1つにカプセル化した自律的プラグイン（Strategy Pattern）** として再定義する。

```
┌────────────────────────────────────────────────────────────────────────┐
│ Level 4: Application Shell (画面・ホスト固有)                          │
│  - Web と Extension で有効にする「ツールセット（Tool Preset）」を選択 │
│  - Web: FULL_TACTICAL_TOOLS (全ツール + 2D選手 + ボール)               │
│  - Extension: EXTENSION_QUICK_TOOLS (矢印3種 + 3Dリング + テキスト等)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Level 3: Feature View (機能コンテナ / Tool Context)                    │
│  - ToolRegistryProvider: 有効化されたツール定義群を管理                │
│  - activeTool の切替、ショートカットキーの購読                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Level 2: Domain UI Block & Tool Plugin (ツールプラグインとUIブロック)  │
│  - SolidArrowPlugin / DashedArrowPlugin / WavyArrowPlugin              │
│    (各矢印ツールが「メタデータ・プレビュー・確定オブジェクト」を自律保持)│
│  - CoreDrawingToolbar: レジストリのツール一覧をループして動的描画      │
│  - DynamicPreviewLayer: activeTool のプレビューコンポーネントを動的描画│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Level 1: Pure Headless / Primitive (基盤部品・幾何計算)                │
│  - calculateArrowGeometry (始点・終点から矢印ヘッド角度や線を計算)     │
│  - getWavyPoints (波線の頂点座標計算)                                  │
│  - useTwoPointDrag (始点・終点ドラッグ生成の汎用カスタムフック)        │
│  - ToolButton (ツールバー用ボタンプリミティブ)                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 具体的な設計コード例: 矢印ツール (`SolidArrowPlugin`)

### 3.1 ツールプラグインのインターフェース契約 (`CanvasToolPlugin`)

```ts
// src/features/tactical-unified/core/tools/types.ts

export type ToolCategory = 'annotation' | 'player-2d' | 'player-3d' | 'system';

export interface DragPreviewProps {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export interface CanvasToolPlugin<TObject = unknown> {
  // ── 1. メタデータ (Level 2) ──
  id: string; // 'arrow_solid'
  label: string; // 'Solid Arrow'
  icon: React.ElementType; // MoveRight
  shortcutKey?: string; // 'A'
  category: ToolCategory;

  // ── 2. 生成インタラクション (Level 2 / 1) ──
  interactionType: 'two-point-drag' | 'click' | 'polygon';

  /** ドラッグ完了時にストアに保存する確定データを作成する */
  createObject: (
    startNorm: { x: number; y: number },
    endNorm: { x: number; y: number },
  ) => TObject;

  // ── 3. Konva プレビュー描画 (Level 2) ──
  PreviewComponent: React.FC<DragPreviewProps>;

  // ── 4. Konva 確定オブジェクト描画 (Level 2) ──
  RenderComponent: React.FC<{
    object: TObject;
    isSelected: boolean;
    onSelect: (multiSelect?: boolean) => void;
    onUpdate: (patch: Partial<TObject>) => void;
  }>;
}
```

---

### 3.2 実装例: `SolidArrowPlugin.tsx` (実線矢印ツール)

矢印に関するすべての関心事が **この1ファイル（約100行）に完全にカプセル化** される。

```tsx
// src/features/tactical-unified/core/tools/plugins/solid-arrow-tool.tsx
import React from 'react';
import { Arrow } from 'react-konva';
import { MoveRight } from 'lucide-react';
import type { CanvasToolPlugin } from '../types';
import type { TacticalArrow } from '@/lib/types/tactical-unified';
import { ArrowObject } from '@/features/tactical-unified/objects/canvas/components/annotations/arrow-object';

export const SolidArrowPlugin: CanvasToolPlugin<TacticalArrow> = {
  id: 'arrow_solid',
  label: 'Solid Arrow (A)',
  icon: MoveRight,
  shortcutKey: 'a',
  category: 'annotation',
  interactionType: 'two-point-drag',

  // 確定データの生成
  createObject: (startNorm, endNorm) => ({
    id: `arrow-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: 'straight',
    style: 'solid',
    color: '#38bdf8',
    strokeWidth: 3,
    startNorm,
    endNorm,
    headType: 'normal',
  }),

  // ドラッグ中の Konva プレビュー描画
  PreviewComponent: ({ startX, startY, currentX, currentY }) => (
    <Arrow
      points={[startX, startY, currentX, currentY]}
      stroke="#38bdf8"
      fill="#38bdf8"
      strokeWidth={3}
      pointerLength={14}
      pointerWidth={14}
      opacity={0.85}
      listening={false}
      perfectDrawEnabled={false}
    />
  ),

  // 配置後の Konva 確定描画
  RenderComponent: ({ object, isSelected, onSelect, onUpdate }) => (
    <ArrowObject
      arrow={object}
      isSelected={isSelected}
      onSelect={onSelect}
      onUpdate={onUpdate}
    />
  ),
};
```

---

### 3.3 レシーバー側の実装（`if` 文が完全に消える）

#### ① ツールバー (`CoreDrawingToolbar.tsx`)
ツールバーは渡されたツール配列を `map` で回すだけ。ハードコードされたボタンや `if (markerMode)` は不要。

```tsx
export function CoreDrawingToolbar({ tools }: { tools: CanvasToolPlugin[] }) {
  const { activeTool, setActiveTool } = useCanvasStore();

  return (
    <div className="flex flex-col gap-1 p-1.5 bg-black/85 backdrop-blur rounded-xl border border-white/15">
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;
        return (
          <ToolButton
            key={tool.id}
            active={isActive}
            onClick={() => setActiveTool(tool.id)}
            title={`${tool.label}${tool.shortcutKey ? ` (${tool.shortcutKey.toUpperCase()})` : ''}`}
          >
            <Icon size={16} />
          </ToolButton>
        );
      })}
    </div>
  );
}
```

#### ② 描画中プレビュー (`DynamicDrawingPreviewLayer.tsx`)
プレビューレイヤーは `activeTool` に合致するプラグインの `PreviewComponent` を動的に呼び出すだけ。巨大な `switch / if` は消滅。

```tsx
export function DynamicDrawingPreviewLayer({
  tools,
  drawingState,
}: {
  tools: CanvasToolPlugin[];
  drawingState: DrawingState | null;
}) {
  if (!drawingState?.isDrawing) return null;

  const currentPlugin = tools.find((t) => t.id === drawingState.toolId);
  if (!currentPlugin) return null;

  const Preview = currentPlugin.PreviewComponent;
  return (
    <Preview
      startX={drawingState.startX}
      startY={drawingState.startY}
      currentX={drawingState.currentX}
      currentY={drawingState.currentY}
    />
  );
}
```

---

## 4. 拡張性の実証: 新しい矢印を追加する手順

たとえば将来、ユーザーから**「曲がるベジェ矢印（`arrow_curved`）」**を追加してほしいと要求された場合：

```
【新しい矢印を追加する手順（変更箇所は実質1箇所のみ）】

Step 1: 新規ファイル作成
        src/features/tactical-unified/core/tools/plugins/curved-arrow-tool.tsx を作成。
        CanvasToolPlugin<TacticalArrow> に従って PreviewComponent と createObject を定義。

Step 2: ツールセット配列に追加
        Web や Extension のツール定義配列（tools.ts）に CurvedArrowPlugin を追加。

以上で完了。
Stage も、PreviewLayer も、Toolbar も、PointerInteraction も 1行も触る必要がない。
```

---

## 5. Web と Extension の構成差分（ホスト境界の実現）

ホストアプリ側（Level 4 / Level 3）で、利用するツール配列を注入するだけで、Web と Extension のツールセットを完全に切り分けられる。

```ts
// Extension 向けツールセット（不要な選手11人やボールを一切含まない）
export const EXTENSION_CANVAS_TOOLS: CanvasToolPlugin[] = [
  SelectToolPlugin,
  SolidArrowPlugin,
  DashedArrowPlugin,
  WavyArrowPlugin,
  FootRingMarkerPlugin, // 3D足元リングマーカー
  TacticalTextPlugin,
  EraserToolPlugin,
];

// Web 戦術盤向けツールセット（全機能フルセット）
export const WEB_TACTICAL_TOOLS: CanvasToolPlugin[] = [
  SelectToolPlugin,
  SolidArrowPlugin,
  DashedArrowPlugin,
  WavyArrowPlugin,
  PlayerMarker2DPlugin, // 2Dサッカー選手
  TacticalBallPlugin,   // サッカーボール
  ZonePlugin,           // ゾーン
  TacticalTextPlugin,
  EraserToolPlugin,
];
```

---

## 6. この設計がもたらすメリットまとめ

1. **バグ・デグレの根絶 (Open-Closed Principle)**:
   - 新しい矢印やマーカーを追加・修正しても、既存の描画ロジックやツールバーのコードに一切影響を与えない。
2. **Web と Extension の完全なクリーン共有**:
   - Extension には「矢印・テキスト・リング」だけを渡し、Web には「選手・ボール」を含めたフルセットを渡す。2重管理なしで、互いに干渉しない。
3. **テストが圧倒的に簡単**:
   - `SolidArrowPlugin` の単体テストを書くだけで、矢印の生成データやプレビューが正しく動くかを 100% 検証できる。巨大な Stage の E2E テストに頼る必要がない。
4. **認知負荷の最小化**:
   - 矢印にバグが出た時は `solid-arrow-tool.tsx` だけを見れば良い。コード探索の時間が 1/5 に削減される。

---

## 7. オプション追加の容易性（Schema-Driven & Composable Options）

### 7.1 従来のオプション（プロパティ）管理の病巣
従来は「矢印の色や太さを変えたい」場合、以下の2箇所に全く同じUIが二重にハードコードされていました：
1. Web 専用の右サイドパネル: `src/features/tactical-unified/panels/inspector/arrow-inspector.tsx`
2. キャンバス上の浮動 HUD: `src/features/tactical-unified/panels/hud/arrow-hud.tsx`

これにより、「矢印に新しいオプション（例: 両方向ヘッド、テキストラベル、点滅アニメーション）を追加したい」となった場合、Inspector と HUD の両方を手動で改修し、ストアを拡張する必要があり、破綻していました。

### 7.2 プラグイン自己申告型オプション（Self-Declaring Options）

新設計では、**「どのようなオプションを持ち、どんなUIで編集させるか」もプラグイン自身が定義**します。

```tsx
// CanvasToolPlugin インターフェースの拡張
export interface CanvasToolPlugin<TObject = unknown> {
  // ... (id, label, icon, createObject, PreviewComponent, RenderComponent)

  /** オブジェクト選択時、またはツール選択時に表示するオプション設定UI */
  OptionsComponent?: React.FC<{
    target: TObject;
    onUpdate: (patch: Partial<TObject>) => void;
    layout?: 'compact' | 'expanded'; // 'compact' = Extension HUD, 'expanded' = Web Inspector
  }>;
}
```

### 7.3 実装例: `SolidArrowPlugin` でのオプションコンポーネント

```tsx
export const SolidArrowPlugin: CanvasToolPlugin<TacticalArrow> = {
  // ...
  OptionsComponent: ({ target, onUpdate, layout = 'compact' }) => {
    return (
      <div className={layout === 'compact' ? 'flex items-center gap-1.5' : 'flex flex-col gap-3'}>
        {/* 色パレット (Level 1 共通部品) */}
        <ColorPalettePicker
          value={target.color}
          onChange={(color) => onUpdate({ color })}
        />

        {/* 太さセレクタ (Level 1 共通部品) */}
        <StrokeWidthSelector
          value={target.strokeWidth}
          onChange={(strokeWidth) => onUpdate({ strokeWidth })}
        />

        {/* 先端形状セレクタ (通常 / 両方向 / T字) */}
        <ArrowHeadSelector
          value={target.headType}
          onChange={(headType) => onUpdate({ headType })}
        />
      </div>
    );
  },
};
```

### 7.4 ホスト側のスロット（自動展開）

Web 本体の右パネルも、Extension のフローティングバー（HUD）も、選択されたオブジェクトのプラグインから `OptionsComponent` を取り出してスロットに嵌め込むだけになります。

```tsx
// Web の Inspector パネル
export function UniversalInspector({ selectedObject, plugin }: InspectorProps) {
  if (!selectedObject || !plugin?.OptionsComponent) return null;
  const Options = plugin.OptionsComponent;
  return (
    <div className="p-4 bg-zinc-900 border-l border-zinc-800">
      <h3 className="text-sm font-semibold">{plugin.label} 設定</h3>
      <Options target={selectedObject} onUpdate={...} layout="expanded" />
    </div>
  );
}

// Extension のフローティングコンテキスト HUD (Figma風)
export function FloatingContextHud({ selectedObject, plugin, position }: HudProps) {
  if (!selectedObject || !plugin?.OptionsComponent) return null;
  const Options = plugin.OptionsComponent;
  return (
    <div style={{ left: position.x, top: position.y }} className="absolute z-30 p-1.5 bg-black/90 backdrop-blur rounded-lg border border-white/15 shadow-xl">
      <Options target={selectedObject} onUpdate={...} layout="compact" />
    </div>
  );
}
```

### 7.5 新しいオプションを追加する時のウォークスルー（ゼロ侵入拡張）

たとえば、「矢印にテキストラベル（注記）を乗せるオプション（`label?: string`）」を追加したい場合：

1. **型にフィールド追加**: `TacticalArrow` に `label?: string` を追加。
2. **`SolidArrowPlugin.OptionsComponent` に入力欄を追加**:
   ```tsx
   <TextInput
     placeholder="Label..."
     value={target.label ?? ''}
     onChange={(val) => onUpdate({ label: val })}
   />
   ```
3. **`SolidArrowPlugin.RenderComponent` で文字を描画**:
   ```tsx
   {target.label && <Text text={target.label} x={midX} y={midY} ... />}
   ```

**完了。**
- Web の右パネル（Inspector）にも、Extension のフローティング HUD にも、自動的にテキスト入力欄が表示されます。
- 他のツール（ゾーン、選手、テキスト等）や、コアの Stage、ストアには **1行の変更も加える必要がありません**。
- これが「プラグイン型オプション設計」の最大の強みです。

