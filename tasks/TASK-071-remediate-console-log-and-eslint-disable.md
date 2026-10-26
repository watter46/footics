# TASK-071: [Level 1-C] 本番コードの console.log (10件)・eslint-disable (7件)・空 catch の一掃

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-26
- **Target Files**:
  - `extension/entrypoints/background.ts` (MODIFY)
  - `extension/entrypoints/background/commands/capture-command.ts` (MODIFY)
  - `extension/entrypoints/background/commands/mini-mode-command.ts` (MODIFY)
  - `extension/entrypoints/main-bridge.content.ts` (MODIFY)
  - `extension/entrypoints/overlay.content.tsx` (MODIFY)
  - `src/features/match/components/match-view-wrapper.tsx` (MODIFY)
  - `src/lib/data-management.ts` (MODIFY)
  - `src/lib/db/export.ts` (MODIFY)
  - `src/lib/db/extension-db-queries.ts` (MODIFY)
  - `src/lib/tactical/export/video-export-engine.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/animation-node-updater.ts` (MODIFY)
  - `src/features/tactical-unified/objects/player/components/player-focus-spotlight.tsx` (MODIFY)
  - `src/features/tactical-unified/objects/player/components/player-marker-ring.tsx` (MODIFY)
  - `src/features/tactical-unified/objects/player/types.ts` (MODIFY)
  - `src/features/teams/components/PlayerPhoto.tsx` (MODIFY)
  - `src/lib/tactical/export/share-store.ts` (MODIFY)
  - `src/lib/tactical/player-formatting.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. 対象10ファイルに残存する `console.log` をすべて除去する（エラー記録が必要な箇所のみ `console.warn` / `console.error` を使用）。
- [x] 2. 対象7ファイルに残存する無効な `eslint-disable` / `eslint-disable-next-line` コメント（計30箇所）をすべて削除する。
- [x] 3. `src/lib/data-management.ts` 等にある空の `catch {}` ブロックに適切なエラーハンドリングまたは `console.warn` を追加し、握りつぶしを解消する。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
// 新規外部依存の追加なし
```

### 3.2 Key Interfaces & Types
```ts
// 公開シグネチャ・型の変更なし
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// 並列実行時の競合防止のため、TASK-069/070 の対象ファイル（capture-service.ts, overlay-app.tsx, cache-sync.ts, save-queue.ts, use-data-sync.ts）および .agents/guardrails-baseline.json には触れないこと。
// eslint-disable コメントを削除する際、既存の型定義（any 等）は Level 4 で解消するため、本タスクではコメント削除のみ行うこと。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: Extension エントリポイント5件と src/ 5件の console.log・空 catch 除去
- **Worker Model**: `flash_lite`
- **対象ファイル**: `extension/entrypoints/background.ts`, `extension/entrypoints/background/commands/capture-command.ts`, `extension/entrypoints/background/commands/mini-mode-command.ts`, `extension/entrypoints/main-bridge.content.ts`, `extension/entrypoints/overlay.content.tsx`, `src/features/match/components/match-view-wrapper.tsx`, `src/lib/data-management.ts`, `src/lib/db/export.ts`, `src/lib/db/extension-db-queries.ts`, `src/lib/tactical/export/video-export-engine.ts`
- **契約 (Interface)**:
  ```ts
  // console.log の完全除去と空 catch の解消
  ```
- **Testing Strategy**: `bun run ai:check` で対象ファイルの検査と関連テストが PASS すること。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:
  - 対象10ファイルの `console.log` 除去および空 `catch` の `console.warn` 置換を完了。`video-export-engine.ts` の行数超過（R8）を防止するため不要コメントを整理し 872 行で保持。

### Phase 2: 7ファイルの eslint-disable コメント一掃
- **Worker Model**: `flash_lite`
- **対象ファイル**: `src/features/tactical-unified/hooks/animation-node-updater.ts`, `src/features/tactical-unified/objects/player/components/player-focus-spotlight.tsx`, `src/features/tactical-unified/objects/player/components/player-marker-ring.tsx`, `src/features/tactical-unified/objects/player/types.ts`, `src/features/teams/components/PlayerPhoto.tsx`, `src/lib/tactical/export/share-store.ts`, `src/lib/tactical/player-formatting.ts`
- **契約 (Interface)**:
  ```ts
  // eslint-disable コメントを 0 件にする
  ```
- **Testing Strategy**: `bun run ai:check` で対象ファイルの検査と関連テストが PASS すること。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:
  - 対象7ファイルから残存する無効な `eslint-disable` / `eslint-disable-next-line` コメント（計30箇所）を完全削除し、`bun run ai:check` で Biome/型検査/テスト全PASSを確認。型定義（any）は Level 4 で解消予定のため保持。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-26 15:58
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**: 本番コードに残存していた console.log の完全除去、無効な eslint-disable コメントの全件削除、空 catch ブロックへの安全な console.warn 導入がスコープ厳守で完了していることを確認。型やシグネチャの破壊、ホスト境界侵害等の一切の欠陥なし。

## 6. Rejections / Additional Tasks (不可逆修正欄)
