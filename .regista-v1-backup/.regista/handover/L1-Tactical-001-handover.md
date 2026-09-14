# 引継ぎサマリー: L1-Tactical-001 (3Dパース対応ポインター逆変換およびTransform計算の実装)

## 1. タスク概要
- **チケットID**: `L1-Tactical-001`
- **ステータス**: `IN_PROGRESS`
- **タスク名**: 3Dパース対応ポインター逆変換およびTransform計算の実装
- **作業ブランチ**: `main`
- **関連ファイル**:
  - `src/features/tactical-unified/objects/canvas/helpers/canvas-pitch-transform-helper.ts`
  - `src/features/tactical-unified/objects/canvas/helpers/canvas-coordinates.ts`
  - `src/features/tactical-unified/objects/canvas/hooks/use-canvas-pointer-dispatcher.ts`
  - `src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx`

---

## 2. 手詰まり・引継ぎの経緯 (Background & Impasse Reason)
- **手詰まりの原因**: ズーム時の幾何学中心基準オフセット補正は完了したが、3Dチルト適用時にCSS 3D（ブラウザの自動逆射影）とJS側（`screenToPitch`）でチルト逆変換が二重適用され、Konva Stage上のポインタ判定がピッチの半分しか効かない不具合が判明したため
- **試行して破棄したアプローチ**: Konva Group側で `scaleY = zoom * cosTilt` の二重スケーリングを行うアプローチ（CSS 3Dと干渉するため廃止し、Konva側は等倍zoomに変更済み）

---

## 3. ユーザーとの対話で確定した前提概念・確定仕様 (Confirmed Specs & Mental Models)
### ① CSS 3DとKonva Stageのポインタ座標系
- `unified-canvas.tsx` では Stage 全体に CSS 3D（`stageTiltStyle: rotateX(tilt)` / `perspective: 1200px`）が適用されている。
- ブラウザが CSS 3D 変形された要素上のマウスイベントをディスパッチする際、`stage.getPointerPosition()` には既にブラウザによる 3D 逆変換後の 2D Stage 平面座標が渡される。

### ② ポインタ逆変換のチルト処理方針
- `use-canvas-pointer-dispatcher.ts` で Konva イベントから受け取る座標に対しては、JS側でチルトの 3D 逆射影を二重適用せず、2D 中心基準ズーム・パンのみを逆変換するよう整合させる。

---

## 4. 現時点の実装状況と検証結果 (Implementation & Verification)
1. **`src/features/tactical-unified/objects/canvas/helpers/canvas-pitch-transform-helper.ts`**:
   - `calculatePitchTransform` を修正し、ピッチ幾何学中心基準（50% 50%）で `deltaX = (pitchWidth / 2) * (1 - zoom)`, `deltaY = (pitchHeight / 2) * (1 - zoom)` を計算するよう改修完了。
2. **`src/features/tactical-unified/objects/canvas/helpers/canvas-coordinates.ts`**:
   - 3D射影・逆射影ロジックの中心基準整合を完了。
3. **`canvas-coordinates.test.ts` / `pitch-tilt-export.test.ts`**:
   - 中心基準ズーム・チルト逆変換の単体テストを更新・拡充。

### 品質検証結果
- **Biome Check**: `PASS`
- **TypeScript (Scoped)**: `PASS`
- **Vitest**: `PASS` (`canvas-coordinates.test.ts`: 14/14, `pitch-tilt-export.test.ts`: 7/7)

---

## 5. 残課題 / 次のチャットでやるべきこと (Next Steps & Action Items)
1. `use-canvas-pointer-dispatcher.ts` または `canvas-coordinates.ts` において、CSS 3D Stage 内の Konva ポインタ判定でチルトが二重逆変換されないよう修正
2. 3Dチルト時（tilt > 0）にピッチ全域で正確にポインタ判定（ドラッグ、描画、ホバー）が機能することを検証・テスト
3. `rtk biome check`、`rtk pnpm type-check:scoped`、`rtk vitest run` を実行し、全検証パス後に `make done L1-Tactical-001` で完了

---

## 6. 新しい会話に貼り付けるプロンプト (Next Conversation Prompt)

別の会話（新規Conversation）を開き、以下のプロンプトをそのまま貼り付けて開始してください。

```markdown
現在、Footicsのタスク「3Dパース対応ポインター逆変換およびTransform計算の実装 (L1-Tactical-001)」の実装を進めています。
前回のチャットで中心基準ズーム補正と基本実装を行い、3Dチルト時の二重逆変換の課題を特定したため、新規チャットへ引き継ぎました。

### 前提コンテキスト
- **対象チケット**: L1-Tactical-001 (3Dパース対応ポインター逆変換およびTransform計算の実装)
- **引継ぎサマリーファイル**: file:///home/watter46/src/footics/.regista/handover/L1-Tactical-001-handover.md
- **関連ファイル**:
  - src/features/tactical-unified/objects/canvas/hooks/use-canvas-pointer-dispatcher.ts
  - src/features/tactical-unified/objects/canvas/helpers/canvas-coordinates.ts
  - src/features/tactical-unified/objects/canvas/helpers/canvas-pitch-transform-helper.ts
  - src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx

### 確定した仕様・前提概念
1. `unified-canvas.tsx` で Stage 全体に CSS 3D (`rotateX(tilt)`) がかかっているため、Konva イベントの `stage.getPointerPosition()` は既にブラウザにより 3D 逆変換された Stage 平面座標となる。
2. JS側でさらにチルト 3D 逆射影を二重適用するとピッチの半分しか掴めなくなるため、Stage イベントからの逆変換ではチルトを二重適用しないよう整合させる。

### 現在の実装状況と検証状態
- 実装状況: 中心基準ズーム（deltaX/deltaY）およびKonva Group等倍zoom化済み
- 検証: Biome: `PASS` | TypeCheck: `PASS` | Vitest: `PASS`

### 次に着手してほしいこと
1. `use-canvas-pointer-dispatcher.ts` または `canvas-coordinates.ts` での Konva イベント受信時のチルト二重逆変換の解消
2. チルト時（例: tilt=30）におけるピッチ全域でのポインタドラッグ・描画判定の動作確認・単体テスト追加
3. `rtk biome check`, `rtk pnpm type-check:scoped`, `rtk vitest run` をパスさせ、Write-back Log を記入して完了

まずは上記引継ぎサマリーファイル (file:///home/watter46/src/footics/.regista/handover/L1-Tactical-001-handover.md) を確認した上で、実装・修正作業を再開してください。
```
