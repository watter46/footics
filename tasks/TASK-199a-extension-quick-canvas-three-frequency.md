# TASK-199a: Extension QuickAnnotationCanvas & screenshot-translator の 3-frequency 直接接続化

- **Status**: `DONE`
- **Assign**: `worker`
- **Commit**: `refactor(tactical-acl,extension): wire screenshot-translator and QuickAnnotationCanvas directly to 3-frequency stores`
- **Execution Waves**:
  - Wave 1 (直列): Phase 1 (`screenshot-translator` + `acl-translators.test.ts` の 1+1 移行)
  - Wave 2 (直列, Wave 1 後): Phase 2 (`QuickAnnotationCanvas` + `RatioPresetSelector` + `quick-annotation-canvas.test.tsx`)
- **Negative Contracts**:
  - `rg(src/lib/tactical/acl/screenshot-translator.ts): serializeProjectToScreenshotJson`
  - `rg(extension/features/canvas/components/QuickAnnotationCanvas.tsx): CanvasStoreProvider|useCanvasStore|serializeProjectToScreenshotJson|QuickAnnotationCanvasBridge`
  - `rg(extension/features/canvas/components/RatioPresetSelector.tsx): CanvasStoreContext`

---

## 1. Architectural Invariants & Design Decisions

- **Invariants (壊してはいけない前提条件)**:
  1. Extension の `QuickAnnotationCanvas` / `RatioPresetSelector` から `CanvasStoreProvider`・`CanvasStoreContext`・`serializeProjectToScreenshotJson` ブリッジを完全撤去し、3-frequency store（`TacticalStoreProvider` 配下の `documentStore` / `sessionStore`）へ直接接続する。
  2. `translateScreenshotToProject` は `{ arrows, zones, texts, markers }` 形式の旧 JSON に加え、保存済み `DomainTacticalProject` JSON（`Array.isArray(parsed.phases)`）も直接復元できるようにし、`onAutoSave?.(JSON.stringify(project))` のラウンドトリップでデータ欠損を起こさない。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `serializeProjectToScreenshotJson` は完全廃止とし、`QuickAnnotationCanvas` の自動保存 JSON は `JSON.stringify(documentStore.getState().project)` へ統一する。
  2. `RatioPresetSelector` は `CanvasStoreContext` フォールバック分岐を持たず、`useDocumentStore` / `useTacticalStoresContext` への `UPDATE_PHASE` dispatch のみに一本化する。
- **Consumers (同期更新対象)**:
  - `src/lib/tactical/acl/screenshot-translator.ts`
  - `extension/features/canvas/components/QuickAnnotationCanvas.tsx`
  - `extension/features/canvas/components/RatioPresetSelector.tsx`

---

## 2. Implementation Phases

### Phase 1: `screenshot-translator.ts` の DomainTacticalProject 直接復元とシリアライザ撤去

- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/acl/screenshot-translator.ts` (87 lines)
  - `[MODIFY]` `src/lib/tactical/__tests__/acl-translators.test.ts` (342 lines)
- **Contract**:
```ts
export interface TranslateScreenshotOptions {
  aspectRatio?: AspectRatio;
  backgroundImageUrl?: string;
  boundaryBox?: BoundaryBox;
  pitchTransform?: PitchTransform;
}

export function translateScreenshotToProject(
  initialAnnotations?: string,
  options?: TranslateScreenshotOptions,
): DomainTacticalProject;
```
  1. `initialAnnotations` が有効な JSON で `Array.isArray(parsed.phases)` を持つ場合、旧 `{ arrows, zones, texts, markers }` パースではなく `normalizeTacticalProject(parsed).project` で復元し、`options.backgroundImageUrl` / `options.aspectRatio` が明示されていれば不足フィールドに適用する。
  2. `Array.isArray(parsed.phases)` でない場合は既存の `{ arrows, zones, texts, markers }` パースを維持する。
  3. `serializeProjectToScreenshotJson` 関数および不要インポートを完全削除する。
- **Concrete Test Cases**:
  - `src/lib/tactical/__tests__/acl-translators.test.ts`:
    - `serializeProjectToScreenshotJson` テストを撤去する。
    - `JSON.stringify(DomainTacticalProject)` 出力を `translateScreenshotToProject(json)` へ入力した際、`phases[0].slides[0]` の `players`, `annotations`, `boundaryBox`, `aspectRatio` が損失なく復元されるラウンドトリップテストを追加する。
    - 既存の `{ arrows, zones, texts, markers }` JSON 変換および不正 JSON フォールバックのテストを維持する。
- **Verification**:
  - `bun run ai:check src/lib/tactical/acl/screenshot-translator.ts src/lib/tactical/__tests__/acl-translators.test.ts`

---

### Phase 2: `QuickAnnotationCanvas` / `RatioPresetSelector` の 3-frequency 直接移行

- **Target Files**:
  - `[MODIFY]` `extension/features/canvas/components/QuickAnnotationCanvas.tsx` (246 lines)
  - `[MODIFY]` `extension/features/canvas/components/RatioPresetSelector.tsx` (209 lines)
  - `[MODIFY]` `extension/features/canvas/components/__tests__/quick-annotation-canvas.test.tsx` (175 lines)
- **Contract**:
```tsx
export interface QuickAnnotationCanvasProps {
  backgroundImageUrl: string;
  initialAnnotations?: string;
  aspectRatio?: AspectRatio;
  onAutoSave?: (annotationsJson: string) => void;
  topBarSlot?: React.ReactNode;
  coreRef?: React.RefObject<CanvasCoreHandle | null>;
}
export const QuickAnnotationCanvas: React.FC<QuickAnnotationCanvasProps>;
```
  1. `QuickAnnotationCanvas.tsx`: `CanvasStoreProvider`, `useCanvasStore`, `serializeProjectToScreenshotJson`, `QuickAnnotationCanvasBridge` を完全撤去し、外側 `QuickAnnotationCanvas` が `<TacticalStoreProvider initialProject={...} initialUi={{ isTacticalUnified: false }}>` で初期化して `QuickAnnotationCanvasInner` を直接描画する。
  2. `onAutoSave` は `documentStore` 購読により 300ms デバウンスで `JSON.stringify(state.project)` を発行し、`aspectRatio` / `backgroundImageUrl` prop 更新時は `documentStore` へ直接反映する。
  3. `RatioPresetSelector.tsx`: `CanvasStoreContext` 購読と `canvasStore.setBoundaryBox(...)` 分岐を削除し、`useDocumentStore` / `useTacticalStoresContext` への `UPDATE_PHASE` dispatch に統一する。
- **Concrete Test Cases**:
  - `extension/features/canvas/components/__tests__/quick-annotation-canvas.test.tsx`:
    - `serializeProjectToScreenshotJson` スパイを撤去する。
    - `initialAnnotations`（旧形式 JSON / `DomainTacticalProject` JSON 双方）からの初期描画、3-frequency store 経由の操作と 300ms デバウンス後 `onAutoSave(JSON.stringify(DomainTacticalProject))` 発火および `translateScreenshotToProject` 再復元を実 `TacticalStoreProvider` で検証する。
    - `RatioPresetSelector` クリックで `CanvasStoreContext` なしに `documentStore` の `aspectRatio` / `boundaryBox` が更新されることを検証する。
- **Verification**:
  - `bun run ai:check extension/features/canvas/components/QuickAnnotationCanvas.tsx extension/features/canvas/components/RatioPresetSelector.tsx extension/features/canvas/components/__tests__/quick-annotation-canvas.test.tsx`
