# 引継ぎサマリー: L4-CANVAS-001 (案1: ピッチ背景と選手レイヤーの分離による3D/ビルボード化およびドラッグ判定修正)

## 1. タスク概要
- **チケットID**: `L4-CANVAS-001`
- **ステータス**: `IN_PROGRESS`
- **タスク名**: ピッチ背景3Dと選手正対2D（ビルボード）の分離およびドラッグ判定消失の修正
- **作業ブランチ**: `feature/3d-canvas-rework`
- **関連ファイル**:
  - `src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx`
  - `src/features/tactical-unified/objects/canvas/hooks/use-canvas-pointer-dispatcher.ts`
  - `src/features/tactical-unified/objects/canvas/hooks/use-canvas-pitch-pan.ts`
  - `src/features/tactical-unified/objects/canvas/helpers/canvas-coordinates.ts`
  - `src/features/tactical-unified/objects/player/components/player-marker.tsx`

---

## 2. 手詰まり・引継ぎの経緯 (Background & Impasse Reason)
- **手詰まりの原因**: `unified-canvas.tsx` で `<Stage>` 全体を外側 DOM の CSS 3D (`rotateX`) で傾斜させていたため、Konva 内部の選手マーカーやボール等もピッチと一緒に寝そべって楕円化し、かつ Konva の 2D Hit Canvas との座標乖離によりピッチ上半分のドラッグ判定が空振りしていた。
- **試行して破棄したアプローチ**: `use-canvas-pointer-dispatcher.ts` のみで座標逆変換を修正しようとしたが、選手 DnD は Konva 組み込みの `draggable={true}` を使用しており、DOM レベルで Stage 全体が 3D 傾斜している限り Konva の Hit Test が物理的に破綻するため、レイヤー分離（案1）へ設計を変更する。

---

## 3. ユーザーとの対話で確定した前提概念・確定仕様 (Confirmed Specs & Mental Models)
### ① ピッチのみ 3D 傾斜 / 選手・ボールは正対 2D（ビルボード立位）
- ピッチ（芝生・白線）のみを 3D パースペクティブ（CSS 3D rotateX または台形投影）で傾斜させて奥に見せる。
- 選手マーカー（円・背番号・名前）やボール、アノテーションはカメラに正対した 2D 平面（真円・水平テキスト）のまま描画する。
- 選手の足元位置（接地中心）は 3D ピッチ上の射影座標に正確に配置される。

### ② ドラッグ判定（Hit Test）の正常化
- 選手・オブジェクトレイヤーが正対 2D 平面（チルトなしの Konva Stage/Layer）に存在するため、画面上の見た目と Konva の Hit Canvas が 100% 一致し、ピッチ上半分でも選手ドラッグが確実に動作する。
- パンドラッグ時の `isInsidePitch` 判定およびクランプ処理も、分離された座標系に合わせて正しく連動させる。

---

## 4. 現時点の実装状況と検証結果 (Implementation & Verification)
1. **`src/features/tactical-unified/objects/canvas/hooks/use-canvas-pointer-dispatcher.ts`**:
   - `matrix-coordinates.ts` 依存の削除と `unprojectScreenYToCssRotateX` の導入を実施済み（ただしレイヤー分離に伴い再調整が必要）。
2. **`src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx`**:
   - 現在は `<Stage>` 全体が 3D ラッパー内にある状態。ピッチ背景用 Stage（または 3D Group/DOM）と、オブジェクト用 Stage の構造分離が必要。

### 品質検証結果
- **Biome Check**: `PASS`
- **TypeScript (Scoped)**: `PASS`
- **Vitest**: `PASS`

---

## 5. 残課題 / 次のチャットでやるべきこと (Next Steps & Action Items)
1. **チケット修正/再発行 (GM)**:
   - `L4-CANVAS-001` の要件を「案1: ピッチ背景3Dと選手正対2D（ビルボード）の分離およびポインタ判定修正」へ更新、または後続チケット（`L4-CANVAS-003` 等）を発行。
2. **`unified-canvas.tsx` のレイヤー構成再設計**:
   - ピッチ背景（チルト適用）と選手・アノテーション（正対 2D）の描画レイヤーを分離。
   - 選手のスクリーン座標配置に 3D 射影計算を適用し、マーカー自体は真円のまま描画。
3. **ドラッグ＆ドロップおよびパン操作の結合検証**:
   - チルト状態（tilt > 0）でピッチ上半分・下半分の選手ドラッグ、パンドラッグが共に正常動作することを検証。

---

## 6. 新しい会話に貼り付けるプロンプト (Next Conversation Prompt)

別の会話（新規Conversation）を開き、以下のプロンプトをそのまま貼り付けて開始してください。

```markdown
現在、Footicsのタスク「L4-CANVAS-001: 案1（ピッチ背景3Dと選手正対2Dビルボード分離）によるドラッグ判定修正」の実装/チケット調整を進めています。
前回のチャットで根本原因の究明と方針確定（案1）を行い、新規チャットへ引き継ぎました。

### 前提コンテキスト
- **対象チケット**: L4-CANVAS-001 (ピッチ背景3Dと選手正対2Dビルボード分離およびドラッグ判定修正)
- **引継ぎサマリーファイル**: file:///home/watter46/src/footics/.regista/handover/L4-CANVAS-001-handover.md
- **関連ファイル**:
  - src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx
  - src/features/tactical-unified/objects/canvas/hooks/use-canvas-pointer-dispatcher.ts
  - src/features/tactical-unified/objects/canvas/hooks/use-canvas-pitch-pan.ts
  - src/features/tactical-unified/objects/player/components/player-marker.tsx

### 確定した仕様・前提概念
1. ピッチ背景のみ 3D 傾斜させ、選手マーカー・ボール・アノテーションはカメラに正対した 2D（真円・水平テキスト）のビルボード立位とする。
2. 選手レイヤーを正対 2D 平面とすることで Konva の Hit Canvas 乖離を根本解消し、ピッチ上半分でも確実にドラッグ可能にする。

### 次に着手してほしいこと
1. GM または Worker として、上記確定方針（案1）に基づくチケット `.regista/tickets/L4-CANVAS-001.md` の仕様更新および実装作業の開始。
2. `unified-canvas.tsx` におけるピッチ背景と選手・アノテーションレイヤーの分離実装。

まずは上記引継ぎサマリーファイル (file:///home/watter46/src/footics/.regista/handover/L4-CANVAS-001-handover.md) を確認した上で、作業を開始してください。
```
