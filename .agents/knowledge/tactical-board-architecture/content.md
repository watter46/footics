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

