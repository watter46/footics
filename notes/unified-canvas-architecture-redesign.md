# Footics & Extension 共通キャンバス アーキテクチャ再設計仕様書
## (Composable Annotation Architecture & Zero-Side-Effect Design)

- **作成日時**: 2026-10-17
- **対象**: `src/features/tactical-unified/`, `extension/features/canvas/`
- **目的**: Footics Web App（戦術分析ボード）と Footics Chrome Extension（動画スクショ クイック編集）で同一のアノテーション描画コンポーネントを2重管理なしで共有しつつ、チラつき・黒マージン・比率崩れ等の副作用を根本根絶する新アーキテクチャの定義。
- **制約**: 本ドキュメント作成コンテキストでは設計のみを行い、コードの変更・削除は行わない。本仕様書に基づき別コンテキストでリファクタリングを実施する。

---

## 1. 課題の本質と根本原因の徹底分析 (Failure Analysis)

### 1.1 なぜ TASK-001 の共通化は失敗しバグが多発したのか？

TASK-001 では「コードの2重管理を排除する」という目的のもと、Footics 本体の `UnifiedCanvas` を Extension にそのまま持ち込んだ。
しかし、Footics 本体の `UnifiedCanvas` は **「サッカー戦術盤（22人の選手、フォーメーション、複数スライド、タイムライン、ピッチ線、チルト）」に極度に特化した一枚岩の God Component** であった。
これをそのまま Extension にマウントしたため、以下の致命的な副作用と不整合が爆発した。

```
【現状の破綻構造】
┌─────────────────────────────────────────────────────────────┐
│ useTacticalUnifiedStore (グローバル単一シングルトン)            │
│  - 初期値: 4:5ピッチ, ホーム11人+アウェイ11人(合計22人), ボール │
└──────────────────────────────┬──────────────────────────────┘
                               │ (強制マウント)
┌──────────────────────────────▼──────────────────────────────┐
│ UnifiedCanvas (God Component, 397行)                        │
│  ├─ PitchBackgroundDom (DOMピッチ, 常時描画)                 │
│  ├─ PitchBackground (Konvaピッチ, 周囲2%余白ハードコード)      │
│  ├─ PlayerLayer (22人選手描画, 右パネル/インスペクタ依存)     │
│  ├─ BallObject (サッカーボール描画)                          │
│  ├─ AnnotationLayer (矢印, ゾーン, テキスト)                 │
│  ├─ BoundaryBoxHud (浮動比率HUD: TopBarと機能重複)           │
│  └─ useCanvasEventListeners (window.dispatchEvent結合)       │
└─────────────────────────────────────────────────────────────┘
  ▲ Extension (YouTubeスクショ編集) にとって不要・有害な要素が9割
```

### 1.2 検出された具体的な病巣一覧

| # | 病巣 (Symptom) | 根本原因 (Root Cause) | 影響・副作用 |
|:--|:---|:---|:---|
| **1** | **初期ロード時のチラつき (Flicker)** | `useTacticalUnifiedStore` の初期値（`INITIAL_PROJECT`）に22人の選手とピッチ背景が定義されており、マウント後に非同期 `useEffect` でスクショ設定と選手ベンチ退避を行っているため。 | 画面を開いた瞬間、数フレームにわたりサッカー盤と22人の選手がフラッシュし、その後にスクショで覆い隠される。 |
| **2** | **周囲の黒マージン混入** | `PitchBackground.tsx`（79〜82行）に `x: width * 0.02, width: width * 0.96`（周囲2%マージン）がハードコードされている。さらに BoundaryBox の初期値が `96%` に設定されているため。 | スクショ全画面表示・全画面エクスポート時に、外側2%の黒地（`#020617`）が余白として写り込む。 |
| **3** | **ハーフリサイズでの比率崩れ** | `calculatePitchRect(stageSize, aspectRatio)` がコンテナサイズに対して固定ピッチ比率（16:9, 4:5等）で矩形を計算しているため、ウィンドウ幅を半分にすると画像の描画領域と BoundaryBox の正規化変換率が狂う。 | ウィンドウを画面半分にリサイズすると画像が潰れたり黒帯（レターボックス）が急変し、描画が破綻する。 |
| **4** | **UIと操作動線の重複** | `QuickCanvasTopBar` に比率ボタン（16:9, 9:16, 4:5, 1:1, 全画面）があるにもかかわらず、キャンバス内にも `BoundaryBoxHud`（浮動HUD）が存在し、二重管理になっている。 | ユーザーがどちらを操作すべきか混乱し、状態更新のレースコンディションが発生する。 |
| **5** | **ホスト固有ロジックの混入** | `AnnotationLayer` 内で `setRightPanelTab('inspector')` や `setRightPanelOpen(true)` がハードコードされている（Extension に右パネルは存在しない）。 | 存在しないパネル操作Stateが叩かれ、予期せぬ副作用やメモリリークの原因になる。 |
| **6** | **グローバルイベントによる密結合** | コピー・保存・共有を `window.dispatchEvent(new CustomEvent('tactical:copy-png'))` 経由で行っている。 | 呼び出し関係が不透明でテストが極めて困難。同一ウィンドウに複数キャンバスが存在する場合に混線する。 |

---

## 2. アーキテクチャ設計原則 (Core Principles)

再設計では、以下の4原則を厳格に順守する。

### 原則 1: 3層分離 (3-Tier Composable Architecture)
キャンバスシステムを **「Core（純粋描画）」「View（ユースケース合成）」「Shell（画面レイアウト）」** の3層に明確に分離する。
- **Core**: サッカーの概念（ピッチ・11人選手・フォーメーション）を一切持たない、画像＋アノテーション（矢印・ゾーン・文字・リング）の純粋なヘッドレス描画基盤。
- **View**: Core をベースに、Webアプリ用（選手やピッチを付加）と Extension用（スクショ画像に特化）にコンポーネントを合成する層。
- **Shell**: TopBar、サイドパネル、タイムライン、IndexedDB同期などを組み合わせた最上位の統合画面。

### 原則 2: Store Provider パターン (No Global Singleton)
グローバルシングルトン（単一の `useTacticalUnifiedStore`）への直接依存を排除する。
`CanvasStoreProvider`（React Context + Zustand Vanilla Factory）を導入し、**キャンバスの初期状態（画像背景、選手0、BoundaryBox 100%）を Props としてマウント前に注入**する。
これにより、マウント直後の非同期更新が不要となり、**チラつき（Flicker）が物理的にゼロ**になる。

### 原則 3: ゼロマージン & 仮想キャンバス座標系 (Virtual Canvas Coordinate)
画像編集キャンバスにおける描画基準は「ピッチ」ではなく「元画像（スクリーンショット）」である。
- 背景画像は余白0%（`x: 0, y: 0, width: 100%, height: 100%`）で描画する。
- キャンバス内部の座標系は、元画像の縦横比を基準とした「仮想キャンバス（Virtual Canvas: 0〜100% 正規化座標）」で管理し、コンテナのリサイズに対しては `object-fit: contain` 相当の均等スケーリングで追従する。
- これにより、ウィンドウがハーフサイズにリサイズされても画像比率・アノテーション位置・BoundaryBox枠が一切崩れない。

### 原則 4: Clean Interface (Imperative Ref / Callbacks)
`window.dispatchEvent` によるグローバルカスタムイベントを全廃する。
親コンポーネント（TopBar等）からの操作は、`canvasRef.current.exportPng()` や `canvasRef.current.copyToClipboard()` などの **明示的な Ref（Imperative Handle）または Context フック** を通じて呼び出す。

---

## 3. 3層コンポーネント構造 (Component Hierarchy)

```
┌────────────────────────────────────────────────────────────────────────┐
│ Layer 3: Application Shells (画面シェル)                                │
│                                                                        │
│  [Footics Web Application]              [Footics Chrome Extension]     │
│  ┌──────────────────────────────┐       ┌────────────────────────────┐ │
│  │ TacticalUnifiedPage          │       │ QuickCanvasPage            │ │
│  │  ├─ Web TopBar               │       │  ├─ QuickCanvasTopBar      │ │
│  │  ├─ RightPanel (Formation)   │       │  │   (Meta, Aspect, Export)│ │
│  │  ├─ TimelineBar (Slides)     │       │  └─ QuickAnnotationCanvas  │ │
│  │  └─ FullTacticalCanvas       │       │      (Screenshot Bind)     │ │
│  └──────────────────────────────┘       └────────────────────────────┘ │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Layer 2: Composable Views (合成ビュー)                                  │
│                                                                        │
│  ┌──────────────────────────────┐       ┌────────────────────────────┐ │
│  │ FullTacticalCanvas           │       │ QuickAnnotationCanvas      │ │
│  │  - Mode: 'tactical-board'    │       │  - Mode: 'screenshot-edit' │ │
│  │  - Background: Pitch / Image │       │  - Background: Image only  │ │
│  │  - Layers:                   │       │  - Layers:                 │ │
│  │    ├─ PitchBackgroundLayer   │       │    ├─ BackgroundImageLayer │ │
│  │    ├─ PlayerLayer (22 players│       │    ├─ AnnotationLayer      │ │
│  │    ├─ BallObject             │       │    ├─ FootRingLayer        │ │
│  │    ├─ AnnotationLayer        │       │    ├─ DrawingPreviewLayer  │ │
│  │    ├─ DrawingPreviewLayer    │       │    └─ BoundaryBox          │ │
│  │    └─ BoundaryBox            │       │  - Toolbar: '3d-only'      │ │
│  │  - Toolbar: '2d-only' | all  │       │  - Floating HUD: None      │ │
│  │  - Floating HUD: Tilt + Ratio│       │    (TopBarに一本化)        │ │
│  └──────────────────────────────┘       └────────────────────────────┘ │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Layer 1: Pure Canvas Core (共通純粋描画基盤: src/features/tactical-unified/core/)
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ CanvasStageContainer (DOM / Stage ラッパー, リサイズ監視, 仮想座標系)│  │
│  │  ├─ Konva.Stage                                                  │  │
│  │  ├─ Layer: BackgroundImageLayer (ゼロマージン描画)                 │  │
│  │  ├─ Layer: AnnotationLayer (矢印, ゾーン, テキスト)              │  │
│  │  ├─ Layer: FootRingLayer (3D足元マーカー: player-ring)            │  │
│  │  ├─ Layer: DrawingPreviewLayer (描画中プレビュー, 矩形選択)       │  │
│  │  ├─ DOM: BoundaryBox (正対トリミング枠, 4隅ハンドル)              │  │
│  │  ├─ DOM: PitchInlineTextEditor (テキスト入力)                    │  │
│  │  └─ DOM: DrawingToolbar (フローティングツールバー)                │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  [Headless State & Hooks]                                              │
│  - CanvasStoreProvider (Zustand Vanilla Store + React Context)         │
│  - useCanvasStore / useCanvasActions                                   │
│  - useCanvasPointerInteraction (描画・選択・ドラッグ統一フック)        │
│  - useCanvasExport (PNG / Clipboard / Crop エクスポート)                │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. モジュール責務とファイル配置仕様

### 4.1 新規ディレクトリ構造 (`src/features/tactical-unified/core/`)

すべての共通描画ロジックを `core/` 配下に集約し、ホスト（Web / Extension）特有の依存を完全に排除する。

```
src/features/tactical-unified/core/
├── components/
│   ├── CanvasStageContainer.tsx     # Konva Stage の生成、レスポンシブ仮想座標コンテナ
│   ├── BackgroundImageLayer.tsx     # 余白0% の背景画像 Konva レイヤー
│   ├── AnnotationLayer.tsx          # 矢印、ゾーン、テキストの純粋描画（ホスト依存なし）
│   ├── FootRingLayer.tsx            # 3D足元リングマーカー（player-ring）専用レイヤー
│   ├── DrawingPreviewLayer.tsx      # 描画プレビュー（線、破線矢印、矩形選択等）
│   ├── BoundaryBoxOverlay.tsx       # DOM/SVG 正対トリミング境界線（0〜100%）
│   ├── InlineTextEditor.tsx         # Konva テキスト編集用 DOM インプット
│   └── CoreDrawingToolbar.tsx       # 描画ツールバー（markerMode フィルタ対応）
├── store/
│   ├── canvas-store.ts              # Zustand Vanilla によるストア定義（ファクトリ関数）
│   ├── canvas-store-provider.tsx    # React Context Provider
│   ├── canvas-store-types.ts        # コア状態の型定義（Annotation, BoundaryBox, ActiveTool等）
│   └── slices/
│       ├── annotation-slice.ts      # 矢印・ゾーン・テキスト・リングのCRUD
│       ├── tool-slice.ts            # activeTool, selection, continuousDraw
│       └── boundary-box-slice.ts    # boundaryBox の座標・比率・スナップ
├── hooks/
│   ├── use-canvas-store.ts          # ストア購読用フック
│   ├── use-canvas-pointer.ts        # マウス・タッチ入力制御
│   └── use-canvas-export.ts         # PNG生成、クリップボードコピー、BoundaryBoxクロップ
├── types/
│   └── index.ts                     # Core 公開型定義
└── index.ts                         # Core 公開エントリーポイント
```

### 4.2 各コンポーネントの詳細責務

#### (1) `CanvasStageContainer.tsx`
- **責務**:
  - 親コンテナの `ResizeObserver` によるサイズ監視。
  - 背景画像のアスペクト比に応じた「仮想キャンバス領域（`virtualRect`）」の計算。
  - レターボックス（余白）ができた場合でも、仮想キャンバス領域を中央配置し、正規化座標（0〜100%）と Konva ピクセル座標の相互変換倍率（`scale`）を一元管理。
  - ウィンドウが半分にリサイズされても、`virtualRect` がアスペクト比を維持して縮小するため、描画崩れが一切発生しない。

#### (2) `BackgroundImageLayer.tsx`
- **責務**:
  - 背景画像のデコードと描画。
  - **マージン 0%（`x: 0, y: 0, width: virtualRect.width, height: virtualRect.height`）** で描画。
  - `perfectDrawEnabled={false}`, `listening={false}` で最速描画。

#### (3) `FootRingLayer.tsx`
- **責務**:
  - 3D足元マーカー（`player-ring`）の描画。
  - 従来の `PlayerLayer` から「サッカー選手（背番号・氏名・フォーメーション・ビジョンコーン）」を削ぎ落とし、純粋な「足元リングマーカー」として独立化。
  - ドラッグ移動、色変更、選択、削除に対応。

#### (4) `AnnotationLayer.tsx`
- **責務**:
  - 矢印（直線・破線・波線）、ゾーン（ポリゴン・円）、テキストの描画。
  - **Web専用の副作用（`setRightPanelTab` 等）を完全排除**。
  - ダブルクリック時の振る舞いはオプショナルなコールバック `onObjectInspect?: (id: string, kind: string) => void` として受け取る。

#### (5) `BoundaryBoxOverlay.tsx`
- **責務**:
  - DOM/SVG ベースのリサイズ可能枠線。
  - 座標は `virtualRect` を 100% とする正規化座標（0〜100%）。
  - デフォルト値は `{ x: 0, y: 0, width: 100, height: 100, enabled: true, visible: true }`。
  - 4隅のドラッグハンドルおよび枠線全体のドラッグ移動。

#### (6) `CoreDrawingToolbar.tsx`
- **責務**:
  - 描画ツールボタン群（選択、矢印、ゾーン、テキスト、リング、消しゴム、連続描画ロック、リセット）。
  - Props `markerMode`:
    - `'3d-only'`: 3D足元リングのみ表示（Extension用）
    - `'2d-only'`: 2Dマーカーのみ表示（Footics戦術盤用）
    - `'all'`: 全表示

---

## 5. 状態管理の再設計 (Store Provider Pattern)

### 5.1 なぜ Context + Store ファクトリなのか？

グローバルシングルトン（`useTacticalUnifiedStore`）は、アプリ全体で1つの状態しか保持できない。
これに対して、`createCanvasStore(initialConfig)` ファクトリを定義し、React Context で提供することで以下のメリットが得られる：

1. **初期値の直接注入 (Zero-Flicker)**:
   Extension ではマウント時に `{ backgroundImageUrl: screenshotUrl, boundaryBox: FULL, ... }` を初期値として渡す。
   初回のレンダリングからスクショ専用の状態で開始されるため、2Dピッチや22人の選手が一瞬でも表示される余地がない。
2. **完全な状態分離**:
   Webアプリの戦術盤とExtensionクイックキャンバスが互いに影響を与えない。
3. **テスト容易性**:
   各テストケースで独立したストアを初期化できるため、モックやリセット処理が不要。

### 5.2 コアストアのインターフェース仕様

```ts
export interface CanvasCoreState {
  // ── Session Meta ──
  mode: 'screenshot-edit' | 'tactical-board';
  backgroundImageUrl?: string;
  imageAspectRatio: number; // 例: 16 / 9

  // ── Annotation Elements ──
  arrows: TacticalArrow[];
  zones: TacticalZone[];
  texts: TacticalText[];
  footRings: FootRingMarker[]; // 3D足元リング

  // ── Tool & Interaction ──
  activeTool: CanvasTool; // 'select' | 'arrow_solid' | 'arrow_dash' | 'arrow_wavy' | 'zone' | 'text' | 'player-ring' | 'eraser'
  selectedObjectIds: string[];
  continuousDrawing: boolean;

  // ── Export Boundary Box ──
  boundaryBox: BoundaryBox;

  // ── History (Undo / Redo) ──
  past: CanvasSnapshot[];
  future: CanvasSnapshot[];
}

export interface CanvasCoreActions {
  // Tool & Select
  setActiveTool: (tool: CanvasTool) => void;
  selectObject: (id: string, multiSelect?: boolean) => void;
  clearSelection: () => void;
  toggleContinuousDrawing: () => void;

  // Annotations CRUD
  addArrow: (arrow: TacticalArrow) => void;
  updateArrow: (id: string, patch: Partial<TacticalArrow>) => void;
  addZone: (zone: TacticalZone) => void;
  updateZone: (id: string, patch: Partial<TacticalZone>) => void;
  addText: (text: TacticalText) => void;
  updateText: (id: string, patch: Partial<TacticalText>) => void;
  addFootRing: (ring: FootRingMarker) => void;
  updateFootRing: (id: string, patch: Partial<FootRingMarker>) => void;
  removeObject: (id: string) => void;
  resetAllAnnotations: () => void;

  // Boundary Box
  setBoundaryBox: (box: BoundaryBox) => void;
  updateBoundaryBox: (patch: Partial<BoundaryBox>) => void;
  applyRatioToBoundaryBox: (ratio: '16:9' | '9:16' | '4:5' | '1:1' | 'full') => void;

  // Undo / Redo
  undo: () => void;
  redo: () => void;
}
```

---

## 6. ゼロマージン描画と比率ロック (Aspect-Ratio Lock)

### 6.1 仮想キャンバススケーリングアルゴリズム

ウィンドウがハーフサイズにリサイズされた場合でも、画像の歪みやアノテーションのズレを絶対に起こさない計算モデルを定義する。

```ts
/**
 * コンテナサイズと画像の元アスペクト比から、
 * はみ出さずに最大化（object-fit: contain）する仮想キャンバス矩形を計算する
 */
export function calculateVirtualCanvasRect(
  containerSize: { width: number; height: number },
  imageAspect: number, // 例: 1920 / 1080 = 1.777...
): { x: number; y: number; width: number; height: number; scale: number } {
  const containerAspect = containerSize.width / containerSize.height;

  let width = 0;
  let height = 0;

  if (containerAspect > imageAspect) {
    // コンテナの方が横長 → 高さに合わせる（左右に黒帯）
    height = containerSize.height;
    width = height * imageAspect;
  } else {
    // コンテナの方が縦長 → 幅に合わせる（上下に黒帯）
    width = containerSize.width;
    height = width / imageAspect;
  }

  const x = (containerSize.width - width) / 2;
  const y = (containerSize.height - height) / 2;

  // 100% 座標系（0〜100）をピクセルに変換するスケール
  const scale = width / 100;

  return { x, y, width, height, scale };
}
```

### 6.2 座標変換の絶対原則
- すべてのアノテーション（矢印、ゾーン、テキスト、リング、BoundaryBox）の永続化データは、**仮想キャンバスに対する 0〜100% の正規化座標** で保持する。
- Konva の描画時は `px = norm * scale`、ポインタ入力時は `norm = px / scale` で双方向変換を行う。
- これにより、ウィンドウをどのようなサイズ・比率に伸縮させても、**「元画像に対するアノテーションの相対位置」は 0.001% もズレない**。

---

## 7. UI/UX 仕様確定と Figma スタイリング

### 7.1 TopBar への比率・アクション一元化
キャンバス内の浮動 HUD（`BoundaryBoxHud`）は廃止（または非表示）とし、すべての比率・エクスポート操作を `QuickCanvasTopBar` に集約する。

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ QuickCanvasTopBar (H: 44px, bg-[#141414], border-b border-white/10)                   │
│                                                                                        │
│ [Left: Metadata & History]                                                             │
│  - Video Title (Tooltip: 元動画URLリンク)                                              │
│  - Video Timestamp (例: 14:22)                                                         │
│  - Undo (Ctrl+Z) / Redo (Ctrl+Y)                                                       │
│                                                                                        │
│ [Center: Ratio Selector (Segmented Control)]                                           │
│  - Full (100% × 100%, クロップなし)  [Default]                                         │
│  - 16:9 (横長 - YouTube/PC)                                                            │
│  - 9:16 (縦長 - Shorts/Reels)                                                          │
│  - 4:5  (縦長 - Xタイムライン最大)                                                      │
│  - 1:1  (正方形 - スクエア)                                                            │
│                                                                                        │
│ [Right: Action Buttons]                                                                │
│  - ⭐ Favorite Toggle                                                                  │
│  - 📋 Copy (クリップボード画像コピー)                                                  │
│  - 💾 Save (PNGダウンロード)                                                           │
│  - 🚀 Share to X (画像コピー + 空文X投稿タブ起動)                                      │
│  - 📊 Dashboard (一覧へ戻る)                                                           │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 X（Twitter）共有機能の確定仕様
- **仕様**: 「Xを開いて自動画像コピー ＋ 空文（定型文なし）」
- **フロー**:
  1. ユーザーが「X共有」ボタンをクリック。
  2. BoundaryBox でクロップされた PNG 画像をクリップボードへ自動コピー。
  3. `https://twitter.com/intent/tweet`（`text=` なし）を新規タブで開く。
  4. トースト通知: `「🚀 Xを開きました！Ctrl+V で画像を貼り付けてください」` を表示。

---

## 8. Extension と Web本体の合成ビュー仕様

### 8.1 Extension 向け: `QuickAnnotationCanvas.tsx`
Extension 用のクリーンなビューコンポーネント。

```tsx
export interface QuickAnnotationCanvasProps {
  screenshot: CapturedScreenshot;
  onAutoSave?: (annotationsJson: string) => void;
  canvasRef?: React.RefObject<CanvasCoreHandle | null>;
}

export function QuickAnnotationCanvas({
  screenshot,
  onAutoSave,
  canvasRef,
}: QuickAnnotationCanvasProps) {
  // 初期設定: スクショ画像, 余白ゼロ, 3Dリングのみ, 初期選手ゼロ
  const initialConfig = useMemo(() => ({
    mode: 'screenshot-edit' as const,
    backgroundImageUrl: screenshot.imageDataUrl,
    initialAnnotations: screenshot.canvasAnnotations,
    defaultBoundaryBox: { x: 0, y: 0, width: 100, height: 100, enabled: true, visible: true },
    markerMode: '3d-only' as const,
  }), [screenshot]);

  return (
    <CanvasStoreProvider initialConfig={initialConfig} onAutoSave={onAutoSave}>
      <CanvasStageContainer ref={canvasRef}>
        <BackgroundImageLayer />
        <FootRingLayer />
        <AnnotationLayer />
        <DrawingPreviewLayer />
        <BoundaryBoxOverlay />
        <InlineTextEditor />
        <CoreDrawingToolbar markerMode="3d-only" />
      </CanvasStageContainer>
    </CanvasStoreProvider>
  );
}
```

### 8.2 Web本体向け: `FullTacticalCanvas.tsx`
Footics 本体のフルセット戦術盤。同じ Core レイヤーに、サッカー固有レイヤー（ピッチ背景、選手22人、ボール、3Dチルト）をプラグインのように追加合成する。

```tsx
export function FullTacticalCanvas() {
  return (
    <TacticalBoardStoreProvider>
      <CanvasStageContainer>
        {/* サッカー専用レイヤー */}
        <PitchBackgroundLayer />
        <PlayerLayer />
        <BallObjectLayer />

        {/* 共通コアレイヤー */}
        <AnnotationLayer />
        <DrawingPreviewLayer />
        <BoundaryBoxOverlay />
        <InlineTextEditor />
        <CoreDrawingToolbar markerMode="2d-only" />

        {/* サッカー専用HUD */}
        <ContextHud />
        <BoundaryBoxHud showTiltControls={true} />
      </CanvasStageContainer>
    </TacticalBoardStoreProvider>
  );
}
```

---

## 9. リファクタリング実行計画 (Migration Guide for Next Agent)

次のコンテキストにおいて、Worker エージェントが安全にリファクタリングを実行するためのフェーズ別ステップ。

### Phase 1: Pure Canvas Core の構築
1. `src/features/tactical-unified/core/` ディレクトリを作成。
2. `types/index.ts`, `store/canvas-store.ts`, `store/canvas-store-provider.tsx` を実装。
3. `components/CanvasStageContainer.tsx`, `BackgroundImageLayer.tsx`, `BoundaryBoxOverlay.tsx` を実装（マージン0%、仮想キャンバス計算）。
4. `components/AnnotationLayer.tsx`, `FootRingLayer.tsx`, `CoreDrawingToolbar.tsx` を既存実装からホスト非依存化して移植。
5. 単体テスト作成: `core/__tests__/canvas-store.test.ts`, `core/__tests__/virtual-canvas-rect.test.ts`。

### Phase 2: Extension の移行 (`QuickAnnotationCanvas`)
1. `extension/features/canvas/components/QuickAnnotationCanvas.tsx` を新規作成し、Core をマウント。
2. `QuickCanvasTopBar.tsx` の ratio 選択を Core のアクションに接続。
3. `QuickTacticalCanvas.tsx` を更新し、旧 `UnifiedCanvas` への依存を `QuickAnnotationCanvas` に差し替え。
4. 目視・自動テスト検証:
   - 初期ロード時のチラつきが完全になくなったこと（2Dピッチや選手が一瞬も出ない）。
   - 画像周囲の黒マージンがゼロであること。
   - ウィンドウを半分にリサイズしても比率が崩れないこと。
   - X共有で空文＋クリップボードコピーが動作すること。

### Phase 3: Web本体の統合と不要コードの廃止
1. Web本体側 `FullTacticalCanvas.tsx` を作成し、Core レイヤーを共有。
2. 以前の `use-standalone-canvas-session.ts` などの付け焼き刃フックを安全に廃止。
3. `window.dispatchEvent` 等のカスタムイベントリスナーを全廃。
4. 全体テスト・ビルド検証:
   - `bun run ai:check`
   - `bun run --cwd extension compile`
   - `bun run --cwd extension build`

---

## 10. 審査・受入基準 (Acceptance Criteria)

- [ ] **No Flicker**: Extension のクイックキャンバスを開いた際、2Dピッチや22人の選手マーカーが1フレームも表示されないこと。
- [ ] **Zero Black Margin**: スクリーンショットがキャンバスおよび BoundaryBox に 100% ぴったり収まり、外側余白（2%マージン）が存在しないこと。
- [ ] **Resize Resilience**: ブラウザをハーフサイズ（画面半分）にリサイズしても、画像比率が歪まず、BoundaryBox の枠線が正しく画像に追従すること。
- [ ] **Single Source of Truth**: 矢印・ゾーン・テキスト・3Dリングマーカーの Konva 描画ロジックが `core/` の1箇所にのみ存在し、WebとExtensionで完全に共有されていること。
- [ ] **No Host-Specific Pollution**: `core/` のコード内に Web専用（`rightPanel` 等）や Extension専用（`screenshot-db` 等）のインポート・副作用が一切含まれていないこと。
