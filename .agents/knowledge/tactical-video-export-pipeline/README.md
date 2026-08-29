# Tactical Video Export Pipeline & High Performance 1080p MP4 Architecture

## 1. 概要 (Overview)
戦術アニメーションの動画書き出しにおいて、**MP4 (H.264 / AVC `avc1.4d002a`)** および **Transparent WebM (VP9 / `webm-muxer` アルファ透過)** 形式への完全移行、白浮き・文字つぶれ問題の根絶、および**品質（1080p フルHD・16Mbps・60fps）を一切落とさずに「Web Worker 完全バックグラウンド化」と「OffscreenCanvas ゼロDOM超高速レンダリング」**を実現した設計について記録します。

## 2. アーキテクチャと超高速化手法 (Worker + OffscreenCanvas Pipeline)

### 1. Web Worker によるメインスレッド・DOMの完全解放 (Zero UI Freeze - AAWU 3-5-WORKER)
- **UI スレッド 100% 解放**: `video-export-worker.ts` へ `slides` JSON データを `postMessage` し、UI スレッドを一切ブロックすることなくバックグラウンドで並列動画生成を実行。
- **UI 操作・別タブの完全ノンブロッキング**: エクスポート中もユーザーは戦術ボードの編集やマーカー操作をストレスなく行え、画面のカクツキやフリーズが完全にゼロ（Zero UI Freeze）。
- **ゼロコピー Transferable 返却**: 生成完了した動画バッファ（`ArrayBuffer`）を Transferable オブジェクト（`[buffer]`）としてメインスレッドへゼロコピー転送。

### 2. VP9 Transparent WebM の WebCodecs 高速化 (`webm-muxer` - AAWU 3-5-WORKER)
- **等速 MediaRecorder の完全脱却**: 従来の等速リアルタイムキャプチャに依存せず、WebCodecs `VideoEncoder`（`alpha: 'keep'`）＋ `webm-muxer` によるオフライン直接エンコードへ移行。
- **透過 WebM の爆速化 (200fps+)**: アルファチャンネル付き OffscreenCanvas から直接 `VideoFrame` を生成し、MP4 同等の超高速レートで動画編集用透過 WebM を出力。

### 3. Pure Canvas 2D マーカーレンダラ & 選手写真最適化パイプライン (ゼロDOM / ゼロKonva / Zero Fetch Skip)
- Konva のツリー探索・レイヤー再描画オーバーヘッドを完全排除した純粋な 2D Canvas 直接描画 (`renderTacticalFrameToCanvas`)。
- 選手マーカー（背番号、写真クリッピング、高精細アウトライン縁取り）を高速ラスタライズ。
- 重い `shadowBlur` 演算を排除し、黒ストローク縁取り＋白文字フィルにより視認性と爆速描画を両立。
- **In-Memory Blob Caching & Timeout**: 一度取得した選手写真はメモリ（Blob レベル）にキャッシュし、2回目以降のフェッチを不要化。

### 4. WebCodecs (VideoEncoder) + mp4-muxer / webm-muxer 直結パイプライン
- `OffscreenCanvas` から `new VideoFrame(offscreenCanvas, { timestamp, duration })` を生成し、ハードウェアエンコーダ（GPU）に直結。
- **ハードウェアアクセラレーション最優先 (`prefer-hardware`)**: `VideoEncoder.isConfigSupported` で GPU ハードウェアアクセラレーションを優先選択。
- **バックプレッシャー制御の最適化 (`encodeQueueSize > 30` で待機、`<= 10` で即時再開)**: GPU パイプラインを枯渇させず最大効率でフレームを供給。
- **用途別プリセット対応 (1080p @ 30fps ⚡️爆速 / 60fps 🏆最高品質)**:
  - 30fps: X (Twitter) / SNS 共有向け。1080p フルHD解像度を完全に保ちながらフレーム数半減で約2倍速エクスポート。
  - 60fps: YouTube / アーカイブ向け。最高滑らかさを維持。

## 3. Tactical Unified (Konva Stage) オフライン動画エクスポート品質保証規約 (AAWU 3-5-FIX)

### 1. 同期即時描画 (`layer.draw()` / `stage.draw()`) によるフレーム同期 (フォールバック時)
- **課題**: リアルタイム再生用の `batchDraw()` は非同期 (rAFスケジュール) であるため、オフラインループで `await onRenderFrame(timeMs)` の直後に `stage.toCanvas()` を呼ぶと前フレームの画像がキャプチャされ、ジッター・コマ落ちの原因となる。
- **解決策**: エクスポートループ時には `applyFrameToCanvas(timeMs, registry, stageW, stageH, true)` を呼び出し、`playerLayer.draw()`, `ballLayer.draw()`, `annotationLayer.draw()`, `backgroundLayer.draw()`, `stage.draw()` を同期的に実行してキャプチャ前の描画を 100% 保証する。

### 2. `clearRect()` によるアルファ蓄積二重合成白飛び防止
- **課題**: キャンバスコンテキストで `clearRect()` を行わずに `fillRect()` や `drawImage()` を重ねると、半透明ゾーンやマーカーのアルファブレンディングが累積し、白浮きや異常なコントラスト変化が発生する。
- **解決策**: `offscreenCtx.clearRect(0, 0, width, height)` および `streamCtx.clearRect(0, 0, width, height)` をフレーム描画直前に必ず呼び出し、常にクリーンなバッファに描画する。

### 3. 2K QHD (2560x1440) 60fps / 30Mbps / 1s Keyframe 標準化
- **基準解像度**: フルスクリーン再生時でも輪郭がカミソリのようにシャープに見える 2K / 1440p QHD (`2560x1440` for 16:9, `1440x2560` for 9:16) をベースライン解像度として保証。4K へのスケールアップにも完全対応。
- **ビットレート**: 超高解像度 2K 60fps に最適化された 30Mbps (`30_000_000` bps) を標準適用。
- **キーフレーム間隔**: `frameIdx % fps === 0` (1秒ごとに 1 Keyframe) を設定し、X/YouTube の再エンコード互換性とシーク性を担保。
- **偶数解像度スナップ**: H.264/VP9 の偶数寸法要件（`exportWidth % 2 === 0`）を境界線ボックスクロップ計算時に厳格保証。

## 4. 色再現性と不透明ベース平坦化 & クリスプエッジ最適化 (Pixel-Grid & Chroma Bleed Safeguard)

### 1. サブピクセル滲み（アンチエイリアスぼけ）の根絶
- **ピクセルグリッドスナップ (`snap = (v) => Math.round(v)`)**: ピッチ白線、ペナルティエリア、センターサークル、選手マーカー、矢印、テキストの全座標・寸法を整数ピクセルに完全アライメント。
- **偶数ピクセル線幅 (`pitchLineWidth % 2 === 0`)**: 偶数線幅化により境界が上下左右に対称ラスタライズされ、小数座標によるアンチエイリアス滲み（ファジーなぼやけ）を完全排除。

### 2. YUV 4:2:0 クロマサブサンプリング色滲み（Chroma Bleed）防止
- **課題**: H.264/VP9 の YUV 4:2:0 圧縮では色差成分（U, V）が縦横 1/2 に間引かれるため、彩度の高いチームカラー（赤・青）が暗い背景と接すると境界が滲み・ぼやけの原因となる。
- **解決策**:
  - 選手マーカー外周に `#020617` のソリッドダークボーダー（Outer Dark Ring）を配置し、色差サンプリングの境界を物理的に保護。
  - 内側ホワイトリング＋背番号・選手名への高コントラスト黒アウトラインストローク（`strokeText`）を施し、カミソリのようにシャープな視認性を達成。

### 3. `offscreenCanvas.getContext('2d', { alpha: false })` による不透明 sRGB 保証
- **課題**: H.264 (MP4) は YUV 4:2:0 形式でありアルファチャンネルをサポートしない。`alpha: true` のキャンバスを `VideoFrame` に渡すと、Chromium のカラーコンバータ (libyuv) が透過ピクセルに対して Premultiplied Alpha（黒マット乗算）を適用し、暗部が異常に黒く沈み、明暗のコントラストが極大化する。
- **解決策**: MP4 出力用のオフスクリーンキャンバスを `alpha: false` に設定し、ブラウザ/GPU に 100% 不透明な sRGB バッファであることを明示する。

### 4. ソリッド背景ベース（Opaque Flattening）による透過ピクセル完全排除
- **課題**: `stage.toCanvas()` の出力には、ピッチ外周や半透明オブジェクト（影、ゾーン、視野コーン、光彩）の透過ピクセルが含まれうる。
- **解決策**: フレーム描画ごとにまず不透明ソリッド背景色（`fillStyle = '#020617'; fillRect(...)`）を敷き、その上に `sourceCanvas` を `drawImage` することで、全ピクセルを Alpha = 1.0 に平坦化。透過ピクセルをゼロにすることで、YUV 変換時のコントラスト暴走・黒つぶれ・白飛びを完全に防止し、Stage プレビューと 100% 完全一致する色精度を達成する。

### 5. H.264 High Profile Level 4.2 (`avc1.64002a`) 最優先適用
- **課題**: Baseline Profile (`avc1.42001f`) が選択されると、色階調・ダイナミックレンジの圧縮によって暗部が浮き上がりコントラストが崩れる。
- **解決策**: コーデック候補の先頭を `avc1.64002a` (High Profile Level 4.2) / `avc1.640033` (High Profile Level 5.1) に設定し、GPU ハードウェアエンコードで最高の色深度と階調再現性を担保する。

### 6. `shadowBlur` の完全排除と黒ストローク縁取り化
- **課題**: テキストやマーカーの `shadowBlur` による半透明アルファ拡散は、YUV 変換時に文字の周囲にグレーのモヤ（黒浮き・白飛び）を誘発する。
- **解決策**: `shadowBlur` を全廃し、`stroke="#020617"`（黒アウトライン縁取り）＋ `fill="#ffffff"`（白文字フィル）による物理的エッジ引き締めを適用する。

### 7. Bフレーム生成防止による全プレーヤー再生互換性（ブラックアウト防止）
- **課題**: `VideoEncoder` に `latencyMode: 'quality'` を指定すると、GPU エンコーダが Bフレーム（双方向参照フレーム）を生成し、DTS/PTS の不一致により多くの動画プレーヤー（QuickTime/Windows Media Player/ブラウザ）でデコードできず画面が真っ黒（Black Screen）になる。
- **解決策**: `latencyMode` はデフォルト（Bフレームなし・時間順出力）とし、Main Profile (`avc1.4d002a`) を標準として全環境での 100% 確実な再生互換性を保証する。
