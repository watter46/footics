# video-canvas: Video Analysis & Drawing Toolkit

このディレクトリは、スクリーンショット上に描画レイヤーを重ねるための特化型拡張機能を管理します。

## 1. 開発コンテキスト
- **Domain:** スクリーンショット、タクティカルドローイング（tldraw）
- **Core Stack:** WXT, tldraw v4.5.8, Zustand, React 19.
- **Styling:** Tailwind CSS v4.

## 2. 開発ルール
- **tldraw Logic:** `tldraw.md` に従い、Editor インスタンスの操作、カスタムシェイプの追加、カメラ制御を実装すること。
- **State Management:** `zustand` を主軸とし、tldraw の内部状態と同期をとるためのストア設計を行う。
- **Sync Logic:** スクリーンショットの描画データの時間情報を正確に同期させること。

## 3. 重要ポイント
- 描画データはシリアライズ可能な形式で保持し、IDB 等への保存を意識する。
- パフォーマンス向上のため、不要な再レンダリングを防ぐセレクタ設計を徹底する。

## 参照すべきルール
- [tldraw.md](file:///home/watter46/src/footics/.agent/rules/tldraw.md)
