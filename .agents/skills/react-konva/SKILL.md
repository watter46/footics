---
name: react-konva
description: Konva.js + react-konva を使用した戦術ボード実装のベストプラクティスとパフォーマンス最適化
---

# Konva.js + react-konva スキルガイド

Footics のメイン機能である戦術ボード（Canvas）を実装・修正する際のガイドラインです。
`src/features/tactical-unified` 配下の実例に基づいています。特に数千のノードを扱う際のパフォーマンス最適化に留意してください。

## 1. イベントリスナーの最適化 (`listening`)

KonvaはデフォルトでHit graphを構築しマウス・タッチイベントを計算します。これは非常に重い処理です。
インタラクティブでない要素（背景要素、静的装飾、または現在のツールモードでは操作対象外の要素）には、動的に `listening={false}` を設定し、計算をスキップさせてください。

```tsx
const isInteractive = activeTool === 'select';

<Group
  listening={isInteractive} // ツール状態に応じて切り替え
  draggable={isInteractive && !isLocked}
>
  <Circle radius={10} fill="red" listening={false} /> {/* 背景や装飾は常に false */}
</Group>
```

## 2. レンダリング品質と速度のトレードオフ (`perfectDrawEnabled`)

Konvaはデフォルトでバッファキャンバスを使用して、透明度のある枠線と塗りの重なりを完璧に描画します。しかし、これも描画パフォーマンスを著しく低下させます。
大量の半透明な図形を描画する際、完璧な描画よりも速度が重要な場合は `perfectDrawEnabled={false}` を設定してください。

```tsx
<Rect
  x={0}
  y={0}
  width={100}
  height={100}
  fill="rgba(255, 0, 0, 0.5)"
  stroke="black"
  perfectDrawEnabled={false} // バッファキャンバスをスキップして高速化
/>
```

## 3. ドラッグ操作と状態管理

ドラッグ操作による頻繁な状態更新を避けるため、React の State や Zustand の更新は必要最小限に留めてください。
Footics では `useNodePositionTransition` フック等を用いたり、ゴースト（Onionskin）専用のレイヤーを用いて、ドラッグ中の重い再描画を回避する工夫がされています。
最終的な位置の保存は `onDragEnd` でのみ行います。

## 4. カメラ・チルト・パン・ズームを見据えた 5層レイヤー分離 (Layer Separation)

再描画コストを抑え、かつ将来のカメラ操作（ピッチの縦チルト・左右からの覗き込み回転・パン・ズーム）および再生・出力時の「純粋描画（Clean Render）」でバグを一切生まないよう、Konva Stage 内とオーバーレイは以下の **5層構造** に厳格に分離してください。

1. **Layer 1: `PitchGroundLayer`（地面・平面投影レイヤー）**:
   - ピッチ枠（`PitchFrame`）、地面に描かれるゾーン（`Zone`）、地面上の矢印・直線・コネクタ・ゴースト軌道のライン。
   - カメラのチルトや左右回転時に、地面の平面変形（パースペクティブ投影）をそのまま受ける層。
2. **Layer 2: `BillboardObjectLayer`（ビルボード・立ちオブジェクトレイヤー）**:
   - 選手マーカー（Webの2D丸マーカー / Extensionの3D足元リング＋下部の選手名ラベル）、ボール、テキスト。
   - **ビルボード原則**: 基準位置 `(x, y)` はカメラ投影位置へ移動し、奥行きに応じた遠近スケール（`perspectiveScale`）が掛かるが、**マーカーの円や文字ラベル自体は縦に潰れず常にカメラ正面（正円・読める文字）を向く**構造にする。また、カメラを傾けた際に手前の選手が奥の選手の前に重なるよう、スクリーンY座標（深さ）で描画順ソートを行える構造とする。
3. **Layer 3: `InteractionPreviewLayer`（作図プレビュー・編集補助レイヤー）**:
   - 作図中のプレビュー図形、範囲選択ボックス、選択ハイライト、ゴースト軌道の操作ハンドル、矢印・ゾーンの頂点ハンドル。作図中プレビュー図形は `DrawingPreviewLayer.tsx` の純粋レンダラー関数（`renderDrawingPreviewNode`, `PREVIEW_SHAPE_RENDERERS`）を呼び出して描画する構造とする。
   - **純粋描画（Clean Render）原則**: アニメーション再生中および画像・動画の出力時は、この編集補助レイヤー（および選択強調・ゴースト軌道）を一括で非表示（`visible={false}`）にし、出力結果に編集UIが絶対に映り込まない構造とする。
4. **Overlay 1: `ViewportCropOverlay` / `BoundaryBoxOverlay`（画面基準の境界線枠レイヤー）**:
   - `TacticalPhase` 単位の `boundaryBox`（`16:9` スクリーン `0..100` 基準）と外側マスクを描画する。これは地面ではなく「カメラのレンズ枠（画面切り抜き枠）」に属するため、ピッチを傾けたり回転させたりしても境界線枠自体は傾かず、常に画面に対して水平・垂直な矩形として動作する。また、初期状態ではキャンバス上で非表示とし、ツールバーの「境界線」がONの時のみ表示する。
5. **Overlay 2: `HtmlHudOverlay`（オブジェクトオプション・境界線オプション）**:
   - 選択オブジェクトのスクリーン投影座標（`worldToScreen`）を購読して浮動表示される `ObjectOptions` 等。

## 5. ホスト非依存の Composable Core 設計 (Headless Annotation Core)

Web アプリ（Footics 本体戦術盤）と Chrome Extension（動画スクショ クイック編集）で描画機能を共有する場合、**特定のホストアプリ（Web専用パネルやExtension専用ストレージ）に依存しない純粋な Core レイヤー** を設計してください。
- **God Component の禁止**: 1つのコンポーネント（Stage）にピッチ背景・選手22人・アノテーション・ツールバー・各種モーダルを直結してはならない。
- **頭脳（ロジック）と見た目（Renderer）の分離**: 選手マーカー、ボール、矢印、ゾーン等の全オブジェクトは、共通の頭脳（位置、ドラッグ、選択、オブジェクトオプション制御）と着せ替え可能な見た目（Webの2D丸マーカー / Extensionの3D足元リング）を分離してパッケージ化する。
- **Store Provider パターン**: グローバルシングルトンの Zustand ストアに直接依存せず、React Context Provider 経由で初期状態を Props 注入できる構造にし、マウント時のチラつき（Flicker）を根絶すること。
- **グローバルカスタムイベントの禁止**: `window.dispatchEvent` による `tactical:copy-png` などの暗黙的な疎結合を避け、コンポーネントの Imperative Ref（`canvasRef.current.exportPng()`）または Context メソッドで明示的にやり取りすること。

## 6. 4層単一座標系アーキテクチャと投影パイプライン (4-Layer Single Coordinate & Projection Pipeline)

メインキャンバスの大きさは常に不変とし、アスペクト比切替・リサイズ・カメラ操作（チルト・3D投影・パン・ズーム）に対して一切の座標ズレを生まないよう、座標変換は以下の **4層単一座標系アーキテクチャ** に集約してください（各コンポーネントでの個別計算は厳禁）。

1. **第1層: スクリーン外枠（`16:9` 固定・`X: 0〜100, Y: 0〜100` 単一論理座標）**:
   - 全画面（ボード・レイアウト・エクスポート）の基準外枠は `16:9`（1920×1080）固定とし、ストアに保存される全座標は `16:9` スクリーン全体の `0〜100` とする。
   - 選手・ボールは `[0, 100]` にクランプされ、矢印・ゾーン・テキストは `pointerToNormalizedCoord(pos, vRect, { allowOverflow: true })` により `0〜100` 外への配置も許容する。
2. **第2層: 中央配置サブピッチと3D投影（`pitch-geometry.ts` & `canvas-screen-coordinates.ts`）**:
   - `16:9` スクリーン中央にアクティブフェーズの `aspectRatio`（`'16:9' | '4:5' | '9:16' | '1:1'`）のサブピッチ（`calculatePitchRect` / `getScreenOuterPitchRect` / `getScreenPitchBounds`）を内接配置する。
   - 3D視点投影およびスクリーン変換は `canvas-screen-coordinates.ts`（`worldToScreen` / `screenToWorld`, `DEFAULT_PITCH_PERSPECTIVE = 1200`）を通し、縦向きピッチの3D二重スケーリングを防止する。
3. **第3層: フェーズ単位の境界線クロップ（`TacticalPhase.boundaryBox`）**:
   - `aspectRatio` と `boundaryBox` は `TacticalPhase` 単位で独立保持し（`selectActivePhaseAspectRatio` / `selectActivePhaseBoundaryBox` で購読）、比率切替（`setAspectRatio`）は `boundaryBox` を一切書き換えない。
   - レイアウト画面・エクスポート画面は第1層＋第2層を `16:9`（1920×1080）で正規描画した上で、`boundaryBox`（`resolveBoundaryBoxPixelRect`）の内側領域をクロップ出力する。
4. **第4層: フォーメーション配置と比率変換（`getFormationActualPos` / `transformCoord`）**:
   - Full/Half コートモードおよびピッチの向き（`'16:9'`=横: Home左/Away右、`'9:16' | '4:5' | '1:1'`=縦: Home下/Away上）に基づき、`getScreenPitchBounds(aspectRatio)` 基準で単一変換を行う。
   - ベンチ配置選手も含め選手マーカー写真は `PlayerPhotoContext`（`player-photo-resolver.ts`）で解決する。

## 7. プラグイン型ツール・オブジェクトアーキテクチャ (`CanvasToolPlugin` & Object Modules)

描画ツールやオブジェクトの追加・変更時に、既存の `Stage` や `PreviewLayer` に `switch / if` を追加することを固く禁じます（開放閉鎖原則 OCP の厳守）。
- **`CanvasToolPlugin` 契約**: 各ツールは「メタデータ」「生成データロジック（`createObject`）」「ドラッグ中 Konva プレビュー（`PreviewComponent`）」「配置後 Konva 確定描画（`RenderComponent`）」をカプセル化してください。
- **ホスト別カタログ注入**: Web版と Extension版のツールバー構成の違いは、起動時に渡すツールカタログ設定で宣言的に切り替えてください。

## 8. オブジェクトオプションへの完全一本化 (`ObjectOptions`)

オブジェクトのプロパティ（色、太さ、視野、コネクタ、選手情報変更、サイズ等）の編集 UI は、Web・Extension ともに選択時にオブジェクトの近くへ浮動表示される **オブジェクトオプション（`ObjectOptions`）** に100%一本化します。
- 旧右パネルの `Properties / Inspector` タブは完全廃止し、UIの二重管理を排除します。
- Web版（2Dマーカー）と Extension版（3Dマーカー）は、選手に名前が設定されている場合はどちらもマーカーの下部に名前ラベルを表示し、オブジェクトオプションの「選手情報変更ボタン」からミニフォームで変更できる共通設計とします。

## 9. レイヤー単位の再描画遮断（memo化）

Stage コンテナ（`CanvasStageContainer` 等）でドラッグ選択枠の更新やプレビュー描画など高頻度な State 更新が発生した際、影響のない他の Konva Layer まで毎フレーム再描画されるとパフォーマンスが劇的に低下します。

Konva Layer コンポーネント（`PitchGroundLayer`, `BillboardObjectLayer` 等）は必ず `React.memo` でラップし、Props が変更されない限り Konva ノードツリーの不要な再評価を遮断してください。

```tsx
import { memo } from 'react';
import { Layer } from 'react-konva';

export const PitchGroundLayer = memo(function PitchGroundLayer({
  aspectRatio,
  is3dPitch,
  // ...
}: PitchGroundLayerProps) {
  return (
    <Layer listening={false}>
      {/* 静的なピッチ描画 */}
    </Layer>
  );
});

export const BillboardObjectLayer = memo(function BillboardObjectLayer({
  items,
  // ...
}: BillboardObjectLayerProps) {
  // アイテムのソートなどは useMemo で保護
  const sortedItems = useMemo(() => sortItems(items), [items]);

  return (
    <Layer>
      {/* オブジェクト群描画 */}
    </Layer>
  );
});
```

また、レイヤー内の `useEffect` で Konva ノードや Canvas コンテキストを操作する場合は、依存配列の省略（毎レンダー実行）を厳禁とし、対象 Ref や Rect のみを依存配列に指定してください。



