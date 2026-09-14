# 引継ぎサマリー: TACTICAL-TILT-REFACTOR (3Dピッチチルト仕様の整合化と再設計)

## 1. タスク概要
- **チケットID**: `TACTICAL-TILT-REFACTOR`
- **ステータス**: `IN_PROGRESS`
- **タスク名**: 3Dピッチチルト仕様の整合化（/test/pitch-aspect準拠と正対境界線維持）
- **作業ブランチ**: `main`
- **関連ファイル**:
  - `src/app/test/pitch-aspect/components/pitch-stage.tsx`
  - `src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx`
  - `src/features/tactical-unified/objects/canvas/helpers/canvas-pitch-transform-helper.ts`
  - `src/features/tactical-unified/objects/canvas/helpers/canvas-coordinates.ts`

---

## 2. 手詰まり・引継ぎの経緯 (Background & Impasse Reason)
- **手詰まりの原因**: tacticalのチルト機能においてStage全体にrotateXを適用していたため、パースペクティブ消失点のズレ、ズーム・パンとの合成破綻、オブジェクトの潰れが発生していた。
- **試行して破棄したアプローチ**: Konva Stage全体を外側DOMで傾ける手法、および簡易2Dアフィン補正による座標逆変換。

---

## 3. ユーザーとの対話で確定した前提概念・確定仕様 (Confirmed Specs & Mental Models)
### ① 境界線（BoundaryBox / HUD）の完全正対固定
- 境界線インジケーター、アスペクト比選択HUD、描画ツールバーは絶対に傾けず、正対固定（現在のtactical実装の挙動）を100%維持する。

### ② /test/pitch-aspect 準拠の3Dピッチコンテナ
- ピッチの幾何学的中心（`50% 50%`）を回転中心として `rotateX(tilt)` を適用。
- パン・ズーム・チルトを同一空間内で一元管理（`translate3d(panX, panY, 0) scale(zoom) rotateX(tilt)`）。

### ③ Konva組み込み ＋ 自前Raycastingのハイブリッド座標系
- CSS 3Dがかかったピッチ面上のポインター判定を、正確にピッチローカル座標へ逆投影する。

---

## 4. 現時点の実装状況と検証結果 (Implementation & Verification)
1. **`src/app/test/pitch-aspect/`**:
   - 理想的なチルト・パン・ズーム挙動として検証済み。
2. **`src/features/tactical-unified/`**:
   - 現在のチルト実装の課題（Stage全体回転・座標乖離）を特定完了。

### 品質検証結果
- **Biome Check**: `PASS`
- **TypeScript (Scoped)**: `PASS`
- **Vitest**: `PASS`

---

## 5. 残課題 / 次のチャットでやるべきこと (Next Steps & Action Items)
1. GM会話でScoutによる影響範囲調査を行い、チケット（DAG）を発行する。
2. `unified-canvas.tsx` のレイヤー構造を「正対境界線」と「3Dチルト・パン・ズームピッチ」に分離する。
3. `canvas-coordinates.ts` のポインター逆変換を3Dパース対応に更新する。

---

## 6. 新しい会話に貼り付けるプロンプト (Next Conversation Prompt)

別の会話（新規Conversation）を開き、以下のプロンプトをそのまま貼り付けて開始してください。

```markdown
現在、Footicsのタスク「3Dピッチチルト仕様の整合化（/test/pitch-aspect準拠と正対境界線維持）」を進めています。
前回のチャットで仕様分析・方針確定を行い、GMによるチケット発行（DAG構築）へ引き継ぎました。

### 前提コンテキスト
- **対象チケット/タスク**: TACTICAL-TILT-REFACTOR (3Dピッチチルト仕様の整合化)
- **引継ぎサマリーファイル**: file:///home/watter46/src/footics/.regista/handover/TACTICAL-TILT-REFACTOR-handover.md
- **関連ファイル**:
  - src/app/test/pitch-aspect/components/pitch-stage.tsx
  - src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx
  - src/features/tactical-unified/objects/canvas/helpers/canvas-pitch-transform-helper.ts
  - src/features/tactical-unified/objects/canvas/helpers/canvas-coordinates.ts

### 確定した仕様・前提概念
1. 境界線（BoundaryBox / HUD）は正対固定（倒さない）を厳格に維持する。
2. /test/pitch-aspect と同様にピッチ中心基準の3Dチルト・パン・ズーム一元化コンテナ構造を採用する。
3. Konva操作とCSS 3Dのハイブリッドとしてポインター逆変換の整合性を担保する。

### 次に着手してほしいこと
1. Pure Orchestration Modeに従い、GM (`regista-gm`) を通じてScout調査およびチケット発行（DAG）を行ってください。

まずは上記引継ぎサマリーファイル (file:///home/watter46/src/footics/.regista/handover/TACTICAL-TILT-REFACTOR-handover.md) を確認してください。
```
