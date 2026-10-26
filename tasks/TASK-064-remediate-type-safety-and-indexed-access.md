# TASK-064: TypeScript noUncheckedIndexedAccess 有効化と残存 any / 二重キャストの排除

## 1. Metadata
- **Status**: `TODO`
- **Created**: 2026-10-26
- **Target Files**:
  - `tsconfig.json` (MODIFY)
  - `extension/tsconfig.json` (MODIFY)
  - `src/features/tactical-unified/**` (MODIFY)
  - `src/lib/tactical/**` (MODIFY)
  - `src/features/teams/**` (MODIFY)
  - `.agents/guardrails-baseline.json` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [ ] 1. `extension/tsconfig.json` に `target: "ES2022"`, `noFallthroughCasesInSwitch: true`, `noImplicitOverride: true` を反映する。
- [ ] 2. 非テストコードに残存する `any` および `as unknown as`（計44ファイル、`.agents/guardrails-baseline.json` の `explicitAny` 登録分）を具体的な型または `unknown` + Zod 検証に置き換え、ベースラインの `explicitAny` を空にする。
- [ ] 3. `tsconfig.json` および `extension/tsconfig.json` で `"noUncheckedIndexedAccess": true` を有効化し、発生する添字アクセス未チェック箇所（約470箇所）を Optional Chaining (`?.`)・Nullish Coalescing (`??`)・早期ガードで安全に修正して `bun run typecheck:full` を exit code 0 にする。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
// 外部・DB入力の検証には Zod を使用
import { z } from 'zod';
```

### 3.2 Key Interfaces & Types
```ts
// 添字アクセス時は T | undefined として扱う
const firstSlide = slides[0];
if (!firstSlide) return;
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```ts
// ❌ 修正前
const target = slides[activeIndex].players[0];
// ✅ 修正後
const activeSlide = slides[activeIndex];
const target = activeSlide?.players[0];
if (!target) return;
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: extension/tsconfig.json の同期と src/lib・src/stores の any 排除
- **Worker Model**: `flash`
- **対象ファイル**: `extension/tsconfig.json`, `src/lib/data-management.ts`, `src/lib/tactical/export/share-store.ts`, `src/lib/db/tactical-projects-db.ts`
- **契約 (Interface)**:
  ```ts
  // explicitAny ベースライン対象ファイルから any / as unknown as を除去
  ```
- **Testing Strategy**: `bun run ai:check` で対象ファイルの関連テストと型検査がすべて PASS すること。
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:

### Phase 2: tactical-unified・teams・extension の any 排除とベースライン更新
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/hooks/animation-node-updater.ts`, `src/features/tactical-unified/objects/player/types.ts`, `src/features/tactical-unified/core/components/hud/hud-targets.ts`, `.agents/guardrails-baseline.json`
- **契約 (Interface)**:
  ```ts
  // Konva ノード型 (Konva.Node, Konva.Group 等) を明示し any を撤去
  ```
- **Testing Strategy**: `bun .agents/scripts/lib/code-guardrails.ts --write-baseline` 実行後に `explicitAny` が 0 件になること。
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:

### Phase 3: src/lib/tactical およびに src/features/teams の noUncheckedIndexedAccess 対応
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/**`, `src/features/teams/**`, `src/lib/db/**`
- **契約 (Interface)**:
  ```ts
  // 配列・Record 添字アクセスの undefined ガード追加
  ```
- **Testing Strategy**: `--noUncheckedIndexedAccess` フラグ付き `tsc` で該当ディレクトリのエラーが 0 になること。
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:

### Phase 4: src/features/tactical-unified の noUncheckedIndexedAccess 対応と tsconfig.json 有効化
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/**`, `tsconfig.json`, `extension/tsconfig.json`
- **契約 (Interface)**:
  ```json
  { "compilerOptions": { "noUncheckedIndexedAccess": true } }
  ```
- **Testing Strategy**: `bun run typecheck:full` がエラー 0 で PASS すること。
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
