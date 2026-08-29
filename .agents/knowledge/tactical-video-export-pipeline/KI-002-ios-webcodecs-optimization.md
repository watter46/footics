---
title: "iOS Safari WebCodecs (A14 Bionic) Optimization"
date: "2026-08-30"
tags: ["video-export", "webcodecs", "ios", "iphone12", "performance"]
author: "Antigravity"
---

# iOS Safari WebCodecs (A14 Bionic) Optimization

Footics Tactical Animation の Video Export を iOS (特に iPhone 12 / A14 Bionic) の WebCodecs を用いてハードウェアエンコードする際の最適化設定。

## Background & Problem
iOS Safari の WebCodecs は PC と比べてメモリ制約や UMA (Unified Memory Architecture) ゼロコピーの挙動が異なるため、PC 用のデフォルト設定（60 frames queue 等）でエンコードを行うと `maxQueueSize` 超過によるメモリリークやタブクラッシュが発生する可能性がある。また、Camera Roll（写真アプリ）へ保存する際、iOS は独自の再エンコード（HEVC等）をかけるため、Bit-Perfect な無劣化エクスポートが阻害される。

## Solution & Presets

### 1. iPhone 12 (A14 Bionic) Preset
Apple HW ネイティブの High Profile L4.2 を活用し、最高画質を実現するプリセット。
- **Codec:** `avc1.64002a` (H.264 High Profile Level 4.2)
- **maxQueueSize:** 30 (WebKit のメモリクラッシュを防止しつつ、ゼロコピーパスを有効活用)
- **Bitrate:** 24 Mbps
- **FPS:** 60 fps
- **LatencyMode:** `quality` (Bフレームを有効化し圧縮効率を最大化)

### 2. iOS General (安全志向) Preset
一般的な iOS 端末向けの安全なプリセット。
- **Codec:** `avc1.4d002a`
- **maxQueueSize:** 20
- **Bitrate:** 16 Mbps
- **FPS:** 30 fps
- **LatencyMode:** `realtime`

## Static Frame Caching (静止区間スキップ)
VideoFrame.clone() を活用し、`pauseMs` などの静止区間で Canvas の再描画と GPU 再取り込みを完全にスキップする。
1. 前のフレームを `cachedStaticFrame = videoFrame.clone()` でキャッシュ。
2. 静止判定（`isPauseFrame()`）が true の場合、`new VideoFrame(cachedStaticFrame, { timestamp })` でタイムスタンプだけを上書きして再利用する。
3. これにより GPU 負荷とメモリバス帯域の消費を激減させる。
※ 使用後は必ず `close()` してメモリリークを防ぐ。

## Bit-Perfect Sync (無劣化PC同期)
iOS Safari から動画を保存する際、**写真アプリ (Camera Roll)** ではなく **ファイルアプリ (Files.app / iCloud Drive)** に保存することで、iOS による強制圧縮（HEVC再エンコード）を回避し、Bit-Perfect（出力したままの 24Mbps/60fps）なファイルを PC と同期可能。
