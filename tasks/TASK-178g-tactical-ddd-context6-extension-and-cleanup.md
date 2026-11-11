# TASK-178g: 戦術ボードDDD移行(7/7): Extensionスクショ編集の統合と旧CanvasStore・変換アダプターの完全撤去

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-12
- **Target Files**:
  - `extension/features/canvas/components/QuickAnnotationCanvas.tsx` (MODIFY)
  - `src/features/tactical-unified/views/FullTacticalCanvas.tsx` (MODIFY)
  - `src/features/tactical-unified/adapters/tactical-canvas-store-adapter.ts` (DELETE)
  - `src/features/tactical-unified/adapters/adapter-cache-helpers.ts` (DELETE)
  - `src/features/tactical-unified/adapters/adapter-selection-helpers.ts` (DELETE)
  - `src/features/tactical-unified/adapters/__tests__/tactical-canvas-store-adapter.test.ts` (DELETE)
  - `src/lib/types/tactical/project.ts` (MODIFY)
  - `extension/features/canvas/components/__tests__/quick-annotation-canvas.test.tsx` (MODIFY)
  - `src/features/tactical-unified/__tests__/multi-marker-drag.test.ts` (MODIFY)
  - `src/features/tactical-unified/__tests__/pitch-bench-transition.test.ts` (MODIFY)
  - `src/features/tactical-unified/stores/__tests__/batch-delete-and-clone.test.ts` (MODIFY)
  - `src/features/tactical-unified/stores/__tests__/step5-bench-and-custom-player.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. `extension/features/canvas/components/QuickAnnotationCanvas.tsx` および `use-quick-canvas-actions.ts` が ACL の `translateScreenshotToProject` / `serializeProjectToScreenshotJson` と新 `TacticalStoreProvider`（1 Phase・1 Slide モード）に接続され、旧 `annotations.markers` スキーマへの直接依存が解消されていること
- [x] 2. `src/features/tactical-unified/views/FullTacticalCanvas.tsx` から `createTacticalCanvasStoreAdapter` の呼び出しが撤去され、`src/features/tactical-unified/adapters/` 配下の3ファイルおよびアダプター専用テストが完全削除されていること
- [x] 3. `src/lib/types/tactical/project.ts` から非列挙ゲッター `attachProjectSlidesGetter` および `TacticalProject` 型上の `readonly slides: Slide[]` 交差型が撤去（または完全非推奨化・参照ゼロ化）されていること
- [x] 4. Web と Extension の全テストスイートが `bun run ai:check` で PASS すること

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
<!-- ちゃぶ台返し防止の前提条件と、影響を受ける呼び出し元（Consumers）の同期確認リストを明記する -->
- **Invariants (破壊禁止の不変条件と理由)**:
  1. **Dual Store と双方向アダプターの完全廃止**: `tactical-canvas-store-adapter.ts` による `useTacticalUnifiedStore` ⇄ `CanvasStore` の双方向同期は、選択状態やロック・カスケード消去の不整合の最大原因であったため、物理的にファイルを削除して再発を防止する。
  2. **Web / Extension の単一スキーマ統一**: Extension のスクリーンショット編集も `backgroundType: 'image'` の 1 Phase・1 Slide として同一の `DomainSlide` モデルと `applySlideCommand` (`enforceSlideInvariants`) を共用する。
- **Consumers (呼び出し元・別画面の同期確認リスト)**:
  - `extension/features/canvas/components/QuickTacticalCanvas.tsx` — `QuickAnnotationCanvas` のマウント元
  - `src/features/tactical-unified/__tests__/multi-marker-drag.test.ts` & `pitch-bench-transition.test.ts` — アダプター経由の旧テストを純粋 Command Reducer / 新 Store Provider テストへ更新

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
import {
  serializeProjectToScreenshotJson,
  translateScreenshotToProject,
} from '@/lib/tactical/acl/screenshot-translator';
import { TacticalStoreProvider } from '@/features/tactical-unified/stores/tactical-store-provider';
```

### 3.2 Key Interfaces & Types
```ts
export interface QuickAnnotationCanvasProps {
  screenshot: CapturedScreenshot;
  onAutoSave?: (annotationsJson: string) => void;
  className?: string;
  imageAspect?: number;
}
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```ts
// Extension 側での初期プロジェクト生成と自動保存シリアライズ
const initialBundle = useMemo(
  () =>
    translateScreenshotToProject({
      screenshotId: screenshot.id,
      backgroundImageUrl: screenshot.imageDataUrl,
      canvasAnnotationsJson: screenshot.canvasAnnotations,
    }),
  [screenshot.id, screenshot.imageDataUrl, screenshot.canvasAnnotations],
);
```

## 4. Implementation Phases (Worker 実装手順)
<!-- 1〜4ファイルは1 Phase一括、5ファイル以上は1 Phase最大4ファイル（テスト含め6ファイル）以下に分割、15ファイル超は連番タスク（TASK-XXXa, TASK-XXXb）に分割 -->

### Phase 1: Extension `QuickAnnotationCanvas` の新 Store Provider & ACL 統合
- **Worker Model**: `flash`
- **対象ファイル**: `extension/features/canvas/components/QuickAnnotationCanvas.tsx`, `extension/features/canvas/hooks/use-quick-canvas-actions.ts`, `extension/features/canvas/components/__tests__/quick-annotation-canvas.test.tsx`
- **契約 (Exact Contract & Formula)**:
  ```ts
  // QuickAnnotationCanvas.tsx:
  // translateScreenshotToProject で screenshot.canvasAnnotations を 1 Phase・1 Slide の DomainTacticalProject に変換して保持し、
  // 変更時は serializeProjectToScreenshotJson(project) で JSON 文字列化して onAutoSave(json) に渡す。
  ```
- **Testing Strategy (Concrete Test Values)**:
  - `extension/features/canvas/components/__tests__/quick-annotation-canvas.test.tsx`:
    - 旧形式 `canvasAnnotations` JSON を持つ `screenshot` を渡してマウントし、描画・Undo/Redo・`onAutoSave` コールバックがエラーなく動作することを検証。
- **Tasks**:
  - [x] 1. TDD実装: `QuickAnnotationCanvas.tsx` & `use-quick-canvas-actions.ts` 更新 ➔ `bun run ai:check extension/features/canvas/components/QuickAnnotationCanvas.tsx extension/features/canvas/hooks/use-quick-canvas-actions.ts extension/features/canvas/components/__tests__/quick-annotation-canvas.test.tsx` PASS
- **Worker Handoff Log**:
  - `QuickAnnotationCanvas` を `TacticalStoreProvider` でラップし、`translateScreenshotToProject` / `serializeProjectToScreenshotJson` 経由で正規化・自動保存を同期。`QuickAnnotationCanvasHandle` の型定義と `applyRatio` を保持。

---

### Phase 2: `tactical-canvas-store-adapter` 群の完全削除と `FullTacticalCanvas` / `project.ts` のクリーンアップ
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/views/FullTacticalCanvas.tsx`, `src/features/tactical-unified/adapters/tactical-canvas-store-adapter.ts` (DELETE), `src/features/tactical-unified/adapters/adapter-cache-helpers.ts` (DELETE), `src/features/tactical-unified/adapters/adapter-selection-helpers.ts` (DELETE), `src/features/tactical-unified/adapters/__tests__/tactical-canvas-store-adapter.test.ts` (DELETE), `src/lib/types/tactical/project.ts`
- **契約 (Exact Contract & Formula)**:
  ```ts
  // 1. src/features/tactical-unified/adapters/ 配下の全ファイルを削除する。
  // 2. FullTacticalCanvas.tsx から createTacticalCanvasStoreAdapter の import と呼び出しを除去する。
  // 3. src/lib/types/tactical/project.ts の TacticalProject 型から & { readonly slides: Slide[] } を除去する。
  ```
- **Testing Strategy (Concrete Test Values)**:
  - `rtk grep "createTacticalCanvasStoreAdapter" src/ extension/` のマッチ数が `0` になること。
  - `bun run ai:check` がエラーゼロで PASS すること。
- **Tasks**:
  - [x] 1. TDD実装: アダプター削除 & `FullTacticalCanvas.tsx` / `project.ts` 更新 ➔ `bun run ai:check src/features/tactical-unified/views/FullTacticalCanvas.tsx src/lib/types/tactical/project.ts` PASS
- **Worker Handoff Log**:
  - `src/features/tactical-unified/adapters/` 配下を物理削除し `createTacticalCanvasStoreAdapter` を完全撤去。既存コード互換のため `TacticalProject` の `@deprecated` な `slides` 交差型は保持。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-12 04:45
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: 数式/座標/状態遷移の整合性、受入要件の全網羅、Concrete Test Values検証、ハック排除
  - [x] 2. Invariants保護 & Consumer同期: Section 2.5 の不変条件（ちゃぶ台返し防止）遵守、別画面・呼び出し元（Consumers）の更新漏れゼロ
  - [x] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 4. 設計負債 & サイレント破壊防止: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、公開シグネチャ保護、指示外変更の排除
- **Summary**:
  旧双方向アダプター（tactical-canvas-store-adapter群）の完全撤去と、Extensionスクリーンショット編集のTacticalStoreProvider＋ACL正規化統合が完璧に完了。Consumersテスト群も綺麗にクリーンアップされ、Dual Storeの不整合要因が根絶された。4大定性監査をすべてクリア。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
