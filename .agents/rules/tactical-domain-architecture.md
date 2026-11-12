---
description: "戦術ボード領域（tactical）専任の関数型DDD・6コンテキスト・決定論的パイプライン設計規約"
globs:
- "src/features/tactical-unified/**"
- "src/lib/tactical/**"
- "src/lib/types/tactical/**"
- "src/lib/types/tactical-unified.ts"
---
# 戦術ボード・関数型DDDアーキテクチャ規約 (Tactical Functional DDD Architecture)

本規約は、戦術ボード領域（`src/features/tactical-unified/**`, `src/lib/tactical/**`, `src/lib/types/tactical/**`）のみに適用される厳格な設計規約である。
Next.js + React + Konva + WebCodecs Worker + IndexedDB 環境において、状態の不整合・描画ズレ・パフォーマンス劣化を構造的に根絶するため、**クラス設計（OOP）を全面禁止**し、**関数型DDD（Algebraic Data Modeling + Pure Functions）と単方向決定論的パイプライン**を強制する。

---

## 1. 6つの境界づけられたコンテキスト (6 Bounded Contexts)

戦術ボード領域のすべてのコードは、以下の6つのコンテキストのいずれかに明確に属し、単方向の依存関係を守らなければならない。

| Context | 名称 | 責務 | 外部依存制約 |
| :--- | :--- | :--- | :--- |
| **1. Document & Roster Aggregate** | プロジェクト・フェーズ階層 | `TacticalProject > TacticalPhase > Slide` の単一所有権階層モデルとスキーマ定義 | React / Konva / DOM / Zustand 依存ゼロ |
| **2. Slide Entities & Invariants** | 戦術エンティティ・状態遷移・不変条件 | 直和型エンティティ、`TacticalCommand`、純粋 Reducer、`enforceSlideInvariants` | React / Konva / DOM / Zustand 依存ゼロ |
| **3. Anti-Corruption Layer (ACL)** | 腐敗防止・外部データ変換層 | Match / Squad / Legacy JSON / Share Payload を正規化ドメインモデルへ変換する純粋 Translator | Store の直接書き換え禁止（純粋関数のみ） |
| **4. Spatial & Temporal Engine** | 空間座標投影・時間軸補間エンジン | Branded 座標空間変換、3D MVP 行列投影、`evaluateTimelineFrame(phase, timeMs)` | React / Konva / DOM / Zustand 依存ゼロ |
| **5. Visual Scene Compiler** | 視覚プリミティブ解決コンパイラ | `compileSceneGraph(frame, session, viewport) => ResolvedSceneGraphDTO`（曲線・波紋・トリミング・Zソートの完全解決） | React / Konva / DOM / Canvas2D 依存ゼロ |
| **6. Reactive Shell & Dumb View** | 3頻度ストアシェル・描画投影・UI | Thin Zustand Store Provider、Konva 編集ビュー、Canvas2D ラスタライザ、ツールプラグイン | ドメイン計算・幾何学計算の直書き禁止 |

---

## 2. ドメインモデルの純粋性・単一所有権・代数的データ型 (Domain Modeling Rules)

### 2.1 純粋性と不変性（Immutability & Zero OOP）
1. **クラス（OOP）とメソッドの禁止**: ドメインモデルに関数・メソッド・クラスインスタンスを含めてはならない。すべて JSON シリアライズおよび `structuredClone` 可能なプレーンデータ（`readonly` オブジェクトと `readonly T[]` 配列）で定義する。
2. **単一真実源スキーマ**: `src/lib/types/tactical/` の Zod スキーマから型を導出し、直接ミューテーション（`player.x = 10`, `slide.arrows.push(...)`）をコンパイルレベルで禁止する。

### 2.2 階層間の単一所有権（Single Ownership Hierarchy）
複数の階層に同じ設定を `.optional()` で重複定義し、`slide.x ?? phase.x ?? project.x` のようなフォールバック連鎖を作ることを固く禁じる。
- **`TacticalProject` の所有**: プロジェクト識別（`id`, `title`, `matchId`, `version`）、チーム共通設定（`homeColor`, `awayColor`, `matchFormations`）、全体演出設定（`pitchAppearance`, `screenBackground`）、および `phases: readonly [TacticalPhase, ...TacticalPhase[]]`。
  - ※`activePhaseId` / `activeSlideId` 等のワークスペース選択状態や、レガシー `slides` ゲッターを `TacticalProject` 内に持たせてはならない。
- **`TacticalPhase` の所有**: `id`, `name`, 空間・枠設定（`aspectRatio`, `boundaryBox`, `backgroundType`, `backgroundImageUrl`）、ディレクターカメラトラック（`directorCamera`）、および `slides: readonly [Slide, ...Slide[]]`。
- **`Slide` の所有**: `id`, `index`, `label`, 戦術エンティティ群（`players`, `ball`, `arrows`, `zones`, `texts`）、トランジション設定（`transitionDurationMs`, `pauseMs`, `easing`）、基本視点（`pitchTransform`, `isSidesSwapped`）のみ。
- **Web / Extension の単一スキーマ統一**: Chrome Extension（スクショ編集）も独自の `AnnotationsData`（`markers`）を持たず、`backgroundType: 'image'` の 1 Phase・1 Slide として同一の `Slide` モデルと Command Reducer を共用する（双方向変換アダプター `tactical-canvas-store-adapter` パターンは禁止）。

### 2.3 直和型（Discriminated Unions）と幽霊型（Branded Types）による不正状態の排除
1. **座標空間の Branded Type 化**:
   - `ScreenNormCoord` / `ScreenNormPoint`（`16:9` 基準スクリーン全体の `0..100`：ドメインモデル永続化の唯一の座標系）
   - `PitchNormCoord` / `PitchNormPoint`（アクティブ比率のピッチ枠内 `0..100`：フォーメーション定義用）
   - `StagePixel` / `StagePixelPoint`（キャンバス描画ピクセル座標 `px`）
   - これらを単なる `{ x: number, y: number }` として混同することを禁じ、Smart Constructor（`clampToScreenNorm` 等）と空間変換関数を通さない限り型代入できない構造とする。
2. **エンティティの直和型分離（Make Illegal States Unrepresentable）**:
   - **`Player`**: `PitchPlayer`（`area: 'pitch'`：視野角 `visionCone`・接続線 `connectLines`・軌道 `trajectory`・フォーカス `focus` を保持可能）と `BenchPlayer`（`area: 'bench'`：ピッチ専用属性を型レベルで保持不可）の直和型とする。
   - **`ZoneAnnotation`**: `RectZone | EllipseZone | PolygonZone` の直和型とし、形状ごとに必須の幾何プロパティを型で強制する。作図途中の未確定状態（`isComplete: false` 等）を永続ドメインモデルに混入させてはならず、`EphemeralSessionState` で保持すること。
   - **`ArrowAnnotation`**: `startMarker` / `endMarker`（`'none' | 'arrow' | 'dot'`）に統一し、`arrowHead: boolean` のような重複フラグを持たせない。

---

## 3. 3頻度状態分離と純粋 Command Reducer (State & Command Rules)

### 3.1 更新頻度（Frequency）に応じた3つの状態分離
パフォーマンス劣化と Undo 履歴汚染を防ぐため、更新頻度の異なる状態を単一のストア更新経路に混ぜてはならない。

1. **Cold State (`DocumentState` — 更新頻度: 操作確定時のみ)**:
   - 永続ドメインモデル（`TacticalProject`）。
   - `onDragEnd` / `onPointerUp` / HUD ボタンクリック / ショートカット実行などの**確定タイミングでのみ**、`dispatch(command: TacticalCommand)` を1回発行して更新する。
   - この経路のみが Undo/Redo History スタックの記録と IndexedDB 自動保存をトリガーする。
2. **Hot State (`EphemeralSessionState` — 更新頻度: 60〜120Hz ポインタ移動中)**:
   - `activePhaseId`, `activeSlideId`, `workspaceMode`, `activeTool`, `selectedIds`、およびドラッグ中の一時移動デルタ（`activeDragDelta`）・作図中プレビュー（`drawingPreview`）・ポリゴン頂点ドラフト・範囲選択ボックス。
   - `onDragMove` / `onPointerMove` 中は `DocumentState` を一切クローン・更新せず、`EphemeralSessionState` のみを高速更新する。
3. **Stream State (`PlaybackClock` — 更新頻度: 60fps アニメーションループ)**:
   - 再生・シーク中の絶対時刻 `timeMs: Milliseconds`。React コンポーネントツリー全体の再レンダーを引き起こさず、時間補間エンジンと Scene Compiler を駆動する。

### 3.2 純粋 Command Reducer と単一不変条件ノーマライザ (`enforceSlideInvariants`)
1. **Zustand `set()` 内へのドメインロジック直書き禁止**:
   Zustand ストアは `dispatch(command)` を受けて純粋関数 `applyTacticalCommand(project, command)` を呼び出すだけの薄いリアクティブ・シェルとする。
2. **集約出口での単一不変条件の強制**:
   `Slide` を変更するすべての Command は、純粋 Reducer の出口で必ず単一の純粋関数 `enforceSlideInvariants(prevSlide, candidateSlide, command): Slide` を通過しなければならない。ここで以下の不変条件を一括保証する：
   - **ロック不変条件**: `prevSlide` で `locked: true` のエンティティは、ロック解除コマンド以外のいかなるコマンドによっても座標・形状変更・削除されない。
   - **空間境界不変条件**: 選手およびボールの座標は Smart Constructor（`clampToScreenNorm`）により許容領域内に正規化される。
   - **参照整合性（カスケード消去）**: ピッチ上に存在しない（ベンチ移動または削除された）`PlayerId` を参照する `ConnectLine` および `ArrowAnnotation`（追従矢印）は自動的に除去される。
   - **追従同期**: ピッチ上の選手が移動した場合、その選手にバインドされた矢印の始点・終点座標は選手の新座標へ自動同期される。

---

## 4. 時間軸の純粋導出と視覚シーングラフコンパイラ (Engine & View Isolation Rules)

### 4.1 時間経過の純粋関数導出 (`evaluateTimelineFrame`)
- アニメーション再生中の中間状態をステートフルな変数として保持したり、Konva ノードを命令的に書き換えたりすること（旧 `animation-node-updater` パターン）を禁じる。
- 中間状態は必ず静的データと時刻 `timeMs` の純粋関数 `evaluateTimelineFrame(phase: TacticalPhase, timeMs: Milliseconds): EvaluatedTimelineFrame` の戻り値として導出する。プレビュー再生と WebCodecs 動画出力 Worker はこの同一関数を使用する。

### 4.2 視覚プリミティブ DTO (`ResolvedSceneGraphDTO`) と Dumb View 原則
- **View 層（Konva コンポーネントおよび Canvas2D レンダラ）での幾何学計算・ドメイン計算の全面禁止**:
  View 層にドメインモデルや正規化フレームを直接渡して、View 側で「ベジェ曲線・波線の頂点分割」「選手半径分の矢印オフセット」「伸長エフェクトによるトリミングと先端角度計算」「波紋リング半径」「3D遠近投影と奥行きZソート」を計算させてはならない。
- **単一コンパイラ境界**:
  上記のすべての幾何学・視覚解決は、React/Konva/Canvas2D 非依存の純粋関数 `compileSceneGraph(frame, session, viewport): ResolvedSceneGraphDTO` の1箇所で完了させる。
- Konva コンポーネントと Canvas2D レンダラは、渡された `ResolvedSceneGraphDTO` の計算済みピクセル頂点列（`flatPointsPx` 等）と数値を画面へ転写するだけの **Dumb Rasterizer（純粋出力装置）** とする。

### 4.3 幽霊パイプライン・多重ストア並存・プレースホルダの絶対禁止 (Anti-Ghost Pipeline Rules)
1. **多重ストア並存と空ストア配線の禁止**:
   - `TacticalStoreProvider`（3頻度ストア）、旧 `TacticalUnifiedStore`、旧 `CanvasStoreProvider`（`createCanvasStore`）を同一画面内で並存させたり、空の `createCanvasStore()` を子に渡してコンパイルだけを通すハリボテ配線を固く禁じる。
2. **ACL 往復シリアライズ（JSON ピンポン）の禁止**:
   - `DomainTacticalProject` を `serializeProjectToScreenshotJson` で再び JSON 文字列へシリアライズして別ストアに流し込む往復ブリッジ実装を禁止する。
3. **Scene Compiler の完全解決義務（プレースホルダ禁止）**:
   - `compileSceneGraph` 内で `// placeholder` や空配列 `[]` ハードコードで機能を省略することを禁じる。3D MVP 行列投影（`pitchTransform` / `directorCamera`）、ゴースト軌道（`trajectories`）、選手の視野角（`visionCone`）・スポットライト（`focus`）、および全エンティティ（Player / Ball / Text / Zone / Arrow）への `activeDragDelta` 合成を必ず Compiler 内で完結させること。
4. **Canvas2D 背景ピッチキャッシュとセレクタ粒度**:
   - `useResolvedSceneGraph` ではストア全体購読（`useSessionStore(s => s)`）やオブジェクト参照依存（`[viewport]`）を禁止し、プリミティブ単位の依存配列とすること。
   - 連続フレーム描画（プレビュー・動画出力）では、ピッチ外観設定・Viewport・カメラ行列が不変の間は OffscreenCanvas キャッシュを転写し、毎フレームのピッチ再描画を行わないこと。
