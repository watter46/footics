# 引継ぎサマリー: L3-3D-002 (エクスポートプレビューおよび動画エクスポートへのMVP行列・アスペクト比伝達対応)

## 1. タスク概要
- **チケットID**: `L3-3D-002`
- **ステータス**: `TODO`
- **タスク名**: エクスポートプレビューおよび動画エクスポートへのMVP行列・アスペクト比伝達対応
- **作業ブランチ**: `main`
- **関連ファイル**:
  - `src/features/tactical-unified/panels/export/export-modal-body.tsx`
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx`
  - `src/features/tactical-unified/hooks/use-konva-video-export.ts`
  - `src/features/tactical-unified/objects/canvas/helpers/canvas-pitch-transform-helper.ts`
  - `src/lib/tactical/export/tactical-frame-renderer.ts`
  - `src/lib/tactical/export/video-export-engine.ts`

---

## 2. 引継ぎの経緯 (Background)
- L3-3D-001A / L3-3D-001B の実装により、レンダラー（`tactical-frame-renderer.ts`）および動画エクスポートエンジン（`video-export-engine.ts` / `video-export-worker.ts`）に `mvpMatrix` による3D透視投影機能が整備された。
- しかし、エクスポートモーダルのプレビュー画面（`export-preview-player.tsx`）および動画エクスポートトリガーフック（`use-konva-video-export.ts`）で `pitchTransform` / `mvpMatrix` が渡されておらず、キャンバス上のチルト・ズーム・パンがプレビューやエクスポートに反映されない問題が判明したため、チケット `L3-3D-002` を新規発行して実装を委譲する。

---

## 3. 確定仕様 (Confirmed Specs)
### ① エクスポートプレビューのMVP行列反映
- `export-modal-body.tsx` から `ExportPreviewPlayer` に `pitchTransform={activeSlide?.pitchTransform}` を渡す。
- `export-preview-player.tsx` で `buildExportMVPMatrix` を使用してプレビュー用キャンバスサイズ・アスペクト比から `mvpMatrix` を算出し、`renderTacticalFrameToCanvas` に渡す。

### ② プレビュー解像度のアスペクト比対応
- `export-preview-player.tsx` で `16:9` (640x360), `9:16` (360x640), `4:5` (360x450), `1:1` (360x360) の4種のアスペクト比に応じたプレビューサイズを設定する。

### ③ 動画エクスポート時のカメラ設定伝達
- `use-konva-video-export.ts` で `exportTacticalVideo` を呼び出す際、引数に `pitchTransform: activeSlide?.pitchTransform` を追加する。

---

## 4. 現時点の実装状況と検証結果 (Implementation & Verification)
1. **`L3-3D-001A`**: Worker通信インターフェース定義とFrameRenderer透視投影描画対応（実装完了・型/Lint/テストパス）
2. **`L3-3D-001B`**: `canvas-pitch-transform-helper.ts` の `buildExportMVPMatrix` および `video-export-engine.ts` の `mvpMatrix` 送信（実装完了・型/Lint/テストパス）
3. **`L3-3D-002`**: チケット発行完了・DAGバリデーション通過

---

## 5. 残課題 / 次のチャットでやるべきこと (Next Steps & Action Items)
1. 新規チャットを開き、`L3-3D-002` の実装を指示する。
2. 対象3ファイル（`export-modal-body.tsx`, `export-preview-player.tsx`, `use-konva-video-export.ts`）を更新し、型チェック・Biomeチェックを通過させる。
3. プレビューとエクスポートでチルト・ズーム・パン・アスペクト比が正しく反映されていることを手動確認する。

---

## 6. 新しい会話に貼り付けるプロンプト (Next Conversation Prompt)

別の会話（新規Conversation）を開き、以下のプロンプトをそのまま貼り付けて開始してください。

```markdown
以下のチケットの実装をお願いします。

- チケットファイル: file:///home/watter46/src/footics/.regista/tickets/L3-3D-002.md
- 引継ぎサマリー: file:///home/watter46/src/footics/.regista/handover/L3-3D-002-handover.md

対象ファイルを編集し、チケットに記載された受入基準と検証コマンド（型チェック・Biomeチェック）をクリアして、Write-back Logを更新してください。
```
