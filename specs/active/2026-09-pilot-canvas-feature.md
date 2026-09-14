# Pilot Task: Canvas 2D Drawing Test

## 1. 目的
Regista v2 のパラレルワーカーアーキテクチャ（regista-gm -> worker-canvas, worker-frontend, worker-data）が正常に連動し、仕様通りに動作するかを検証する。

## 2. 要件
- **状態管理 (worker-data)**: Zustand を用い、`usePilotStore` を作成する。「グリッド表示/非表示」を切り替えるboolean型の状態 (`showGrid`) を管理すること。
- **キャンバス描画 (worker-canvas)**: Konva を用いて、`PilotCanvas` コンポーネントを作成すること。
  - 中央に 200x200 の四角形を描画する。
  - `showGrid` が true の場合、四角形の背景に10px間隔で格子状の線（グリッド）を描画する。
- **React UI (worker-frontend)**: `PilotFeature` コンポーネントを作成すること。
  - 「グリッド切り替え」ボタンを配置し、`usePilotStore` を呼び出して状態をトグルできるようにする。
  - `PilotCanvas` をマウントして表示する。

## 3. 実装領域 (ホワイトリスト制約に従うこと)
- `src/stores/pilotStore.ts` (worker-data)
- `src/components/features/tactical-unified/canvas/PilotCanvas.tsx` (worker-canvas)
- `src/components/ui/PilotFeature.tsx` (worker-frontend)

## 4. 人間目線の受入条件 (Human Acceptance Criteria)
1. 画面上に「グリッド切り替え」ボタンと、四角形が描画されたキャンバスが表示されていること。
2. ボタンをクリックするたびに、キャンバス上のグリッド線の表示・非表示が正しく切り替わること。
3. エラーや警告がコンソールに出ていないこと。

---
**regista-gm への指示**: 
上記仕様を読み取り、ASTを抽出しつつ、各worker (worker-data, worker-canvas, worker-frontend) を並列起動して実装を進めてください。実装完了後、結合検証を行い、正常であればローカルコミットまで完了させてください。
