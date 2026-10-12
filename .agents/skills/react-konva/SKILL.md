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
