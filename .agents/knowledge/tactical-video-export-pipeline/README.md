# Tactical Video Export Pipeline & High Performance 1080p MP4 Architecture

## 1. 概要 (Overview)
戦術アニメーションの動画書き出しにおいて、**MP4 (H.264 / AVC `avc1.4d002a`)** 形式への完全移行、白浮き・文字つぶれ問題の根絶、および**品質（1080p フルHD・16Mbps・60fps）を一切落とさずに「Web Worker 完全バックグラウンド化」と「OffscreenCanvas ゼロDOM超高速レンダリング」**を実現した設計について記録します。

## 2. アーキテクチャと超高速化手法 (Worker + OffscreenCanvas Pipeline)

### 1. Web Worker によるメインスレッド・DOMの完全解放
- **画面上の Konva Stage 非依存**: 画面の Konva Stage をリサイズしたり操作したりせず、独立した専用 Web Worker (`tactical-export.worker.ts`) 内で動画生成を実行。
- **UI 操作・別タブの完全ノンブロッキング**: エクスポート中もユーザーは戦術ボードの編集やマーカー操作をストレスなく行え、別タブに移動してもスロットリングやタイマー遅延の影響を受けません。

### 2. ピッチ背景の事前キャッシュ (1-Pass Blit)
- ピッチの白線・アーク・ペナルティエリアなどのベクターグラフィックを `createPitchBackground` により 1 枚の `OffscreenCanvas` に事前描画。
- 毎フレームの描画処理は `ctx.drawImage(bgCanvas, 0, 0)` の高速 GPU blit（サブミリ秒）のみ。

### 3. Pure Canvas 2D マーカーレンダラ & 選手写真最適化パイプライン (ゼロDOM / ゼロKonva / Zero Fetch Skip)
- Konva のツリー探索・レイヤー再描画オーバーヘッドを完全排除した純粋な 2D Canvas 直接描画 (`renderPitchFrame`)。
- 選手マーカー（背番号、写真クリッピング、アウトライン縁取り + ドロップシャドウ）とボールを高精細ラスタライズ。
- **Zero Fetch Skip**: 写真を使用していない（insideContent !== 'photo'）場合はネットワークフェッチ・非同期待機を完全にスキップ。
- **In-Memory Blob Caching & Timeout**: 一度取得した選手写真はメモリ（Blob レベル）にキャッシュし、2回目以降のフェッチを不要化。3秒タイムアウト制御により外部CDN遅延によるエクスポート待機を防止。
- 選手写真（photoUrl）はメインスレッドで `createImageBitmap` し、Transferable オブジェクトとして Worker へゼロコピー転送。

### 4. WebCodecs (VideoEncoder) + mp4-muxer 直結パイプライン
- `OffscreenCanvas` から `new VideoFrame(offscreenCanvas, { timestamp, duration })` を生成し、ハードウェアエンコーダ（GPU）に直結。
- バックプレッシャー閾値（`encodeQueueSize > 24`）によるスループット最適化。
- 生成された MP4 バッファ (`ArrayBuffer`) を Transferable でメインスレッドに返却し、即座にダウンロード。
- 数秒〜十数秒のアニメーションを **0.5〜1秒未満** でエクスポート完了。
