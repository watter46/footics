# 引継ぎサマリー: TACTICAL-BOARD-REFACTOR (戦術ボードCanvas座標・ドラッグ判定のハイブリッド構成リファクタリング)

## 1. タスク概要
- **チケットID**: `TACTICAL-BOARD-REFACTOR`
- **ステータス**: `IN_PROGRESS`
- **タスク名**: 戦術ボードCanvas座標・ドラッグ判定のハイブリッド構成リファクタリング
- **作業ブランチ**: `main`
- **関連ファイル**:
  - `src/components/features/tactical-unified/canvas/` 配下の各コンポーネント (Stage/Layer/PlayerLayer等)
  - `src/hooks/tactical/` 配下のドラッグ・インタラクションフック
  - `src/lib/tactical/` 配下の座標変換・幾何学純粋関数

---

## 2. 手詰まり・引継ぎの経緯 (Background & Impasse Reason)
- **手詰まりの原因**: ドラッグ操作時に見た目のUIと当たり判定の不整合（ズレ）が発生しており、アーキテクチャの整理・最適解（自前純粋関数 ＋ Konva組み込みのハイブリッド構成）の採用方針が確定したため、クリーンなコンテキストでチケット発行・実装へ移行する。
- **試行して破棄したアプローチ**: 
  - 完全自前計算（ズーム/パン/リサイズ時に判定ズレが多発）
  - 完全Konva任せ（0〜100%正規化座標のレスポンシブ性やアンドゥ/リドゥ、動画エクスポートとの整合性が破綻）

---

## 3. ユーザーとの対話で確定した前提概念・確定仕様 (Confirmed Specs & Mental Models)
### ① ハイブリッド構成（最適解）の採用
- **ポインタ・判定**: Konva組み込み（`stage.getRelativePointerPosition()`, `node.getAbsoluteTransform()`）に委譲し、ズーム・パン・CSS拡大縮小時のズレを撲滅する。
- **移動制限**: Konva組み込み（`dragBoundFunc`）を使用し、ピッチ枠外ドラッグ制御のフレーム単位での同期を担保する。
- **データモデル**: 自前の純粋関数（0.0〜100.0% のピッチ正規化座標）を維持し、レスポンシブ性と Single Source of Truth（Zustand/Dexie）を守る。
- **過渡状態の同期**: ドラッグ中はKonvaで高速描画（60fps）し、`onDragEnd` の完了タイミングでのみ純粋関数で正規化座標へ変換してストアに同期する。

### ② 大規模破壊ではなく「3つの局所的なポイント」に絞ったリファクタリング
1. 座標変換ヘルパーの純粋関数化 & 単体テスト（`src/lib/tactical/`）
2. ドラッグ制御・ポインタ取得フックの是正（`useDraggableNode` 等で `onDragEnd` のみストア更新）
3. マーカーコンポーネントの原点（Anchor）統一（Groupの原点を足元接地中心 `(0,0)` に統一）

---

## 4. 現時点の実装状況と検証結果 (Implementation & Verification)
- **現状**: 設計壁打ち・方針策定完了。コード変更は未着手。

### 品質検証結果
- **Biome Check**: `SKIP` (未着手)
- **TypeScript (Scoped)**: `SKIP` (未着手)
- **Vitest**: `SKIP` (未着手)

---

## 5. 残課題 / 次のチャットでやるべきこと (Next Steps & Action Items)
1. **GM (`regista-gm`) によるチケット発行**:
   - `regista-scout` に関連コード（Canvas/ドラッグフック/座標計算）を調査させ、AAWU（1〜3ファイル単位）のDAGチケットを発行・バリデーションする。
2. **Worker による各レイヤーの実装**:
   - L1: 座標変換ヘルパー関数の整理・テスト
   - L2: ドラッグ制御フックおよびStageポインタ取得部の修正
   - L3: マーカー描画Groupのアンカー統一・動作検証

---

## 6. 新しい会話に貼り付けるプロンプト (Next Conversation Prompt)

別の会話（新規Conversation）を開き、以下のプロンプトをそのまま貼り付けて開始してください。

```markdown
現在、Footicsのタスク「戦術ボードCanvas座標・ドラッグ判定のハイブリッド構成リファクタリング」を進めています。
設計方針（自前純粋関数 ＋ Konva組み込みのハイブリッド構成）が確定したため、Orchestrated Modeでチケット発行と実装を開始してください。

### 前提コンテキスト
- **対象タスク**: TACTICAL-BOARD-REFACTOR (戦術ボードCanvas座標・ドラッグ判定のハイブリッド構成リファクタリング)
- **引継ぎサマリーファイル**: file:///home/watter46/src/footics/.regista/handover/TACTICAL-BOARD-REFACTOR-handover.md
- **関連ディレクトリ**:
  - `src/components/features/tactical-unified/canvas/`
  - `src/hooks/tactical/`
  - `src/lib/tactical/`

### 確定した仕様・方針
1. **ハイブリッド構成の採用**: 
   - ポインタ判定・ドラッグ境界は Konva 組み込み（`getRelativePointerPosition`, `dragBoundFunc`）を使用。
   - 戦術座標データは自前の純粋関数（0.0〜100.0% 正規化座標）で管理。
   - ドラッグ中の過渡状態ではReact State/Zustandを更新せず、`onDragEnd` でのみ同期。
2. **局所リファクタリング**: 既存のデータモデルや見た目JSXは維持し、座標変換関数・ドラッグフック・Groupアンカーの3点に絞って修正する。

### 次に着手してほしいこと
GM (`regista-gm`) として起動し、Scoutへ調査を委譲した上で、上記方針に沿ったチケット（DAG構造）を発行してください。
```
