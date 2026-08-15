# video-canvas: Video Analysis & Drawing Toolkit

このディレクトリは、スクリーンショット上に描画レイヤーを重ねるための特化型拡張機能を管理します。

## 1. 開発コンテキスト
- **Domain:** スクリーンショット、タクティカルドローイング
- **Core Stack:** WXT, react-konva, Zustand, React 19.
- **Styling:** Tailwind CSS v4.

## 2. 開発ルール
- **Drawing Logic:** react-konva の API に従い、Stage, Layer, 描画オブジェクトを実装すること。
- **State Management:** `zustand` を主軸とし、Konva の状態と同期をとるためのストア設計を行う。
- **Sync Logic:** スクリーンショットの描画データの時間情報を正確に同期させること。

## 3. 重要ポイント
- 描画データはシリアライズ可能な形式で保持し、IDB 等への保存を意識する。
- パフォーマンス向上のため、不要な再レンダリングを防ぐセレクタ設計を徹底する。
