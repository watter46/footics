# 引継ぎサマリー: L3-Tactical-028 (ピッチ単体チルト(2.5D)変形と境界線固定エクスポート(PNG)の統合)

## 1. タスク概要
- **チケットID**: `L3-Tactical-028`
- **タスク名**: ピッチ単体チルト(2.5D)変形と境界線固定エクスポート(PNG)の統合
- **作業ブランチ**: `main`
- **関連ファイル**:
  - `src/features/tactical-unified/components/canvas/unified-canvas.tsx`
  - `src/features/tactical-unified/components/canvas/helpers/canvas-pitch-transform-helper.ts`
  - `src/features/tactical-unified/components/canvas/helpers/canvas-coordinates.ts`
  - `src/features/tactical-unified/hooks/use-konva-export.ts`
  - `src/features/tactical-unified/hooks/konva-export-helpers.ts`
  - `src/app/test/pitch-aspect/components/pitch-stage.tsx`
  - `src/app/test/pitch-aspect/hooks/use-pitch-interaction.ts`
  - `src/app/test/pitch-aspect/hooks/use-pitch-export.ts`

---

## 2. 手詰まり・引継ぎの経緯 (Background & Impasse Reason)
- **手詰まりの原因**: ユーザーのメンタルモデルは「ピッチの下の辺が固定され、ピッチの奥（上側）が手前に倒れ込む（下辺を支点にして倒す）」という想定。また、既存プロトタイプである `/test/pitch-aspect` のロジックを参照・比較した上でアーキテクチャや見え方を整合させて実装したいという指示があったため。
- **試行して破棄したアプローチ**: 
  1. ピッチ中心基準（centered deltaY）でのアフィン変形（上下均等に圧縮されるため、下辺が上がってしまい不自然だった）。
  2. 現状の Konva 2D アフィン変換のみでの完結（`/test/pitch-aspect` で採用されている CSS 3D `perspective` + `rotateX` の台形遠近感との比較検討が未実施）。

---

## 3. ユーザーとの対話で確定した前提概念・確定仕様 (Confirmed Specs & Mental Models)
### ① 下の辺を支点とした奥側チルト (Bottom-Edge Anchored Tilt)
- チルト角度（0°〜60°または35°）を変更した際、ピッチの下辺スクリーンY座標は固定（支点）され、ピッチの奥側（上辺）のみが手前に向かって倒れ込む。
- 角度を変えてもピッチの手前（下辺）が浮き上がったり動いたりしないこと。

### ② 境界線枠（BoundaryBox）の独立スクリーン配置
- 境界線（BoundaryBox / HUD）はピッチのチルト回転の外側（スクリーン平面）に正対して固定配置される。
- エクスポート時（PNG・クリップボード等）は、境界線枠で定義された矩形比率通りにチルト状態のピッチが切り抜かれてキャプチャされる。

### ③ `/test/pitch-aspect` とのアーキテクチャ比較・検討
- `/test/pitch-aspect` の実装:
  - 親コンテナ: `perspective: '1200px'`
  - ピッチコンテナ: `transform: translate3d(...) scale(...) rotateX(${tilt}deg)`, `transformStyle: 'preserve-3d'`
  - 境界線マスターフレーム: `aspectRatio` に合わせた矩形内にピッチSVGを配置。
  - エクスポート: `use-pitch-export.ts` で DOM キャプチャ（`html-to-image` 等）。
- `tactical-unified` の実装:
  - react-konva (Canvas Stage) 上に複数レイヤー（背景、アノテーション、選手、ボール、UI）を展開。
  - Konva ノードレベルでの 2D アフィン変換（現在）か、あるいは Konva Stage または外側ラッパーに対する CSS 3D パースペクティブ適用＋キャプチャパイプラインの統合か、比較検討して最適なアプローチを決定する。

---

## 4. 現時点の実装状況と検証結果 (Implementation & Verification)
1. **`src/features/tactical-unified/components/canvas/helpers/canvas-pitch-transform-helper.ts`**:
   - `deltaY = pitchHeight * zoom * (1 - cosTilt)` により、下辺固定（bottom-edge anchored）の幾何学オフセット計算を実装。
   - `calculateExportCropRect` を集約し、境界線枠とピッチチルトのクロップ矩形を算出。
2. **`src/features/tactical-unified/components/canvas/helpers/canvas-coordinates.ts`**:
   - `screenToPitch` を下辺固定の幾何学逆変換に更新。
3. **`src/features/tactical-unified/hooks/use-konva-export.ts` & `konva-export-helpers.ts`**:
   - 重いフォーマット書き出し処理（ZIP, GIF, MP4）をヘルパーに分離し、フック行数を 116行にスリム化。Cognitive Complexity や Biome チェックを完全クリア。
4. **テストファイル (`pitch-tilt-export.test.ts`, `pitch-tilt-store.test.ts`)**:
   - 下辺固定アサーション（`bottomY` がチルト前後で不変であること）を追加し、28件すべてのテストが PASS。

### 品質検証結果
- **Biome Check**: `PASS`
- **TypeScript (Scoped)**: `PASS`
- **Vitest**: `PASS (28件)`

---

## 5. 残課題 / 次のチャットでやるべきこと (Next Steps & Action Items)
1. **`/test/pitch-aspect` の詳細コード確認と UI 比較**:
   - `src/app/test/pitch-aspect/components/pitch-stage.tsx`
   - `src/app/test/pitch-aspect/hooks/use-pitch-interaction.ts`
   - `src/app/test/pitch-aspect/hooks/use-pitch-export.ts`
   - CSS `rotateX` + `transform-origin: bottom center` 等の見た目と、Konva 側での見え方・操作性を比較する。
2. **Tactical-Unified への最適な実装方式の選定**:
   - 案A: Konva の内部 Group に対して下辺固定アフィン変換を適用（現在の実装をさらに `/test/pitch-aspect` に近づける）。
   - 案B: Konva Stage 全体（またはピッチ描画用サブStage）に CSS 3D `perspective` & `rotateX` を適用し、境界線は別レイヤーでスクリーン平面に固定する。
   - 案C: `/test/pitch-aspect` のような CSS 3D パースペクティブを Konva 内でエミュレートするか、HTML オーバーレイ方式を採用するか。
3. **境界線固定エクスポートの動作確認**:
   - 選定した方式において、PNG キャプチャ時に境界線枠の比率通りに高品質に出力されることを担保する。

---

## 6. 新しい会話に貼り付けるプロンプト (Next Conversation Prompt)

別の会話（新規Conversation）を開き、以下のプロンプトをそのまま貼り付けて開始してください。

```markdown
現在、Footicsのタスク「L3-Tactical-028: ピッチ単体チルト(2.5D)変形と境界線固定エクスポート(PNG)の統合」を進めています。
ユーザーから「ピッチの下の辺を支点にして奥側が倒れる挙動とし、/test/pitch-aspect のロジックを参照させて比較してから実装する」との指示があり、新規チャットへ引き継ぎました。

### 前提コンテキスト
- **対象チケット**: L3-Tactical-028 (ピッチ単体チルト(2.5D)変形と境界線固定エクスポート(PNG)の統合)
- **引継ぎサマリーファイル**: file:///home/watter46/src/footics/.regista/handover/L3-Tactical-028-handover.md
- **関連ファイル**:
  - `src/app/test/pitch-aspect/components/pitch-stage.tsx`
  - `src/app/test/pitch-aspect/hooks/use-pitch-interaction.ts`
  - `src/app/test/pitch-aspect/hooks/use-pitch-export.ts`
  - `src/features/tactical-unified/components/canvas/unified-canvas.tsx`
  - `src/features/tactical-unified/components/canvas/helpers/canvas-pitch-transform-helper.ts`
  - `src/features/tactical-unified/hooks/use-konva-export.ts`

### 確定した仕様・前提概念
1. ピッチの下辺が固定（支点）され、ピッチの奥（上側）のみが手前に倒れ込む2.5Dチルト表現。
2. 境界線枠（BoundaryBox）はスクリーン平面に正対したまま固定され、エクスポート時にその枠の比率通りにPNGキャプチャされること。
3. `/test/pitch-aspect` の CSS 3D（perspective, rotateX, transform-origin）のロジック・見た目と比較し、tactical-unified（Konvaベース）への最適な統合方式を検討・実装すること。

### 現在の実装状況と検証状態
- 実装状況: 下辺固定の幾何学計算（deltaY）および use-konva-export のリファクタリング済み。
- 検証: Biome: `PASS` | TypeCheck: `PASS` | Vitest: `PASS (28件)`

### 次に着手してほしいこと
1. `src/app/test/pitch-aspect/` の実装を読み込み、CSS 3D パースペクティブとエクスポート方式のロジックを確認・比較する。
2. tactical-unified において、ピッチの下辺を支点にして奥側が倒れる立体感を `/test/pitch-aspect` と同等以上のクオリティで実現し、境界線枠固定でのPNGエクスポートと統合する。
3. Biome, TypeCheck, Vitest を実行して品質を担保する。

まずは上記引継ぎサマリーファイル (file:///home/watter46/src/footics/.regista/handover/L3-Tactical-028-handover.md) を確認した上で作業を開始してください。
```
