# TASK-007: Tactical Unified Web Core 統合 & Ref 契約接続

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-19
- **Target Files**:
  - `src/features/tactical-unified/views/FullTacticalCanvas.tsx` (NEW)
  - `src/features/tactical-unified/panels/toolbar/top-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/tactical-unified-page.tsx` (MODIFY)
  - `src/features/tactical-unified/views/__tests__/full-tactical-canvas.test.tsx` (NEW)
  - `src/features/tactical-unified/panels/toolbar/__tests__/top-bar-copy.test.tsx` (NEW)
  - `src/features/tactical-unified/__tests__/tactical-unified-page-integration.test.tsx` (NEW)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] Web アプリケーション専用の Level 3 Feature View `FullTacticalCanvas.tsx` を新規作成し、`CanvasStoreProvider` と `CanvasStageContainer`（`core`）を合成して描画すること。
- [x] `useTacticalUnifiedStore` からアクティブスライドデータ（`players`, `arrows`, `zones`, `texts`, `boundaryBox`, `pitchTransform`）を取得し、`CanvasStoreProvider` へ初期Props確定注入（Flickerゼロ）すること。
- [x] `CanvasCoreHandle`（`exportPng`, `copyToClipboard`, `undo`, `redo`）を `forwardRef` で公開し、親コンポーネントから直接操作可能にすること。
- [x] `top-bar.tsx` の `window.dispatchEvent(new CustomEvent('tactical:copy-png'))` を完全全廃し、`canvasRef.current?.copyToClipboard()` による明示的な Ref 契約呼出に移行すること。
- [x] `tactical-unified-page.tsx` のキャンバス描画先を旧 `UnifiedCanvas` から `FullTacticalCanvas` に差し替えること。
- [x] キャンバス内のアノテーション・マーカー変更時に、アクティブスライドへの反映（`updateSlide` 等）を同期させること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { forwardRef, useMemo, useRef } from 'react';
import {
  CanvasStageContainer,
  CanvasStoreProvider,
  createCanvasStore,
  type CanvasCoreHandle,
  type CanvasConfig,
} from '@/features/tactical-unified/core';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { selectActiveSlide } from '@/features/tactical-unified/stores/tactical-unified-selectors';
import type { Slide } from '@/lib/types/tactical-unified';
```

### 3.2 Key Interfaces & Types
```ts
export interface FullTacticalCanvasProps {
  className?: string;
  imageAspect?: number;
}

export interface CanvasCoreHandle {
  exportPng: (options?: { crop?: boolean; scale?: number }) => Promise<string>;
  copyToClipboard: (options?: { crop?: boolean; scale?: number }) => Promise<void>;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}
```

### 3.3 Reference Pattern (Extension の QuickAnnotationCanvas 実装)
```tsx
export const FullTacticalCanvas = forwardRef<CanvasCoreHandle, FullTacticalCanvasProps>(
  function FullTacticalCanvas({ className = '', imageAspect = 16 / 9 }, ref) {
    const activeSlide = useTacticalUnifiedStore(selectActiveSlide);
    const storeApi = useMemo(() => {
      return createCanvasStore({
        mode: 'tactical-board',
        markerMode: 'all',
        initialAnnotations: activeSlide ? JSON.stringify({
          arrows: activeSlide.arrows,
          zones: activeSlide.zones,
          texts: activeSlide.texts,
          markers: activeSlide.players,
        }) : undefined,
      });
    }, [activeSlide?.id]);

    return (
      <CanvasStoreProvider store={storeApi}>
        <CanvasStageContainer ref={ref} className={className} imageAspect={imageAspect} />
      </CanvasStoreProvider>
    );
  }
);
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: FullTacticalCanvas (Level 3 Feature View) の作成
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/views/FullTacticalCanvas.tsx`
- **契約 (Interface)**:
  ```ts
  export const FullTacticalCanvas: React.ForwardRefExoticComponent<
    FullTacticalCanvasProps & React.RefAttributes<CanvasCoreHandle>
  >;
  ```
- **Testing Strategy**:
  - 対象: `src/features/tactical-unified/views/__tests__/full-tactical-canvas.test.tsx`
  - ケース:
    1. activeSlide のマーカー・矢印情報がキャンバスストアに注入されて描画されること
    2. ref を介して `exportPng` や `copyToClipboard` が実行可能であること
- **Tasks**:
  - [x] 1. TDD実装: `FullTacticalCanvas.tsx` の実装と単体テスト（RED ➔ GREEN ➔ `ai:check` PASS）
- **Worker Handoff Log**:
  - `FullTacticalCanvas.tsx` (Level 3 Feature View) を作成し、`CanvasStoreProvider` と `CanvasStageContainer`（`core`）を合成。
  - `activeSlide` のデータをスライドID切り替え時に初期Propsとして確定注入し、キャンバス内アノテーションの変更を `updateSlide` でアクティブスライドへ同期。
  - `CanvasCoreHandle`（`exportPng`, `copyToClipboard`, `undo`, `redo`）を `ref` に転送し、親から操作可能にした。
  - Phase 1 の scoped typecheck, Biome check, Vitest がすべて PASS（exit code 0）。

---

### Phase 2: TopBar の CustomEvent 撤廃 & Ref 契約接続
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/panels/toolbar/top-bar.tsx`
- **契約 (Interface)**:
  ```ts
  export interface TopBarProps {
    canvasRef?: React.RefObject<CanvasCoreHandle | null>;
  }
  export function TopBar(props: TopBarProps): React.ReactElement;
  ```
- **Testing Strategy**:
  - 対象: `src/features/tactical-unified/panels/toolbar/__tests__/top-bar-copy.test.tsx`
  - ケース: Copyボタンクリック時に `window.dispatchEvent` を呼ばず、`canvasRef.current.copyToClipboard()` を呼ぶこと
- **Tasks**:
  - [x] 1. TDD実装: `top-bar.tsx` の修正と単体テスト（RED ➔ GREEN ➔ `ai:check` PASS）
- **Worker Handoff Log**:
  - `TopBarProps` に `canvasRef?: React.RefObject<CanvasCoreHandle | null>` を追加。
  - `window.dispatchEvent(new CustomEvent('tactical:copy-png'))` を全廃し、`canvasRef?.current?.copyToClipboard()` を呼ぶように修正。
  - テスト `top-bar-copy.test.tsx` で `dispatchEvent` が呼ばれず `copyToClipboard` が実行されることを検証。
  - Phase 2 の scoped typecheck, Biome check, Vitest が exit code 0 で全PASS。

---

### Phase 3: TacticalUnifiedPage の結合 & 総合検証
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/tactical-unified-page.tsx`
- **契約 (Interface)**:
  - `canvasRef` を作成し、`FullTacticalCanvas` と `TopBar` に渡す
  - 旧 `UnifiedCanvas` の動的インポートを `FullTacticalCanvas` に差し替え
- **Testing Strategy**:
  - 対象: `src/features/tactical-unified/__tests__/tactical-unified-page-integration.test.tsx`
  - ケース: `TacticalUnifiedPage` が正常にマウントされ、TopBar と FullTacticalCanvas が接続されていること
- **Tasks**:
  - [x] 1. TDD実装: `tactical-unified-page.tsx` の結合と統合テスト（RED ➔ GREEN ➔ `ai:check` PASS）
- **Worker Handoff Log**:
  - `tactical-unified-page.tsx` において旧 `UnifiedCanvas` の動的インポートを `FullTacticalCanvas` に差し替え。
  - `canvasRef` を作成し、`TopBar`（`canvasRef`）と `FullTacticalCanvas`（`ref={canvasRef}`）に接続。
  - 統合テスト `tactical-unified-page-integration.test.tsx` を作成し、マウントと接続を検証。
  - Phase 3 の scoped typecheck, Biome check, Vitest が exit code 0 で全PASS。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `flash`
- **Reviewed At**: 2026-10-19
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 要件網羅性: Requirements の仕様が手抜きなくコードに実在するか（テストのハリボテ化がないか）
  - [x] 境界と副作用: Level 2 core にホスト依存（chrome.*, Web専用ストア）の混入がないか、useEffectによるFlickerがないか
  - [x] 設計負債防止: switch/ifの増殖（OCP違反）がなく、1ファイル250行以内に収まっているか
  - [x] サイレント破壊防止: 指示外ファイルの変更や既存コード・テストの勝手な削除がないか
- **Summary**:
  - `FullTacticalCanvas` の新規作成により Web アプリケーション専用の Level 3 Feature View として正しく分離され、`CanvasCoreHandle` 経由での Ref 契約操作が確立。TopBar からの `window.dispatchEvent(tactical:copy-png)` は完全全廃され、4大定性監査にすべて合格。LGTM。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 差し戻し時のみ追記 -->
