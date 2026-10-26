# TASK-064: [Level 4-A] tactical-unified 領域の any 全廃 (33ファイル) と noUncheckedIndexedAccess 対応

## 1. Metadata
- **Status**: `TODO`
- **Created**: 2026-10-26
- **Target Files**:
  - `src/features/tactical-unified/adapters/**` (MODIFY)
  - `src/features/tactical-unified/core/**` (MODIFY)
  - `src/features/tactical-unified/hooks/**` (MODIFY)
  - `src/features/tactical-unified/objects/**` (MODIFY)
  - `src/features/tactical-unified/panels/**` (MODIFY)
  - `src/features/tactical-unified/stores/**` (MODIFY)
  - `tsconfig.json` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [ ] 1. `src/features/tactical-unified/` 配下に残存する `any` および `as unknown as`（33ファイル）を具体的な Konva ノード型（`Konva.Node`, `Konva.Group`, `Konva.Shape` 等）または判別共用体型に置き換え、`tactical-unified` 内の `explicitAny` を 0 件にする。
- [ ] 2. `src/features/tactical-unified/` 配下の配列・Record 添字アクセスに対して Optional Chaining (`?.`)・Nullish Coalescing (`??`)・早期ガードを追加し、`noUncheckedIndexedAccess: true` 下で型エラーが 0 件になるようにする。
- [ ] 3. 非戦術ボード領域（TASK-075）と合わせて `tsconfig.json` の `"noUncheckedIndexedAccess": true` を有効化できる状態にする。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import type Konva from 'konva';
```

### 3.2 Key Interfaces & Types
```ts
// 添字アクセス時は T | undefined として安全にガードする
const activeSlide = slides[activeSlideIndex];
if (!activeSlide) return;
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// 並列実行する TASK-075（extension, src/lib, teams 等の型修正）と競合しないよう、本タスクでは src/features/tactical-unified/ 配下のみを編集すること。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: tactical-unified/core および objects の any 排除 (26ファイル)
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/components/**`, `src/features/tactical-unified/core/types.ts`, `src/features/tactical-unified/objects/player/**`
- **契約 (Interface)**:
  ```ts
  // Konva イベント・Ref・Target 型の厳密化により any / as unknown as を 0 件にする
  ```
- **Testing Strategy**: `bun run ai:check` で対象ファイルの検査と関連テストが PASS すること。
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:

### Phase 2: tactical-unified/hooks・panels・stores・adapters の any 排除 (7ファイル)
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/adapters/tactical-canvas-store-adapter.ts`, `src/features/tactical-unified/hooks/animation-node-updater.ts`, `src/features/tactical-unified/hooks/konva-export-helpers.ts`, `src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts`, `src/features/tactical-unified/hooks/use-tactical-match-init.ts`, `src/features/tactical-unified/panels/export/export-preview-player.tsx`, `src/features/tactical-unified/panels/toolbar/top-bar-more-menu.tsx`, `src/features/tactical-unified/stores/store-helpers.ts`
- **契約 (Interface)**:
  ```ts
  // animation-node-updater.ts (16箇所) 等の any をすべて具体的な型へ置換
  ```
- **Testing Strategy**: `bun run ai:check` で対象ファイルの検査と関連テストが PASS すること。
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:

### Phase 3: tactical-unified 全域の noUncheckedIndexedAccess 未定義ガード対応
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/**`, `src/features/tactical-unified/stores/**`, `src/features/tactical-unified/hooks/**`, `src/features/tactical-unified/panels/**`
- **契約 (Interface)**:
  ```ts
  // --noUncheckedIndexedAccess 有効時に src/features/tactical-unified/ の型エラーが 0 件になること
  ```
- **Testing Strategy**: `bun run ai:check` がエラー 0 で PASS すること。
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
