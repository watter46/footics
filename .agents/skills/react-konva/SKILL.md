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

## 4. レイヤー分離 (Layer Separation)

- 再描画コストを抑えるため、静的レイヤーと動的レイヤーを明確に分離してください。
- `PlayerLayer` などのように機能ごとに Component を分離し、内部で個別の Konva オブジェクト（Marker, Line等）を展開する設計が取られています。

## 5. ホスト非依存の Composable Core 設計 (Headless Annotation Core)

Web アプリ（Footics 本体戦術盤）と Chrome Extension（動画スクショ クイック編集）で描画機能を共有する場合、**特定のホストアプリ（Web専用パネルやExtension専用ストレージ）に依存しない純粋な Core レイヤー** を設計してください。
- **God Component の禁止**: 1つのコンポーネント（Stage）にピッチ背景・選手22人・アノテーション・ツールバー・各種モーダルを直結してはならない。
- **プラグイン合成 (Composable Views)**: Core（Stage + 背景画像 + 矢印/ゾーン/テキスト/リングアノテーション + BoundaryBox）を基盤とし、Web専用要素（ピッチ線、22人選手、フォーメーション）や Extension専用要素（動画スクショ）は上位の View 層で合成すること。
- **Store Provider パターン**: グローバルシングルトンの Zustand ストアに直接依存せず、React Context Provider 経由で初期状態を Props 注入できる構造にし、マウント時のチラつき（Flicker）を根絶すること。
- **グローバルカスタムイベントの禁止**: `window.dispatchEvent` による `tactical:copy-png` などの暗黙的な疎結合を避け、コンポーネントの Imperative Ref（`canvasRef.current.exportPng()`）または Context メソッドで明示的にやり取りすること。

## 6. ゼロマージン描画と仮想キャンバス座標系 (Virtual Canvas Scaling)

画像アノテーションにおける Konva キャンバスは、画面リサイズや比率変更に対して堅牢でなければなりません。
- **マージン 0% の原則**: 画像背景モードでは、外側余白を一切含めず（`x: 0, y: 0, width: 100%, height: 100%`）、BoundaryBox の全画面フィット時にも黒枠が混入しないこと。
- **仮想キャンバス正規化座標 (0〜100%)**: すべての描画オブジェクトの永続化座標は、元画像の縦横比を基準とした 0〜100% の正規化座標で管理すること。
- **リサイズ耐性 (Aspect Containment)**: ウィンドウがハーフサイズにリサイズされた場合でも、`object-fit: contain` 相当の均等スケーリングを適用し、画像やアノテーションの比率崩れを防ぐこと。

## 7. プラグイン型ツールアーキテクチャ (`CanvasToolPlugin`)

描画ツール（矢印、ゾーン、マーカー等）の追加・変更時に、既存の `Stage` や `PreviewLayer` に `switch / if` を追加することを固く禁じます（開放閉鎖原則 OCP の厳守）。
- **`CanvasToolPlugin` 契約**: 各ツールは「メタデータ」「生成データロジック（`createObject`）」「ドラッグ中 Konva プレビュー（`PreviewComponent`）」「配置後 Konva 確定描画（`RenderComponent`）」を 1 つのファイルにカプセル化してください。
- **動的レシーバー**: ツールバーやプレビュー層は、渡されたプラグイン配列をループして動的に描画する構造に徹底してください。

## 8. 自己申告型オプション (`OptionsComponent`)

オブジェクトのプロパティ（色、太さ、先端形状、ラベル等）の編集 UI は、ツールプラグイン自身が `OptionsComponent` として定義してください。
- Web 本体の右パネル（Inspector）および Extension の浮動コンテキストバー（HUD）は、プラグインの `OptionsComponent` を取り出してスロット自動マウントする構造に統一します。
- これにより、UI の二重管理（Inspector と HUD の重複実装）を排除し、新オプション追加を「プラグインファイル内のみの変更（ゼロ侵入拡張）」で完結させます。


