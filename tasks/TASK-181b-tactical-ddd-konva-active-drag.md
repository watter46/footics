# TASK-181b: Konva ボードのゴースト軌道 SceneGraph 配線と命令的ドラッグ追従処理の完全撤去

- **Status**: `DONE`
- **Commit**: `refactor(tactical): wire trajectory scenegraph and eliminate imperative drag updaters`

## 概要
`PitchGroundLayer.tsx` で `sceneGraph.trajectories` の解決済みプリミティブ描画を配線する。
`use-marker-drag-handlers.ts` でドラッグ移動中に `sessionStore.setActiveDragDelta` を更新し、ドラッグ確定時に `null` へリセットすることで、接続線・矢印・移動軌道を `SceneGraph` 経由で宣言的に追従させる。
旧来の命令的 Konva ノード直接書き換え関数（`arrow-drag-updater.ts`, `trajectory-arrow-drag-updater.ts`, `PlayerConnectLines.tsx` の `updateConnectLinePositions`）を完全削除（`[DELETE]`）する。

## Negative Contracts (残存禁止条件)
全タスク完了時点で以下の条件を満たすこと：
- `rg -l "arrow-drag-updater|trajectory-arrow-drag-updater|updateConnectLinePositions|updateAttachedArrowPositions|updateTrajectoryArrowPositions" src/` が `0件` であること。
- 以下のファイルが物理削除されていること：
  - `src/features/tactical-unified/core/components/annotations/arrow-drag-updater.ts`
  - `src/features/tactical-unified/core/components/annotations/trajectory-arrow-drag-updater.ts`
  - `src/features/tactical-unified/core/components/annotations/__tests__/trajectory-arrow-drag-updater.test.ts`

---

## Phase 1: Konva ボードのゴースト軌道 SceneGraph 配線と命令的ドラッグ追従処理の完全撤去 (`activeDragDelta` 一本化)

### 対象ファイル
- `[MODIFY]` `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`
- `[MODIFY]` `src/features/tactical-unified/core/components/PlayerConnectLines.tsx`
- `[MODIFY]` `src/features/tactical-unified/core/components/use-marker-drag-handlers.ts`
- `[MODIFY]` `src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts`
- `[DELETE]` `src/features/tactical-unified/core/components/annotations/arrow-drag-updater.ts`
- `[DELETE]` `src/features/tactical-unified/core/components/annotations/trajectory-arrow-drag-updater.ts`
- `[DELETE]` `src/features/tactical-unified/core/components/annotations/__tests__/trajectory-arrow-drag-updater.test.ts`
- `[MODIFY]` `src/features/tactical-unified/core/components/__tests__/player-connect-lines.test.tsx`
- `[MODIFY]` `src/features/tactical-unified/objects/player/components/player-ghost-trajectory.tsx`
- `[MODIFY]` `src/features/tactical-unified/objects/player/types.ts`
- `[MODIFY]` `src/features/tactical-unified/objects/arrow/types.ts`
- `[MODIFY]` `src/features/tactical-unified/objects/ball/hooks/ball-drag-helper.ts`

---

### 1-1. `[MODIFY]` `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`

`sceneGraph.trajectories` を `<Line>` プリミティブとして描画し、選択中の選手マーカーについては `sceneGraph.billboardItems` のドラッグ反映後座標を `<PlayerGhostTrajectory>` に渡す。

#### Before (L214-L249)
```tsx
        {/* ── 6. ゴースト & 移動軌道 (Ghost & Trajectories) ── */}
        {!cleanRender &&
          visibleMarkers.map((marker) => {
            if (marker.area === 'bench') return null;
            const prevPlayer = prevSlide?.players.find(
              (p) => p.id === marker.id && p.area === 'pitch',
            );
            if (!prevPlayer) return null;

            const isSelected = selectedIds.includes(marker.id);
            const isEffectEnabled = marker.trajectoryEffect?.enabled === true;
            if (!isSelected && !isEffectEnabled) return null;

            const dist = Math.hypot(
              marker.x - prevPlayer.x,
              marker.y - prevPlayer.y,
            );
            if (dist < 1.0) return null;

            return (
              <Group
                key={`ghost-${marker.id}`}
                id={`ghost-trajectory-${marker.id}`}
              >
                <PlayerGhostTrajectory
                  player={marker}
                  prevPlayer={prevPlayer}
                  stageSize={{
                    width: pitchRect.width,
                    height: pitchRect.height,
                  }}
                  activeSlideId={activeSlideId}
                  nodesRegistryRef={nodesRegistryRef}
                  aspectRatio={aspectRatio}
                  onUpdateTrajectory={updatePlayerTrajectory ?? (() => {})}
                />
              </Group>
            );
          })}
```

#### After
```tsx
        {/* ── 6. ゴースト & 移動軌道 (Ghost & Trajectories) ── */}
        {!cleanRender &&
          sceneGraph?.trajectories.map((traj) => {
            if (!traj.visible || selectedIds.includes(traj.playerId))
              return null;
            return (
              <Line
                key={`traj-dto-${traj.playerId}`}
                points={traj.flatPointsPx as number[]}
                stroke={traj.color}
                strokeWidth={2}
                dash={traj.dashArrayPx as number[]}
                lineCap="round"
                lineJoin="round"
                listening={false}
                perfectDrawEnabled={false}
              />
            );
          })}
        {!cleanRender &&
          visibleMarkers.map((marker) => {
            if (marker.area === 'bench') return null;
            const prevPlayer = prevSlide?.players.find(
              (p) => p.id === marker.id && p.area === 'pitch',
            );
            if (!prevPlayer) return null;

            const isSelected = selectedIds.includes(marker.id);
            const isEffectEnabled = marker.trajectoryEffect?.enabled === true;
            if (!isSelected && (sceneGraph ? true : !isEffectEnabled)) {
              return null;
            }

            const resolvedPlayer = sceneGraph?.billboardItems.find(
              (item): item is ResolvedBillboardPlayerItem =>
                item.kind === 'player' && item.id === marker.id,
            );
            const effectivePlayer =
              resolvedPlayer && stageSize.width > 0 && stageSize.height > 0
                ? {
                    ...marker,
                    x: (resolvedPlayer.positionPx.x / stageSize.width) * 100,
                    y: (resolvedPlayer.positionPx.y / stageSize.height) * 100,
                  }
                : marker;

            const dist = Math.hypot(
              effectivePlayer.x - prevPlayer.x,
              effectivePlayer.y - prevPlayer.y,
            );
            if (dist < 1.0) return null;

            return (
              <Group
                key={`ghost-${marker.id}`}
                id={`ghost-trajectory-${marker.id}`}
              >
                <PlayerGhostTrajectory
                  player={effectivePlayer}
                  prevPlayer={prevPlayer}
                  stageSize={{
                    width: pitchRect.width,
                    height: pitchRect.height,
                  }}
                  activeSlideId={activeSlideId}
                  nodesRegistryRef={nodesRegistryRef}
                  aspectRatio={aspectRatio}
                  onUpdateTrajectory={updatePlayerTrajectory ?? (() => {})}
                />
              </Group>
            );
          })}
```

---

### 1-2. `[MODIFY]` `src/features/tactical-unified/core/components/PlayerConnectLines.tsx`

命令的ノード直接操作関数 `updateConnectLinePositions` を完全削除する。

#### Before (L220-L278)
```tsx
      {lines}
    </Group>
  );
});

/**
 * ドラッグ中に接続線の頂点をリアルタイム更新するユーティリティ
 */
export function updateConnectLinePositions(
  connectLineNodeMap: Map<string, Konva.Line>,
  markers: Player[],
  draggedPlayerId: string,
  newPxX: number,
  newPxY: number,
  stageWidth: number,
  stageHeight: number,
) {
  for (const p1 of markers) {
    if (!p1.connectLines) continue;
    for (const cl of p1.connectLines) {
      if (cl.visible === false) continue;

      let pts: number[] | null = null;
      if (p1.id === draggedPlayerId) {
        const p2 = markers.find((m) => m.id === cl.toPlayerId);
        if (!p2) continue;
        pts = [
          newPxX,
          newPxY,
          (p2.x / 100) * stageWidth,
          (p2.y / 100) * stageHeight,
        ];
      } else if (cl.toPlayerId === draggedPlayerId) {
        pts = [
          (p1.x / 100) * stageWidth,
          (p1.y / 100) * stageHeight,
          newPxX,
          newPxY,
        ];
      }

      if (pts) {
        const coreLine = connectLineNodeMap.get(cl.id);
        if (coreLine) coreLine.points(pts);
        const fogA = connectLineNodeMap.get(`${cl.id}-fog-a`);
        if (fogA) fogA.points(pts);
        const fogB = connectLineNodeMap.get(`${cl.id}-fog-b`);
        if (fogB) fogB.points(pts);
        const hitLine = connectLineNodeMap.get(`${cl.id}-hit`);
        if (hitLine) hitLine.points(pts);
      }
    }
  }
}
```

#### After
```tsx
      {lines}
    </Group>
  );
});
```

---

### 1-3. `[MODIFY]` `src/features/tactical-unified/core/components/use-marker-drag-handlers.ts`

命令的 updater 呼び出しを撤去し、`sessionStore.setActiveDragDelta` 一本化に移行する。

#### Before (L1-L15)
```ts
import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import { useCallback, useRef } from 'react';
import type { ArrowAnnotation, Player } from '@/lib/types/tactical-unified';
import type { CanvasCapabilities, SelectedObject } from '../types';
import type { PitchRectBounds } from '../utils/canvas-coordinates';
import type { CanvasNodesRegistry } from '../utils/canvas-registry';
import { updateAttachedArrowPositions } from './annotations/arrow-drag-updater';
import { updateTrajectoryArrowPositions } from './annotations/trajectory-arrow-drag-updater';
import { updateConnectLinePositions } from './PlayerConnectLines';
import { resolveBenchDrop } from './player-bench-drop';
```

#### After
```ts
import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import { useCallback, useContext, useRef } from 'react';
import { TacticalStoresContext } from '@/features/tactical-unified/stores/tactical-store-provider';
import type { ArrowAnnotation, Player } from '@/lib/types/tactical-unified';
import type { CanvasCapabilities, SelectedObject } from '../types';
import type { PitchRectBounds } from '../utils/canvas-coordinates';
import type { CanvasNodesRegistry } from '../utils/canvas-registry';
import { resolveBenchDrop } from './player-bench-drop';
```

#### Before (L120-L155)
```ts
      if (reg?.connectLineNodeMap) {
        updateConnectLinePositions(
          reg.connectLineNodeMap,
          visibleMarkers,
          markerId,
          curX,
          curY,
          pitchRect.width,
          pitchRect.height,
        );
      }
      updateAttachedArrowPositions(
        reg?.arrowNodes,
        arrows,
        visibleMarkers,
        markerId,
        curX,
        curY,
        pitchRect.width,
        pitchRect.height,
      );
      updateTrajectoryArrowPositions(
        reg?.trajectoryArrowNodes,
        markerId,
        curX,
        curY,
        pitchRect.width,
        pitchRect.height,
      );
      e.target.getLayer()?.batchDraw();
```

#### After
```ts
      if (tacticalStores && pitchRect.width > 0 && pitchRect.height > 0) {
        const startNorm =
          dragStartNormRef.current?.markerId === markerId
            ? dragStartNormRef.current
            : (() => {
                const found = visibleMarkers.find((p) => p.id === markerId);
                return found
                  ? { markerId, normX: found.x, normY: found.y }
                  : null;
              })();
        if (startNorm) {
          const curNormX = (curX / pitchRect.width) * 100;
          const curNormY = (curY / pitchRect.height) * 100;
          tacticalStores.sessionStore.getState().setActiveDragDelta({
            entityIds: [markerId],
            deltaScreenNormX: curNormX - startNorm.normX,
            deltaScreenNormY: curNormY - startNorm.normY,
          });
        }
      }

      e.target.getLayer()?.batchDraw();
```

#### Before (L180-L195)
```ts
  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>, marker: Player) => {
      setIsDragging(false);
      setIsHudOpen(true);
```

#### After
```ts
  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>, marker: Player) => {
      tacticalStores?.sessionStore.getState().setActiveDragDelta(null);
      dragStartNormRef.current = null;
      setIsDragging(false);
      setIsHudOpen(true);
```

---

### 1-4. `[MODIFY]` `src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts`

`updateTrajectoryArrowPositions` の撤去と直接パス型インポートへの変更。

#### Before (L1-L15)
```ts
'use client';

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core';
import { updateTrajectoryArrowPositions } from '@/features/tactical-unified/core/components/annotations/trajectory-arrow-drag-updater';
import { selectPreviousSlide } from '@/features/tactical-unified/stores/tactical-unified-selectors';
```

#### After
```ts
'use client';

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core/utils/canvas-registry';
import { selectPreviousSlide } from '@/features/tactical-unified/stores/tactical-unified-selectors';
```

---

### 1-5. `[DELETE]` 旧命令的ドラッグ追従ファイル群の物理削除

以下の3ファイルを物理削除する：
- `[DELETE]` `src/features/tactical-unified/core/components/annotations/arrow-drag-updater.ts`
- `[DELETE]` `src/features/tactical-unified/core/components/annotations/trajectory-arrow-drag-updater.ts`
- `[DELETE]` `src/features/tactical-unified/core/components/annotations/__tests__/trajectory-arrow-drag-updater.test.ts`

---

### 1-6. `[MODIFY]` `src/features/tactical-unified/core/components/__tests__/player-connect-lines.test.tsx`

`useMarkerDragHandlers` がドラッグ移動中に `sessionStore.setActiveDragDelta` を更新し、ドラッグ確定時に `null` へリセットすることを検証する結合テストを追加する。

#### Before (L215-L225)
```tsx
    const textNode = textNodes.get('t-1');
    expect(textNode).toBeDefined();
    expect(textNode?.x()).toBe(420);
    expect(textNode?.y()).toBe(180);
    expect(textNode?.fontSize()).toBe(24);
    expect(textNode?.opacity()).toBeCloseTo(0.85);
  });
});
```

#### After
```tsx
    const textNode = textNodes.get('t-1');
    expect(textNode).toBeDefined();
    expect(textNode?.x()).toBe(420);
    expect(textNode?.y()).toBe(180);
    expect(textNode?.fontSize()).toBe(24);
    expect(textNode?.opacity()).toBeCloseTo(0.85);
  });

  it('useMarkerDragHandlers: ドラッグ移動中に sessionStore.activeDragDelta を更新し、ドラッグ終了時に null にリセットする', () => {
    const p1 = {
      ...createDefaultPlayer('home', 20, 30, '#034694'),
      id: 'p1',
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
      <TacticalStoreProvider>{children}</TacticalStoreProvider>
    );

    const { result } = renderHook(
      () => {
        const stores = useTacticalStoresContext();
        const handlers = useMarkerDragHandlers({
          pitchRect: { x: 0, y: 0, width: 1000, height: 500 },
          visibleMarkers: [p1],
          arrows: [],
          selectedIds: ['p1'],
          selectObject: vi.fn(),
          updateMarker: vi.fn(),
          updateMarkers: vi.fn(),
          setIsDragging: vi.fn(),
          setIsHudOpen: vi.fn(),
        });
        return { stores, handlers };
      },
      { wrapper },
    );

    const createDragEvent = (x: number, y: number) =>
      ({
        evt: { shiftKey: false, clientX: x, clientY: y },
        target: {
          x: () => x,
          y: () => y,
          getLayer: () => ({ batchDraw: vi.fn() }),
          getStage: () => ({
            container: () => ({
              getBoundingClientRect: () => ({
                left: 0,
                top: 0,
                width: 1000,
                height: 500,
              }),
            }),
          }),
        },
      }) as unknown as KonvaEventObject<DragEvent>;

    act(() => {
      result.current.handlers.handleDragStart(createDragEvent(200, 150), 'p1');
      result.current.handlers.handleMarkerDragMove(
        createDragEvent(350, 200),
        'p1',
      );
    });

    const deltaDuringDrag =
      result.current.stores.sessionStore.getState().activeDragDelta;
    expect(deltaDuringDrag).toEqual({
      entityIds: ['p1'],
      deltaScreenNormX: 15,
      deltaScreenNormY: 10,
    });

    act(() => {
      result.current.handlers.handleDragEnd(createDragEvent(350, 200), p1);
    });

    expect(
      result.current.stores.sessionStore.getState().activeDragDelta,
    ).toBeNull();
  });
});
```

---

### Phase 1 検証コマンド
```bash
bun run ai:check src/features/tactical-unified/core/components/PitchGroundLayer.tsx src/features/tactical-unified/core/components/PlayerConnectLines.tsx src/features/tactical-unified/core/components/use-marker-drag-handlers.ts src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts src/features/tactical-unified/core/components/__tests__/player-connect-lines.test.tsx
```

## Worker Handoff Log
- Phase 1: `sceneGraph.trajectories` の描画配線、ドラッグ時の `sessionStore.setActiveDragDelta` 更新と終了時リセット、旧 updater 3ファイルの物理削除、結合テスト追加を実施し、`bun run ai:check` PASS。Negative Contracts 0件をクリア。
