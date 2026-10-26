# TASK-065: 残存 CustomEvent の全廃と console.log・空 catch・eslint-disable の一掃

## 1. Metadata
- **Status**: `TODO`
- **Created**: 2026-10-26
- **Target Files**:
  - `src/hooks/use-shortcut.ts` (MODIFY)
  - `src/features/match/hooks/use-match-memo.ts` (MODIFY)
  - `src/lib/db/extension-db-queries.ts` (MODIFY)
  - `extension/features/memo-overlay/hooks/use-overlay-shortcut-interceptor.ts` (MODIFY)
  - `extension/features/storage-sync/footics-app-bridge.ts` (MODIFY)
  - `.agents/guardrails-baseline.json` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [ ] 1. 残存する `window.dispatchEvent(new CustomEvent(...))`（5ファイル・8箇所）を、React ツリー内はコールバック/Context、Extension 境界は型付き `window.postMessage` プロトコルへ置き換え、`.agents/guardrails-baseline.json` の `customEvent` を 0 件にする。
- [ ] 2. 本番コードに残存する `console.log`（15ファイル）を除去または構造化ロガーへ置換し、`consoleLog` ベースラインを 0 件にする。
- [ ] 3. 残存する `eslint-disable` コメント（7ファイル・30箇所）および空の `catch {}`（3箇所）をすべて解消し、`eslintDisable` ベースラインを 0 件にする。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { z } from 'zod';
```

### 3.2 Key Interfaces & Types
```ts
export const footicsBridgeMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('FOOTICS_ACTION'),
    action: z.string(),
    payload: z.unknown().optional(),
  }),
  z.object({
    type: z.literal('FOOTICS_TRIGGER_CAPTURE'),
  }),
]);
export type FooticsBridgeMessage = z.infer<typeof footicsBridgeMessageSchema>;
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```ts
// ❌ 修正前
window.dispatchEvent(new CustomEvent('footics-action', { detail: { action } }));
// ✅ 修正後
window.postMessage({ type: 'FOOTICS_ACTION', action }, window.location.origin);
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: CustomEvent 残存 5 ファイルの Context / postMessage 移行
- **Worker Model**: `flash`
- **対象ファイル**: `src/hooks/use-shortcut.ts`, `src/features/match/hooks/use-match-memo.ts`, `src/lib/db/extension-db-queries.ts`, `extension/features/memo-overlay/hooks/use-overlay-shortcut-interceptor.ts`, `extension/features/storage-sync/footics-app-bridge.ts`
- **契約 (Interface)**:
  ```ts
  // CustomEvent を廃止し、型定義された postMessage またはコールバックへ統一
  ```
- **Testing Strategy**: 該当フック・ブリッジの単体テストで `postMessage` またはコールバック呼び出しを検証。
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:

### Phase 2: 本番コードの console.log・eslint-disable・空 catch の一掃とベースライン更新
- **Worker Model**: `flash_lite`
- **対象ファイル**: `src/lib/data-management.ts`, `extension/entrypoints/background.ts`, `src/features/tactical-unified/hooks/animation-node-updater.ts`, `.agents/guardrails-baseline.json`
- **契約 (Interface)**:
  ```ts
  // consoleLog: [], eslintDisable: [], customEvent: [] in guardrails-baseline.json
  ```
- **Testing Strategy**: `bun .agents/scripts/lib/code-guardrails.ts --write-baseline` 実行後、`customEvent`, `consoleLog`, `eslintDisable` がすべて空配列になること。
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
