# 引継ぎサマリー: L2-3D-FIX-002 (3Dチルトの2D簡素化・パフォーマンス最適化およびポインタ操作領域修復)

## 1. タスク概要
- **チケットID**: `L2-3D-FIX-002`
- **ステータス**: `IN_PROGRESS`
- **タスク名**: useCanvasPitchPanおよびuseCanvasWheelZoomの2D/3D Pan計算安定化（および3D簡素化アーキテクチャ移行）
- **作業ブランチ**: `main`
- **関連ファイル**:
  - `src/features/tactical-unified/objects/canvas/hooks/use-canvas-pitch-pan.ts`
  - `src/features/tactical-unified/objects/canvas/hooks/use-canvas-wheel-zoom.ts`
  - `src/features/tactical-unified/objects/canvas/hooks/use-canvas-pointer-dispatcher.ts`
  - `src/features/tactical-unified/objects/canvas/helpers/canvas-pitch-transform-helper.ts`

---

## 2. 手詰まり・引継ぎの経緯 (Background & Impasse Reason)
- **手詰まりの原因**: 3Dチルト時のピッチドラッグ負荷（Raycasting/再描画競合）と、ピッチ上半分がタップ・ドラッグできない事象（CSS 3D Z軸沈み込みによる2Dオーバーレイ層のイベント遮断）。
- **試行して破棄したアプローチ**: 全オブジェクト・ポインタ入力を3D MVP行列とRaycastingで同期逆変換し続けるアプローチ（重く、かつ不要であることが判明）。

---

## 3. ユーザーとの対話で確定した前提概念・確定仕様 (Confirmed Specs & Mental Models)

### ① マーカー・オブジェクトは3D化不要（2Dのまま維持）
- 選手・ボール・矢印・テキスト等のオブジェクトは3D MVP座標計算を行わず、従来の2Dピッチ正規化座標（0〜100%）連動のままシンプルに配置・描画する。

### ② ピッチドラッグ・ズームのパフォーマンス最適化
- 複雑な3D Raycasting同期を排除し、ドラッグ・ズームを2D基準の高速なオフセット計算に簡素化する。

### ③ ピッチ上半分の操作不能問題の解決
- ピッチが奥（Z < 0）に倒れた際に前面の2Dコンテナ/オーバーレイがイベントを遮断している問題を、イベント階層・`pointer-events` またはスクリーン全体でのポインタ捕捉により解消する。

---

## 4. 現時点の実装状況と検証結果 (Implementation & Verification)
1. **`src/features/tactical-unified/objects/canvas/hooks/use-canvas-pitch-pan.ts`**:
   - `tilt === 0` 時の 2D px 差分バイパスを実装し、ヘルパー関数を抽出。
2. **`src/features/tactical-unified/objects/canvas/hooks/use-canvas-wheel-zoom.ts`**:
   - `tilt === 0` 時の 2D カーソル中心ズームバイパスを実装。

### 品質検証結果
- **Biome Check**: `PASS`
- **TypeScript (Scoped)**: `PASS`
- **Vitest**: `PASS (16件 PASS)`

---

## 5. 残課題 / 次のチャットでやるべきこと (Next Steps & Action Items)
1. ピッチ上半分を遮断しているオーバーレイ/コンテナのイベント受け取り構造を修正し、ピッチ全体をクリック・ドラッグ可能にする。
2. 3Dチルト時の不要な3D Raycasting・重い計算を撤廃し、「オブジェクトは2D、ピッチのみ視覚的チルト」の軽量アーキテクチャへのリファクタリングを完遂する。

---

## 6. 新しい会話に貼り付けるプロンプト (Next Conversation Prompt)

別の会話（新規Conversation）を開き、以下のプロンプトをそのまま貼り付けて開始してください。

```markdown
現在、Footicsのタスク「3Dチルトの2D簡素化・パフォーマンス最適化およびポインタ操作領域修復」の実装を進めています。
前回のチャットで仕様調整と途中実装を行い、手詰まり・コンテキスト圧迫を防止するため新規チャットへ引き継ぎました。

### 前提コンテキスト
- **対象チケット**: L2-3D-FIX-002
- **引継ぎサマリーファイル**: file:///home/watter46/src/footics/.regista/handover/L2-3D-FIX-002-handover.md
- **関連ファイル**:
  - src/features/tactical-unified/objects/canvas/hooks/use-canvas-pitch-pan.ts
  - src/features/tactical-unified/objects/canvas/hooks/use-canvas-wheel-zoom.ts
  - src/features/tactical-unified/objects/canvas/hooks/use-canvas-pointer-dispatcher.ts
  - src/features/tactical-unified/objects/canvas/helpers/canvas-pitch-transform-helper.ts

### 確定した仕様・前提概念
1. マーカー・オブジェクトは3D化不要（2Dピッチ正規化座標のまま維持）
2. ピッチ上半分が触れない原因（CSS 3D Z軸沈み込みによるオーバーレイ層のイベント遮断）の解消
3. ドラッグ・ズームの3D複雑計算を撤廃し、パフォーマンスを最優先した軽量化

### 現在の実装状況と検証状態
- 実装状況: use-canvas-pitch-pan / use-canvas-wheel-zoom に 2D バイパス実装済み
- 検証: Biome: `PASS` | TypeCheck: `PASS` | Vitest: `PASS`

### 次に着手してほしいこと
1. ピッチ上半分が触れないイベント遮断の解消（コンテナ構造/z-index/pointer-events）
2. マーカー・オブジェクトの2D維持とドラッグ・ズームの軽量化リファクタリングの完遂

まずは上記引継ぎサマリーファイル (file:///home/watter46/src/footics/.regista/handover/L2-3D-FIX-002-handover.md) と関連コードを確認した上で、実装・修正作業を再開してください。
```
