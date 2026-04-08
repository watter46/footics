# Video Canvas Architecture Rules

## 1. MV-Sync アーキテクチャ (Model-View-Synchronizer)
- **Model (Store)**: `useEditorStore` は、純粋でシリアライズ可能なデータ（DrawingObject配列）のみを管理する。
  - **禁忌**: `fabric.Canvas` や `fabric.Object` のインスタンスを Zustand のリアクティブな state に直接保持してはならない。
- **View (Canvas)**: Fabric.js は単なる描画レイヤーとして扱い、すべての表示状態は Model に従属する。
- **Synchronizer**: `useFabricSync` を介して、Model の変更を描画に反映し、描画上の操作を Model へフィードバックする。

## 2. 座標系の正規化 (Normalization)
- **Data Layer**: ストアに保存されるすべての位置・サイズ座標は **0-100 の正規化座標** でなければならない。
- **Coordinate Conversion**: 描画時およびイベントフィードバック時には、必ず `converter.ts` の `normalize`/`denormalize` 関数を使用すること。
- ウィンドウリサイズやビデオコンテナの拡大縮小によって、図形の相対的な位置がズレることを防ぐ。

## 3. 状態更新フロー (Action Flow)
- **オブジェクト生成**: 直接 `canvas.add` するのではなく、ストアの `addObject` アクションを介して Model を生成する。
- **一時描画**: ドラッグ中などの高頻度なプレビューは、一時的な Fabric オブジェクトを使用し、操作確定時（`mouse:up`）に最終的な状態を Model へ反映する。
- **オブジェクト削除**: 直接 `canvas.remove` するのではなく、`removeObject(id)` アクションを介して Model から削除し、Synchronizer に実際の削除を委ねる。

## 4. 特殊オブジェクトと参照 (Custom Objects & Refs)
- **Connector (接続線)**: オブジェクト間の繋がりはメモリ上のインスタンス参照ではなく、常に **ID (`fromId`, `toId`) ベース** で Model に記録する。
- **Reference Restoration**: ロード時や Undo/Redo 時の参照の再紐付けは、同期エンジンまたは Fabric オブジェクト内部のロジックで行い、Model 層の純粋性を保つ。

## 5. 履歴管理 (History Persistence)
- 履歴（Undo/Redo）は `DrawingObject[][]` のスナップショットとして管理する。
- Fabric.js の `toJSON` 出力に依存した履歴管理を避けることで、データのポータビリティと堅牢性を確保する。
