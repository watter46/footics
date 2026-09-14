# Tactical Board Architecture & Hook Design (Tactical Board モジュール化とフック設計)

## 概要
Tactical Board（戦術ボード）は、選手配置（DOM / ドラッグ＆ドロップ）と描画アノテーション（React-Konva / Canvas）が融合した複合機能です。巨大コンポーネント化（単一ファイルへの知識集中）を防ぐため、コンポーネントの責務分離とカスタムフックによるロジックカプセル化を徹底しています。

---

## 1. コンポーネント階層構造と責務

```text
TacticalBoardModal
├── TacticalHeader (ヘッダー操作・ツールバー・エクスポートトリガー)
│   └── KonvaStylePanel (色・線幅・ツール切り替え)
├── TacticalPitchArea (ピッチ描画メイン領域)
│   ├── Pitch (背景ピッチ・グリッド・ゾーン描画)
│   ├── PlayerMarker (選手マーカー・D&D 配置)
│   └── TacticalDrawingCanvas (Konva Stage / Layer 描画オーバーレイ)
└── BenchArea (控え選手エリア・フォーメーション選択)
```

| コンポーネント | 役割・責務 |
| :--- | :--- |
| `tactical-board-modal.tsx` | モーダルのライフサイクル管理、状態の初期化、トップレベルのレイアウト結合 |
| `tactical-header.tsx` | タイトル表示、スナップショット保存・復旧、画像エクスポートボタン、ツールバー制御 |
| `tactical-pitch-area.tsx` | ピッチと描画キャンバスのレスポンシブなサイズ同期と配置 |
| `bench-area.tsx` | ベンチ選手一覧およびピッチへのドラッグ元管理 |
| `tactical-drawing-canvas.tsx` | React-Konva の `Stage` / `Layer` 管理とシェイプ（線、矢印、矩形等）の描画 |
| `konva-style-panel.tsx` | 描画ツール（ペン、矢印、テキスト、消しゴム等）およびスタイル（カラー、太さ）の選択 UI |

---

## 2. カスタムフック設計と関心事の分離

描画やエクスポートに関わる複雑なロジックは、コンポーネント内にインライン記述せず専用のカスタムフックに分離しています。

### 2.1 `useDrawingInteraction`
- **責務:** Canvas 上でのポインター/マウスイベント（`onMouseDown`, `onMouseMove`, `onMouseUp`）を処理し、描画中のシェイプ座標の更新・確定を行う。
- **原則:** レンダリングの不要な再計算を避け、描画中は一時ステートで保持し、確定時に履歴へプッシュする。

### 2.2 `useDrawingHistory`
- **責務:** 描画オブジェクトの Undo / Redo スタック管理。
- **原則:** 不変性を保ったステート更新を行い、最大履歴件数の制限やクリア操作を提供する。

### 2.3 `useDrawingHotkeys`
- **責務:** キーボードショートカット（Undo/Redo: `Ctrl+Z` / `Ctrl+Y`、ツール切り替え、全消去など）のバインドと制御。
- **原則:** 入力フォームフォーカス時の暴発を防ぎ、モーダル表示中のみアクティブにする。

### 2.4 `useTacticalExport`
- **責務:** `html-to-image` 等を用いた戦術ボード全体（ピッチ＋選手＋描画線）の画像生成、クリップボードコピー、ダウンロード処理。

---

## 3. 状態管理方針 (Zustand: `tactical-store.ts`)

- **ストアの局所性:** 戦術ボード固有の配置データ、アクティブなツール、描画設定は `tactical-store.ts` に集約。
- **セレクター利用:** コンポーネント側では必要な状態のみをセレクター形式 (`useTacticalStore(s => s.activeTool)`) で購読し、不要な再レンダリングを防止する。
- **行数制限の遵守:** 各コンポーネント・フックは原則 200〜300 行以内を維持し、拡張時は責務に応じたサブモジュールへの分割を行う。

---

## 4. 座標系とマーカーIDの設計原則

### 4.1 ピッチ座標系と向き (Orientation)
- **戦術ボード (Tactical Board):** 横画面 (`105:68`) および縦画面 (`68:105`) の動的切り替えに対応。
- **向きの切り替え (setOrientation):** ピッチ上の選手およびボール座標を相互に回転変換する。
  - 横 -> 縦: `x_v = y_h, y_v = 100 - x_h`
  - 縦 -> 横: `x_h = 100 - y_v, y_h = x_v`
- **フォーメーション適用:** 選択中の向きに応じて `getFormationActualPos`（横画面）または `getFormationActualPosVertical`（縦画面）を適用する。
- **戦術アニメーション連携:** `importFromTacticalBoard` に現在の `orientation` を渡すことで、アニメーション側の向きとの間で双方向の正確な座標変換を行う。

### 4.2 マーカー ID 設計
- マーカー ID は `${matchId}-${playerId}` の形式をとる。`matchId` にハイフンが含まれる場合（例: `chelsea-tactics-board`）を考慮し、安易な `split('-')` ではなく `parsePlayerIdFromMarkerId` ユーティリティを使用する。

---

## 5. シーズン管理とプレイヤープリセット

### 5.1 シーズン表記規則
- シーズン表記は `'26-27'`, `'25-26'`, `'24-25'` のフォーマットに統一（`AVAILABLE_SEASONS` 定数）。
- `PresetPlayer` および `PlayerMaster` に `season?: string` フィールドを保持。

### 5.2 シーズン切り替えと手動選手追加
- ベンチヘッダーからシーズンを選択してスカッドを即座に切り替え可能。
- 新規選手追加モーダル（`AddPlayerDialog`）にもシーズン選択項目を備え、指定したシーズンに紐付けて IndexedDB に保存。
- シーズン変更時は新シーズンの選手が自動的にベンチへ整列・配置される。

---

## 6. マーカー操作・ドラッグパフォーマンス最適化 (D&D Performance)

### 6.1 ドラッグ遅延の排除
- **CSS Transition / Blur の排除:** `PlayerMarker` のドラッグ中オーバーレイ（`DragOverlay`）では、CSS の `transition-all` や `filter: blur()` を絶対に付与しない（マウス追従時に遅延やもっさり感を生むため）。
- **GPU レイヤー合成:** `isDragging` または `isOverlay` 時に `willChange: 'transform'` を適用し、60fps〜120fps の滑らかな追従を実現する。
- **座標同期:** `style.transition: 'none'` を徹底し、dnd-kit のポインターイベントにリアルタイム追従させる。

---

## 7. アノテーション幾何モデルと形状不変性 (Policy A & Geometry Model)

### 7.1 【方針 A】アノテーション完全自由座標・形状 100% 不変原則
- **個別クランプの禁止:** 矢印（Arrow）、多角形/矩形ゾーン（Zone）、テキスト（Text）、曲線制御点（Control Point）などの描画オブジェクトに対して、各頂点ごとの `Math.max(0, Math.min(100, ...))` 個別クランプを行ってはならない。個別クランプを行うと、キャンバス境界を跨いだ際にオブジェクトが押し潰され、長さ・角度・カーブ曲率・多角形形状が崩壊する。
- **キャンバス外配置の許容:** アノテーション座標はピッチ外（負の座標や 100% 超）を完全許容し、ユーザーが意図した相対幾何構造を 100% 保持する。

### 7.2 2次ベジェ曲線頂点（Apex）と制御点（Control Point）の双方向モデル
- **頂点 $M$（$t=0.5$ の点）の計算:**
  $$M = 0.25 P_0 + 0.5 P_{ctrl} + 0.25 P_1$$
- **制御ハンドル操作時の $P_{ctrl}$ 逆算:**
  $$P_{ctrl} = 2 M - 0.5 (P_0 + P_1)$$
- **線上完全吸着保証:** ハンドルノードの表示位置は常に曲線頂点 $M$ 上に描画し、ドラッグ中・ドロップ確定後・再選択時のいずれにおいても、Konva ノードの位置を $M$ に 100% 同期させる。

---

## 8. グローバルオブジェクト・コピペ機構 (Global Copy & Paste Architecture)

### 8.1 クリップボード・スナップショットとリマップ
- **完全ディープコピー:** `copySelectedObjects` で選択中の選手・矢印・ゾーン・テキストを `structuredClone` でスナップショット保持。
- **一意UUID再発行と相互参照リマップ:** `pasteObjects` 実行時、新規UUIDを発行し +3% オフセット配置。同時にコピーされた選手群の `ConnectLine` および矢印（`sourcePlayerId`/`targetPlayerId`）の参照先を新選手IDに自動置換。
- **入力要素の除外ガード:** `INPUT` / `TEXTAREA` / `isContentEditable` フォーカス時はショートカットキーを完全に除外。

---

## 9. オブジェクト直交性・Layer 階層 & 矢印インタラクション設計

### 9.1 ボールレイヤー最前面化 (Ball Z-Index & Layer Fronting)
- **Konva Stage 描画順序:** `<Layer ref={ballLayer}>` を `<Layer ref={playerLayer}>` の手前（DOM 後方）に配置。
- **視認性・操作性担保:** ボールが選手マーカーの下に潜り込む視覚的バグを排除し、選手マーカーと重なった場合でもボールの単独クリック・ドラッグ操作を保証。

### 9.2 オブジェクト独立性・近傍吸着排除原則 (Proximity Independence)
- **暗黙連動の完全禁止:** 選手マーカー移動時に近傍距離判定（`Math.hypot <= 8`）でボール・ゾーン・テキストを自動追従させてはならない。
- **責務の分離:** 選手移動に追従するのは選手固有オプション（`visionCone`, `badges`, `focus`, `connectLines`, `trajectory`）および明示的に `sourcePlayerId`/`targetPlayerId` が設定された矢印のみ。ピッチ上のフリーオブジェクト（Ball, Zone, Text, 独立Arrow）は完全な直交性（独立性）を維持する。

### 9.3 矢印・ライン系オブジェクトの操作モデル (Direct Grab & Tip Drag)
- **通常のフリー矢印:** 未選択状態からでも矢印本体（ライン）を直接クリック＆ドラッグで全体平行移動（Direct Grab & Drag）。
- **Player 付属矢印 (`sourcePlayerId` あり):**
  - **根元（始点）:** 常に Player マーカーに固定・追従（始点ハンドル非表示、矢印本体のドラッグ移動は禁止）。
  - **先端（終点）:** 未選択状態からでも先端の透明ヒットエリア（`hitStrokeWidth: 16`）を直接掴むことで即座に選択＋ドラッグ開始され、長さ・向きを直感的に変更可能。
  - **ポインタ表示制御:** 未選択・非ドラッグ時はポインタ（青丸・黄色丸）を完全非表示（`opacity: 0`）にし、ドラッグ開始時・選択時にのみ出現させてピッチの視認性を最大化する。




