# TASK-069: [Level 1-A] 多段相対 import (56ファイル) のエイリアス統一と中継 Barrel 廃止

## 1. Metadata
- **Status**: `COMPLETED`
- **Created**: 2026-10-26
- **Target Files**:
  - `extension/entrypoints/**` (MODIFY)
  - `extension/features/**` (MODIFY)
  - `src/app/teams/[teamId]/page.tsx` (MODIFY)
  - `src/features/tactical-unified/core/**` (MODIFY)
  - `src/lib/data/event-groups/*.ts` (MODIFY)
  - `src/stores/tactical-unified-store.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `extension/` 配下の多段相対 import（`../../` 以上、30ファイル）をすべて `~/`（Extension内）または `@/`（Web共用）エイリアスに置換する。
- [x] 2. `src/` 配下の多段相対 import（`../../` 以上、26ファイル）をすべて `@/` エイリアスに置換する。
- [x] 3. `extension/features/capture/services/capture-service.ts`, `extension/features/memo-overlay/components/overlay-app.tsx`, `extension/features/storage-sync/cache-sync.ts`, `extension/features/storage-sync/save-queue.ts` の4ファイルに残存する `console.log` を除去する（Wave 1 並列タスクとの競合防止のため本タスクで同時実施）。
- [x] 4. 中継専用の Barrel ファイル `src/stores/tactical-unified-store.ts` の `export *` 参照元を `@/features/tactical-unified/stores/tactical-unified-store` への直接 import に切り替え、多段相対 import 違反を 0 件にする。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
// ❌ 禁止: 2階層以上の相対遡り
import { DEFAULT_BOUNDARY_BOX } from '../../core/store/canvas-store-pitch';
// ✅ 推奨: エイリアスによる直接 import
import { DEFAULT_BOUNDARY_BOX } from '@/features/tactical-unified/core/store/canvas-store-pitch';
```

### 3.2 Key Interfaces & Types
```ts
// 公開型・関数シグネチャの変更は行わない（import パス解決のみ）
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// 並列実行時のファイル競合を防ぐため、.agents/guardrails-baseline.json は編集しないこと。
// extension/ 配下の4ファイル（capture-service.ts, overlay-app.tsx, cache-sync.ts, save-queue.ts）では console.log も同時に削除すること。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: extension/ 配下 30 ファイルの多段相対 import 解消と 4 ファイルの console.log 除去
- **Worker Model**: `flash_lite`
- **対象ファイル**: `extension/entrypoints/**`, `extension/features/canvas/**`, `extension/features/capture/services/capture-service.ts`, `extension/features/dashboard/**`, `extension/features/memo-overlay/**`, `extension/features/sidepanel/**`, `extension/features/storage-sync/**`
- **契約 (Interface)**:
  ```ts
  // extension/ 内の '../../' import を '~/' または '@/' へ統一
  ```
- **Testing Strategy**: `bun run ai:check` で対象ファイルの型チェック・Lint・関連単体テストがすべて PASS すること。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:
  - `extension/` 配下 30 ファイルの多段相対 import を `~/` エイリアスへ統一し、4 ファイルの不要な `console.log` を除去。`bun run ai:check` 完全PASS。

### Phase 2: src/ 配下 26 ファイルの多段相対 import 解消と Barrel ファイル参照切り替え
- **Worker Model**: `flash_lite`
- **対象ファイル**: `src/app/teams/[teamId]/page.tsx`, `src/features/tactical-unified/core/components/**`, `src/lib/data/event-groups/*.ts`, `src/stores/tactical-unified-store.ts`
- **契約 (Interface)**:
  ```ts
  // src/ 内の '../../' import を '@/' へ統一
  ```
- **Testing Strategy**: `bun run ai:check` で対象ファイルの型チェック・Lint・関連単体テストがすべて PASS すること。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:
  - `src/app`, `src/features/tactical-unified/core/components`, `src/lib/data/event-groups` 配下26ファイルの多段相対 import (`../../`) を `@/` エイリアスに置換。`bun run ai:check` 完全PASS。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-26
- **Decision**: `APPROVED`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  - extension/ 配下30ファイル、src/ 配下26ファイル、計56ファイルの多段相対 import (`../../` 以上) がエイリアス (`~/`, `@/`) に統一されたことを確認。
  - 4ファイルに残存していた不要な `console.log` が正しく除去されていることを確認。
  - 境界契約の破壊・不要ファイルの変更なし。すべてのテストおよびガードレール検証が PASS。

## 6. Rejections / Additional Tasks (不可逆修正欄)
