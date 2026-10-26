# TASK-065: [Level 2-A] 残存 CustomEvent (5ファイル) の型付き postMessage / コールバック移行

## 1. Metadata
- **Status**: `TODO`
- **Created**: 2026-10-26
- **Target Files**:
  - `src/hooks/use-shortcut.ts` (MODIFY)
  - `src/features/match/hooks/use-match-memo.ts` (MODIFY)
  - `src/lib/db/extension-db-queries.ts` (MODIFY)
  - `extension/features/memo-overlay/hooks/use-overlay-shortcut-interceptor.ts` (MODIFY)
  - `extension/features/storage-sync/footics-app-bridge.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [ ] 1. `src/hooks/use-shortcut.ts`, `src/features/match/hooks/use-match-memo.ts`, `src/lib/db/extension-db-queries.ts` の `window.dispatchEvent(new CustomEvent(...))` を、型付き `window.postMessage` または明示的なコールバック呼び出しへ置換する。
- [ ] 2. `extension/features/memo-overlay/hooks/use-overlay-shortcut-interceptor.ts` および `extension/features/storage-sync/footics-app-bridge.ts` の `CustomEvent` 送受信を、Zod スキーマ検証付きの `window.postMessage` プロトコルへ統一し、`CustomEvent` の使用を 0 件にする。

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

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// ❌ 禁止: window.dispatchEvent(new CustomEvent('footics-action', { detail: { action } }));
// ✅ 推奨: window.postMessage({ type: 'FOOTICS_ACTION', action }, window.location.origin);
// 並列実行時の競合を防ぐため、上記5ファイルと対応テストファイルのみを編集し、.agents/guardrails-baseline.json は編集しないこと。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: CustomEvent 残存 5 ファイルの postMessage / コールバック移行と単体テスト更新
- **Worker Model**: `flash`
- **対象ファイル**: `src/hooks/use-shortcut.ts`, `src/features/match/hooks/use-match-memo.ts`, `src/lib/db/extension-db-queries.ts`, `extension/features/memo-overlay/hooks/use-overlay-shortcut-interceptor.ts`, `extension/features/storage-sync/footics-app-bridge.ts`
- **契約 (Interface)**:
  ```ts
  // 5ファイルすべてから CustomEvent / dispatchEvent を撤去
  ```
- **Testing Strategy**: 該当フック・ブリッジの単体テストで `window.postMessage` 連携を検証し、`bun run ai:check` が PASS すること。
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
