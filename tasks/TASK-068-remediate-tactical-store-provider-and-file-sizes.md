# TASK-068: [Level 5-A] tactical-unified の 300行超ファイル分割 (10件) と Store Provider 段階移行

## 1. Metadata
- **Status**: `TODO`
- **Created**: 2026-10-26
- **Target Files**:
  - `src/features/tactical-unified/adapters/tactical-canvas-store-adapter.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/PlayerLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/utils/canvas-coordinates.ts` (MODIFY)
  - `src/features/tactical-unified/core/utils/matrix-coordinates.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/konva-export-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/squad-sub-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/stores/annotation-slice.ts` (MODIFY)
  - `src/features/tactical-unified/stores/project-slice.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [ ] 1. `src/features/tactical-unified/` 配下の 300行超ファイル（10ファイル）を単一責務のサブモジュール・カスタムフックへ分割し、すべてのファイルを 300行以下にする（R8 規約準拠）。
- [ ] 2. `tactical-unified/panels/` および `hooks/` における `useTacticalUnifiedStore` 直接参照を Context Hook 経由へ移行し、`tactical-canvas-store-adapter.ts`（348行）を 300行以下に縮小する（R4 規約準拠）。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
// 分割ファイル間の再エクスポートには export * を使用せず、明示的な named export を行うこと
```

### 3.2 Key Interfaces & Types
```ts
// 既存の公開関数・コンポーネント Props のシグネチャは完全に維持する
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// 並列実行する TASK-076（src/lib および syntax-studio の300行超分割）と競合しないよう、src/features/tactical-unified/ 配下のみを編集すること。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: core/utils・core/components の 300行超ファイル 4 件の責務分割
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/utils/canvas-coordinates.ts`, `src/features/tactical-unified/core/utils/matrix-coordinates.ts`, `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx`, `src/features/tactical-unified/core/components/PlayerLayer.tsx`
- **契約 (Interface)**:
  ```ts
  // 4ファイルすべてを 300行以下に分割し、既存の export シグネチャを維持
  ```
- **Testing Strategy**: `src/features/tactical-unified/core/` の既存単体テストがすべて PASS すること。
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:

### Phase 2: panels・hooks・stores・adapters の 300行超ファイル 6 件の責務分割
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/adapters/tactical-canvas-store-adapter.ts`, `src/features/tactical-unified/hooks/konva-export-helpers.ts`, `src/features/tactical-unified/panels/export/export-preview-player.tsx`, `src/features/tactical-unified/panels/right-panel/squad-sub-panel.tsx`, `src/features/tactical-unified/stores/annotation-slice.ts`, `src/features/tactical-unified/stores/project-slice.ts`
- **契約 (Interface)**:
  ```ts
  // 6ファイルすべてを 300行以下に分割
  ```
- **Testing Strategy**: `bun run ai:check` で対象ファイルの検査と関連テストが PASS すること。
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 
- **Decision**: `TODO`
- **Audit Checklist**:
  - [ ] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [ ] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [ ] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [ ] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:

## 6. Rejections / Additional Tasks (不可逆修正欄)
