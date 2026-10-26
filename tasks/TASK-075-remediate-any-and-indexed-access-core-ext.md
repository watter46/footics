# TASK-075: [Level 4-B] extension・src/lib・非戦術領域の any 全廃 (18ファイル) と noUncheckedIndexedAccess 対応

## 1. Metadata
- **Status**: `TODO`
- **Created**: 2026-10-26
- **Target Files**:
  - `extension/tsconfig.json` (MODIFY)
  - `extension/entrypoints/**` (MODIFY)
  - `extension/features/**` (MODIFY)
  - `src/lib/**` (MODIFY)
  - `src/features/memo-overlay/**` (MODIFY)
  - `src/features/teams/**` (MODIFY)
  - `src/features/match/**` (MODIFY)
  - `src/features/dashboard/**` (MODIFY)
  - `src/features/analysis/**` (MODIFY)
  - `src/registry/events/*.ts` (MODIFY)
  - `src/hooks/use-shortcut.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [ ] 1. `extension/tsconfig.json` に `target: "ES2022"`, `noFallthroughCasesInSwitch: true`, `noImplicitOverride: true` を設定する。
- [ ] 2. `extension/`（5ファイル）、`src/lib/`（8ファイル）、`memo-overlay`（2ファイル）、`registry/events`（2ファイル）、`use-shortcut.ts` に残存する `any` / `as unknown as` をすべて具体的な型または `unknown` + Zod 検証へ置換する。
- [ ] 3. `src/features/tactical-unified` を除く全領域（`src/lib/`, `src/features/teams/`, `match/`, `dashboard/`, `analysis/`, `extension/`）の添字アクセスに未定義ガードを追加し、`noUncheckedIndexedAccess` 下での型エラーを 0 件にする。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { z } from 'zod';
```

### 3.2 Key Interfaces & Types
```ts
// 外部 JSON / DB 入力は any ではなく unknown で受けて型ガードまたは Zod parse を行う
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// 並列実行する TASK-064（src/features/tactical-unified/ 専任）と競合しないよう、src/features/tactical-unified/ 配下のファイルは一切編集しないこと。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: extension/tsconfig.json 強化と extension・src/lib・memo-overlay・registry の any 全廃 (18ファイル)
- **Worker Model**: `flash`
- **対象ファイル**: `extension/tsconfig.json`, `extension/entrypoints/background.ts`, `extension/entrypoints/main-bridge.content.ts`, `extension/entrypoints/overlay.content.tsx`, `extension/features/memo-overlay/hooks/use-match-memo-loader.ts`, `extension/features/memo-overlay/hooks/use-overlay-shortcut-interceptor.ts`, `src/features/memo-overlay/stores/memo-overlay-provider.tsx`, `src/features/memo-overlay/stores/memo-overlay-store.ts`, `src/hooks/use-shortcut.ts`, `src/lib/agents/runtime.ts`, `src/lib/data-management.ts`, `src/lib/db/schema.ts`, `src/lib/db/tactical-projects-db.ts`, `src/lib/shortcuts.ts`, `src/lib/tactical/export/share-store.ts`, `src/lib/tactical/export/video-export-engine.ts`, `src/lib/tactical/player-formatting.ts`, `src/registry/events/corner-kick.ts`, `src/registry/events/free-kick.ts`
- **契約 (Interface)**:
  ```ts
  // 対象18ファイルの explicitAny を 0 件にする
  ```
- **Testing Strategy**: `bun run ai:check` で対象ファイルの検査と関連テストが PASS すること。
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:

### Phase 2: src/lib・teams・match・dashboard・analysis・extension の noUncheckedIndexedAccess 対応
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/**`, `src/lib/db/**`, `src/features/teams/**`, `src/features/match/**`, `src/features/dashboard/**`, `src/features/analysis/**`, `extension/**`
- **契約 (Interface)**:
  ```ts
  // 配列・Record 添字アクセスの undefined ガード追加
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
