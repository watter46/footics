# TASK-047: fix-animation-pitch-geometry-and-node-reset

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-24
- **Target Files**:
  - `src/features/tactical-unified/core/utils/canvas-registry.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/CanvasStageContainer.tsx` (MODIFY)
  - `src/features/tactical-unified/hooks/tactical-animation-canvas.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/__tests__/tactical-animation-canvas.test.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx` (MODIFY)
  - `src/features/tactical-unified/objects/ball/components/ball-object.tsx` (MODIFY)
  - `src/features/tactical-unified/hooks/use-tactical-animation.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/__tests__/clean-render.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. ピッチ実矩形同期による再生右ズレの根絶: `nodesRegistryRef` に `pitchRect` を常時格納し、`calculatePitchDimensions` がピッチ実寸法（`vRect.width`, `vRect.height`, `x: 0`, `y: 0`）を返却することで、Spaceキー/再生ボタンによるアニメーション再生時の右側飛び出しズレを根絶する。
- [x] 2. 再生停止・完了時の静止位置同期: アニメーション再生完了時（方針A: 最終スライドで停止）および一時停止時に、現在アクティブなスライドの静止フレーム座標へノードを安全に同期・整列する。
- [x] 3. 通常編集復帰時のノード自己復帰: `PlayerMarkerItem` および `BallObject` は `cleanRender` が `false` に切り替わった際（再生終了・一時停止時）、命令的に変更された `position` を最新の静止座標 `pxX, pxY` に強制自己復帰させ、Resetボタン押下時やスライド切り替え時にズレが一切残留しないことを保証する。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import type { PitchRectBounds } from '@/features/tactical-unified/core/utils/canvas-coordinates';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core';
```

### 3.2 Key Interfaces & Types
```ts
export interface CanvasNodesRegistry {
  // 既存プロパティ群...
  pitchRect?: PitchRectBounds | null;
}
```

### 3.3 Implementation Notes & Gotchas
```ts
// 4層モデル Level 2(Components) -> Level 3(StageContainer) -> Level 4(FullTacticalCanvas)
// PlayerMarkerItem / BallObject は <Group x={pitchRect.x} y={pitchRect.y}> の子ノード
// 親Groupがすでにピッチオフセットを持つため、子ノードのローカル座標は offsetX=0, offsetY=0 で計算
// cleanRender=true(再生中) -> cleanRender=false(通常編集復帰) のタイミングで確実に node.position({ x: pxX, y: pxY }) を再適用
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: ピッチ実矩形同期 & アニメーション幾何補正
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/utils/canvas-registry.ts`, `src/features/tactical-unified/core/components/CanvasStageContainer.tsx`, `src/features/tactical-unified/hooks/tactical-animation-canvas.ts`, `src/features/tactical-unified/hooks/__tests__/tactical-animation-canvas.test.ts`
- **契約 (Interface)**:
  ```ts
  // 1. canvas-registry.ts
  import type { PitchRectBounds } from './canvas-coordinates';
  export interface CanvasNodesRegistry {
    // 既存フィールド...
    pitchRect?: PitchRectBounds | null;
  }
  export function createCanvasNodesRegistry(): CanvasNodesRegistry {
    return {
      // 既存...
      pitchRect: null,
    };
  }

  // 2. CanvasStageContainer.tsx
  useEffect(() => {
    nodesRegistryRef.current.stage = stageRef.current;
    nodesRegistryRef.current.pitchRect = vRect;
  });

  // 3. tactical-animation-canvas.ts
  export function calculatePitchDimensions(
    pitchSize?: { width: number; height: number; x?: number; y?: number },
    nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>,
  ): { width: number; height: number; x: number; y: number } {
    if (pitchSize) {
      return {
        width: pitchSize.width,
        height: pitchSize.height,
        x: pitchSize.x ?? 0,
        y: pitchSize.y ?? 0,
      };
    }
    const registry = nodesRegistryRef?.current;
    if (
      registry?.pitchRect &&
      registry.pitchRect.width > 0 &&
      registry.pitchRect.height > 0
    ) {
      return {
        width: registry.pitchRect.width,
        height: registry.pitchRect.height,
        x: 0,
        y: 0,
      };
    }
    const stage = registry?.stage;
    if (stage) {
      return {
        width: stage.width(),
        height: stage.height(),
        x: 0,
        y: 0,
      };
    }
    return { width: 800, height: 450, x: 0, y: 0 };
  }
  ```
- **Testing Strategy**: `tactical-animation-canvas.test.ts` で `registry.pitchRect` が存在する場合にその `width, height, x: 0, y: 0` が返ることを検証
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/hooks/__tests__/tactical-animation-canvas.test.ts` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/hooks/tactical-animation-canvas.ts` PASS
- **Worker Handoff Log**:
  - `CanvasNodesRegistry.pitchRect` を追加し、`CanvasStageContainer` 描画毎に `vRect` を同期。
  - `calculatePitchDimensions` は `registry.pitchRect`（幅・高さ > 0）が存在する場合にその実寸法（x: 0, y: 0）を最優先返却するよう実装。

---

### Phase 2: 通常編集復帰時のノード自己復帰 & 再生ライフサイクル
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx`, `src/features/tactical-unified/objects/ball/components/ball-object.tsx`, `src/features/tactical-unified/hooks/use-tactical-animation.ts`, `src/features/tactical-unified/core/components/__tests__/clean-render.test.tsx`
- **契約 (Interface)**:
  ```ts
  // 1. PlayerMarkerItem.tsx
  // cleanRender が false の時（または cleanRender 変更時）に最新の静止座標 pxX, pxY に強制自己復帰
  useEffect(() => {
    if (groupRef.current && !cleanRender) {
      groupRef.current.position({ x: pxX, y: pxY });
    }
  }, [pxX, pxY, cleanRender]);

  // 2. ball-object.tsx
  // BallObject または useBallObjectState 内で cleanRender が false の時に最新の静止座標 px, py に強制自己復帰
  useEffect(() => {
    if (ballGroupRef.current && !cleanRender) {
      ballGroupRef.current.position({ x: px, y: py });
    }
  }, [px, py, cleanRender]);

  // 3. use-tactical-animation.ts
  // タイムライン onComplete 時（方針A: 最終スライドで停止）
  onComplete: () => {
    if (!options?.loop) {
      const lastSlideIndex = currentSlides.length - 1;
      if (lastSlideIndex >= 0) {
        const lastSlide = currentSlides[lastSlideIndex];
        if (lastSlide) {
          setActiveSlide(lastSlide.id);
          refs.lastActiveSlideIndexRef.current = lastSlideIndex;
          refs.currentPlaybackTimeRef.current = totalDurationMs;
        }
      }
      applyFrameToCanvas(
        totalDurationMs,
        options?.nodesRegistryRef?.current,
        dims.width,
        dims.height,
        true,
        dims.x,
        dims.y,
      );
      setIsPlaying(false);
      onComplete?.();
    }
  }
  ```
- **Testing Strategy**: `clean-render.test.tsx` で `cleanRender=true` から `false` に切り替わった際にノードの `position` が props の座標に自己復元されること、および `use-tactical-animation.ts` の完了時同期を検証
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/core/components/__tests__/clean-render.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/core/components/PlayerMarkerItem.tsx` PASS
- **Worker Handoff Log**:
  - cleanRender 変更時に PlayerMarkerItem / BallObject の node position を props 静止座標へ復帰する useEffect を追加
  - useTacticalAnimation の onComplete 時に最終スライドへの setActiveSlide と applyFrameToCanvas 整列を反映

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-24 14:22
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  ピッチ実矩形同期（pitchRect）による右ズレ根絶、再生完了時の最終スライド・静止フレーム座標整列、および cleanRender 復帰時の PlayerMarker/BallObject 自己復帰ロジックが TDD にて極めて堅牢に実装されていることを確認。4大定性監査（6大設計品質原則）をすべてクリア。

## 6. Rejections / Additional Tasks (不可逆修正欄)
