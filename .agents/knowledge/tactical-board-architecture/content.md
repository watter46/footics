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
