# TASK-203b: 戦術ボード描画キャッシュと60fpsドラッグ・サムネイル最適化

- **Status**: `DONE`
- **Commit**: `perf(tactical): cache konva glow markers and throttle drag updates to rAF`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2, Phase 3, Phase 4 (parallel; Phase 2 must run after TASK-203a Phase 4)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/core/components/use-marker-drag-handlers.ts): getLayer\(\)\?\.batchDraw`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. `PlayerMarkerRingFade`, `PlayerMarkerRing`, `PlayerFocusSpotlight` のビジュアル・クリック領域（`listening={true}`）・テスト用要素構造（`Ellipse` / `Path` / `Circle`）を保ちつつ、巨大 `shadowBlur` 描画をオフスクリーンキャッシュ化する。
  2. ドラッグ終了時・アンマウント時に未実行の `requestAnimationFrame` を必ず `cancelAnimationFrame` し、ドロップ後の古いデルタ書き戻し（レースコンディション）を絶対に起こさないこと。
  3. ドラッグ中のマーカー本体と追従矢印（`sourcePlayerId` / `targetPlayerId`）・コネクトラインは同一フレーム内で遅延なく同期描画すること（マーカー層だけの片側 `batchDraw` 禁止）。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. Konva オフスクリーンキャッシュ（`node.cache({ x, y, width, height, pixelRatio })`）は視覚装飾を包む内側 `<Group ref={visualGroupRef}>` のみに適用し、透明ヒットエリアと外部 `shapeRef` / `spotlightGroupRef` はキャッシュ外の外側 `<Group>` に残す。
  2. `node.cache(...)` の範囲 `{ x, y, width, height }` は `shadowBlur` パディングを含めて明示計算する（引数なし `cache()` はカスタム `Shape` や広域ブラーが切れるため禁止）。環境非対応時は `typeof node.cache === 'function'` で安全にスキップする。
  3. `useMarkerDragHandlers` と `useBallDrag` は `pendingDeltaRef` + `rafIdRef` で `setActiveDragDelta` 更新を 1 フレーム最大 1 回にスロットリングする。
  4. `BillboardItemNode` を `React.memo` 化し、`onDragEnd` の不要なインライン関数ラップを削除して `PlayerMarkerItem` へのプロップ参照を安定化する。`PitchGroundLayer` のコールバック群は `useCallback` 化する。
  5. `SceneCanvasThumbnail` のキャンバス描画はサイズ設定のみ同期で行い、`renderTacticalPhaseFrameToCanvas` 実行を `requestAnimationFrame` へ遅延スケジューリング（アンマウント・更新時にキャンセル）する。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/objects/player/components/player-marker-ring-fade.tsx`
  - `src/features/tactical-unified/objects/player/components/player-marker-ring.tsx`
  - `src/features/tactical-unified/objects/player/components/player-focus-spotlight.tsx`
  - `src/features/tactical-unified/core/components/use-marker-drag-handlers.ts`
  - `src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts`
  - `src/features/tactical-unified/core/components/billboard-item-node.tsx`
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`
  - `src/features/tactical-unified/panels/left-panel/scene-canvas-thumbnail.tsx`

## 2. Implementation Phases

### Phase 1: 発光マーカー・スポットライトの Konva オフスクリーンキャッシュ
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/objects/player/components/player-marker-ring-fade.tsx` (PlayerMarkerRingFade, L27-L156)
  - `[MODIFY]` `src/features/tactical-unified/objects/player/components/player-marker-ring.tsx` (PlayerMarkerRing, L20-L127)
  - `[MODIFY]` `src/features/tactical-unified/objects/player/components/player-focus-spotlight.tsx` (PlayerFocusSpotlight, L31-L176)
  - `[MODIFY]` `src/features/tactical-unified/objects/player/components/__tests__/player-marker-ring-fade.test.tsx` (L170-L228)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx`
- **Contract**:
  ```ts
  // 各コンポーネントのキャッシュ領域と依存配列:
  // 1. PlayerMarkerRingFade:
  //    pad = Math.ceil(glowBlur * 1.5 + 16)
  //    cacheRect = { x: -(rx + pad), y: -(ry + pad), width: (rx + pad) * 2, height: (ry + pad) * 2 + ringDepth }
  //    deps: [color, glowBlur, glowOpacity, rx, ry, ringDepth, isSelected]
  // 2. PlayerMarkerRing:
  //    pad = 24, maxR = radius * 1.15 + pad
  //    cacheRect = { x: -maxR, y: -maxR, width: maxR * 2, height: maxR * 2 }
  //    deps: [player.style.color, radius, isSelected]
  // 3. PlayerFocusSpotlight:
  //    pad = 24, maxR = outerRadius + pad
  //    cacheRect = { x: -maxR, y: -maxR, width: maxR * 2, height: maxR * 2 }
  //    deps: [focusColor, focusOpacity, outerRadius, centerRadius, glowThickness, radius, isSelected]
  ```
  - 振る舞い仕様・境界条件:
    1. 透明ヒットエリア（`listening={true}`）は外側 `<Group>` 直下に残し、視覚要素全体を `<Group ref={visualGroupRef} listening={false}>` で包む。
    2. `useEffect` 内で `const node = visualGroupRef.current; if (!node || typeof node.cache !== 'function') return;` を確認し、`node.cache({ ...cacheRect, pixelRatio })`（`pixelRatio = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1`）を try/catch で安全に実行する（テスト環境の Canvas 未実装でのクラッシュ防止）。
    3. クリーンアップ時に `if (typeof node.clearCache === 'function') node.clearCache()` を呼ぶ。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/objects/player/components/__tests__/player-marker-ring-fade.test.tsx`:
    - `case 1`: `PlayerMarkerRingFade` マウント時に視覚用 `<Group>` にキャッシュ処理が実行され、既存の `Ellipse` 多層フォグ構造と選択リングが維持される。
    - `case 2`: `color` や `isSelected` が変化すると再キャッシュされ、位置移動のみの再レンダーでは再キャッシュされない。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/objects/player/components/player-marker-ring-fade.tsx src/features/tactical-unified/objects/player/components/player-marker-ring.tsx src/features/tactical-unified/objects/player/components/player-focus-spotlight.tsx src/features/tactical-unified/objects/player/components/__tests__/player-marker-ring-fade.test.tsx`

### Phase 2: ドラッグ中の `rAF` スロットリングと片側レイヤー描画の撤廃
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/use-marker-drag-handlers.ts` (handleMarkerDragMove, handleDragEnd, L50-L250)
  - `[MODIFY]` `src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts` (handleDragMove, handleDragEnd, L25-L120)
  - `[ADD]` `src/features/tactical-unified/core/components/__tests__/drag-raf-throttling.test.tsx` (~120 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/compiler/scene-graph-dto.ts` (`EphemeralDragDelta`)
- **Contract**:
  ```ts
  // 両フック共通の rAF スロットリング契約:
  // pendingDeltaRef: MutableRefObject<EphemeralDragDelta | null>
  // rafIdRef: MutableRefObject<number | null>
  // scheduleDragDelta(delta: EphemeralDragDelta): void
  //   - pendingDeltaRef.current = delta
  //   - if (rafIdRef.current === null) rafIdRef.current = requestAnimationFrame(flush)
  // cancelPendingDragDelta(): void
  //   - if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current)
  //   - rafIdRef.current = null; pendingDeltaRef.current = null
  ```
  - 振る舞い仕様・境界条件:
    1. 同一フレーム内で `onDragMove` が複数回発火しても、`sessionStore.setActiveDragDelta` は `rAF` コールバック時に最新座標で 1 回のみ呼ばれる。
    2. `useMarkerDragHandlers` の `handleMarkerDragMove` 内の `e.target.getLayer()?.batchDraw()` を削除し、マーカー層と矢印層の描画タイミングを一致させる。
    3. `handleDragEnd` と `useEffect` アンマウントクリーンアップで必ず `cancelPendingDragDelta()` を呼び、その直後に `setActiveDragDelta(null)` を実行する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/drag-raf-throttling.test.tsx`（実 `TacticalStoreProvider` + `requestAnimationFrame` スパイ使用、内部 `vi.mock` 禁止）:
    - `case 1`: 1 フレーム内で `handleMarkerDragMove` を連続 3 回呼んでも、`rAF` 発火前は `activeDragDelta` が更新されず、`rAF` 発火時に最後の座標 1 回のみ反映される。
    - `case 2`: `rAF` 発火前に `handleDragEnd` を呼ぶと未実行の `rAF` がキャンセルされ、後に `rAF` が進んでも `activeDragDelta` が `null` のまま上書きされない。
    - `case 3`: `useBallDrag` でも同様に連続 `handleDragMove` が 1 フレーム 1 回に統合され、`handleDragEnd` でキャンセルされる。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/use-marker-drag-handlers.ts src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts src/features/tactical-unified/core/components/__tests__/drag-raf-throttling.test.tsx`

### Phase 3: `BillboardItemNode` メモ化とコールバック参照安定化
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/billboard-item-node.tsx` (BillboardItemNode, L46-L142)
  - `[MODIFY]` `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` (PitchGroundLayer, L115-L155)
  - `[ADD]` `src/features/tactical-unified/core/components/__tests__/billboard-item-node-memo.test.tsx` (~100 lines)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx` (`PlayerMarkerItemProps`)
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx`
- **Contract**:
  ```ts
  // BillboardItemNode を React.memo でラップする:
  export const BillboardItemNode = memo(function BillboardItemNode(props: BillboardItemNodeProps) { ... });
  // PlayerMarkerItem への onDragEnd はそのまま onDragEnd={onDragEnd} を渡す（(e) => onDragEnd(e, marker) を廃止）。
  // onUpdateVisionCone, onSelect (TextObject), onDblClick (TextObject) は useCallback で安定化する。
  ```
  - 振る舞い仕様・境界条件:
    1. `BillboardItemNode` の `memo` が効くよう、同一 `item` 参照かつ同一コールバック参照の時は再レンダリングをスキップする。
    2. `PitchGroundLayer.tsx` の `updateZone`, `updateArrow`, `updatePlayerTrajectory`, `makeSelectHandler` を `useCallback` でメモ化する。
    3. `PlayerMarkerItem` 側の `onDragEnd` シグネチャ `(e, marker) => void` は既に一致しているため変更不要。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/billboard-item-node-memo.test.tsx`（実 Konva Stage、内部 `vi.mock` 禁止）:
    - `case 1`: `BillboardItemNode` に同一 props を渡して親を再レンダーした際、不要な `PlayerMarkerItem` の再生成・`onDragEnd` 破損が起きない。
    - `case 2`: `PitchGroundLayer` の `updateArrow` / `updateZone` / `updatePlayerTrajectory` コールバックが親の再レンダー後も動作する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/billboard-item-node.tsx src/features/tactical-unified/core/components/PitchGroundLayer.tsx src/features/tactical-unified/core/components/__tests__/billboard-item-node-memo.test.tsx`

### Phase 4: サムネイル描画の `requestAnimationFrame` 非同期スケジューリング
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/left-panel/scene-canvas-thumbnail.tsx` (SceneCanvasThumbnail, L48-L108)
  - `[ADD]` `src/features/tactical-unified/panels/left-panel/__tests__/scene-canvas-thumbnail-raf.test.tsx` (~80 lines)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/panels/left-panel/__tests__/left-panel.test.tsx` (L334-L382)
- **Contract**:
  ```ts
  // SceneCanvasThumbnail の useEffect 実行順:
  // 1. canvas.width / height / style.width / style.height は即座に同期設定（レイアウトシフト・既存テスト互換維持）。
  // 2. renderTacticalPhaseFrameToCanvas の実行のみ requestAnimationFrame にスケジュールし、
  //    cleanup で cancelAnimationFrame(rafId) を呼ぶ。
  ```
  - 振る舞い仕様・境界条件:
    1. `dims` や `phase` が連続更新された場合は古い `rAF` をキャンセルし、最新状態のみ 1 回描画する。
    2. 既存の `left-panel.test.tsx` の `SceneCanvasThumbnail` サイズ・アスペクト比テストが引き続き PASS すること。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/panels/left-panel/__tests__/scene-canvas-thumbnail-raf.test.tsx`（実描画関数接続、内部 `vi.mock` 禁止）:
    - `case 1`: マウント直後は同期的にキャンバス寸法が設定され、描画自体は `rAF` 発火後に完了し、アンマウント時は `cancelAnimationFrame` が呼ばれる。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/left-panel/scene-canvas-thumbnail.tsx src/features/tactical-unified/panels/left-panel/__tests__/scene-canvas-thumbnail-raf.test.tsx`
