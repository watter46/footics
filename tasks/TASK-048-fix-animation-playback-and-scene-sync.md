# TASK-048: fix-animation-playback-and-scene-sync

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-24
- **Target Files**:
  - `src/features/tactical-unified/hooks/animation-node-updater.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-tactical-animation.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/__tests__/tactical-animation-canvas.test.ts` (MODIFY)
  - `src/features/tactical-unified/__tests__/tactical-animation.test.ts` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/slide-card.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/playback-controls.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/__tests__/timeline-bar.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. アニメーション描画駆動: `batchDrawLayers` において `synchronous: false` の場合も `registry.stage?.batchDraw()` を呼び出し、各フレームのノード座標変化が Canvas 画面へ 60fps で確実に再描画されること。
- [x] 2. 選択肢B（常にシーン1から再生）ライフサイクル: どのスライドを選択している状態でも、また前回の再生が終了（末尾到達）した後でも、再生開始時は `refs.currentPlaybackTimeRef.current = 0` からタイムラインを開始し、先頭スライド（Scene 1）を `setActiveSlide` して再生すること。一時停止からの再開時のみ現在時刻から再生を継続すること。
- [x] 3. UIフォーカス解除とSpaceキー競合防止: `SlideCard` および `PlaybackControls` のボタンクリック時に `e.currentTarget.blur()` を実行し、ブラウザフォーカスが残留して Space キー押下時にボタンのネイティブ click とショートカットが二重発火する不具合、および複数シーンが同時に選択状態に見える表示不具合を根絶すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
```

### 3.2 Key Interfaces & Types
```ts
export function batchDrawLayers(registry: CanvasNodesRegistry, synchronous: boolean): void;
```

### 3.3 Implementation Notes & Gotchas
```ts
// 1. batchDrawLayers: registry.playerLayer 等は null の場合があるため、registry.stage?.batchDraw() が不可欠
// 2. useTacticalAnimation.playAnimation:
//    - 末尾到達 (currentPlaybackTimeRef.current >= totalDurationMs) の場合は 0 にリセット
//    - 選択肢B: 常に先頭 (0ms / currentSlides[0].id) から再生を開始
//    - 一時停止フラグまたは paused タイムラインがある場合のみ途中再開を許可
// 3. slide-card.tsx / playback-controls.tsx:
//    - onClick で e.currentTarget.blur() を呼び、Space キー押下時のネイティブ click 発火を防止
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: アニメーション描画駆動 & 再生ライフサイクル (Option B)
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/hooks/animation-node-updater.ts`
  - `src/features/tactical-unified/hooks/use-tactical-animation.ts`
  - `src/features/tactical-unified/hooks/__tests__/tactical-animation-canvas.test.ts`
  - `src/features/tactical-unified/__tests__/tactical-animation.test.ts`
- **契約 (Interface)**:
  ```ts
  // 1. animation-node-updater.ts
  export function batchDrawLayers(registry: CanvasNodesRegistry, synchronous: boolean) {
    if (synchronous) {
      registry.backgroundLayer?.draw();
      registry.annotationLayer?.draw();
      registry.playerLayer?.draw();
      registry.ballLayer?.draw();
      registry.stage?.draw();
    } else {
      registry.playerLayer?.batchDraw();
      registry.ballLayer?.batchDraw();
      registry.annotationLayer?.batchDraw();
      registry.stage?.batchDraw(); // 必須追加
    }
  }

  // 2. use-tactical-animation.ts (playAnimation)
  const isAtEnd = refs.currentPlaybackTimeRef.current >= totalDurationMs;
  if (isAtEnd || refs.currentPlaybackTimeRef.current === 0) {
    refs.currentPlaybackTimeRef.current = 0;
    refs.lastActiveSlideIndexRef.current = 0;
    if (currentSlides[0]) {
      setActiveSlide(currentSlides[0].id);
    }
  }
  ```
- **Testing Strategy**:
  - `tactical-animation.test.ts`: `batchDrawLayers` で `stage.batchDraw()` が呼ばれること、再生完了後に再度 `playAnimation()` を呼んだ際に 0ms から再生され Scene 1 がアクティブになることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/__tests__/tactical-animation.test.ts` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/hooks/animation-node-updater.ts` PASS
- **Worker Handoff Log**:
  - `batchDrawLayers`: `registry.stage?.batchDraw()` 追加により非同期描画時のCanvas全体再描画を担保。
  - `playAnimation`: 再生開始/末尾到達時は `refs.currentPlaybackTimeRef.current = 0` および `setActiveSlide(currentSlides[0].id)` で Scene 1 から再開、一時停止時のみ途中時間を維持。

---

### Phase 2: UIフォーカス解除 & Spaceキー二重発火防止
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/timeline/slide-card.tsx`
  - `src/features/tactical-unified/panels/timeline/playback-controls.tsx`
  - `src/features/tactical-unified/panels/timeline/__tests__/timeline-bar.test.tsx`
- **契約 (Interface)**:
  ```ts
  // 1. slide-card.tsx
  onClick={(e) => {
    e.currentTarget.blur();
    onSelect(slide.id);
  }}
  // button の className に 'focus:outline-none' を追加

  // 2. playback-controls.tsx
  onClick={(e) => {
    e.currentTarget.blur();
    togglePlayback();
  }}
  // button の className に 'focus:outline-none' を追加
  ```
- **Testing Strategy**:
  - `timeline-bar.test.tsx`: SlideCard および PlaybackControls のボタンクリック時に blur が呼ばれ、フォーカスが残らないことを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/timeline/__tests__/timeline-bar.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/panels/timeline/slide-card.tsx` PASS
- **Worker Handoff Log**:
  - SlideCard・PlaybackControls の button クリック時に `e.currentTarget.blur()` を呼出し `focus:outline-none` を付与することで、Space キーによるボタン再発火とフォーカス残留を防止。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-24 14:52
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**: batchDrawLayersのstage.batchDraw()追加、Option B（再生開始時Scene 1リセット/一時停止位置維持）、およびUI blur()によるSpace二重発火防止の実装とテストを全て確認。設計品質原則に完全準拠。

## 6. Rejections / Additional Tasks (不可逆修正欄)
