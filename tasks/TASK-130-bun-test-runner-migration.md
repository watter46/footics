# TASK-130: VitestからBun組み込みテストランナーへの移行と互換レイヤー構築

## 1. Metadata
- **Status**: `TODO`
- **Created**: 2026-11-01
- **Target Files**:
  - `src/test/bun-compat.ts` (NEW)
  - `bunfig.toml` (NEW)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [ ] 1. `src/test/bun-compat.ts` が作成され、Happy-DOMの初期化およびVitest互換オブジェクト（`globalThis.vi = { fn, spyOn, mocked, stubGlobal, unstubAllGlobals, ... }`）が提供されること
- [ ] 2. `bunfig.toml` に `[test]` セクションが定義され、`preload = ["./src/test/bun-compat.ts"]` が設定されること
- [ ] 3. `bun test ./src/lib/tactical/__tests__/image-utils.test.ts` が正常に PASS すること（`vi.stubGlobal` や `vi.unstubAllGlobals` のエラーが解消されること）
- [ ] 4. `bun test ./extension/features/memo-overlay/__tests__/quick-tag-bar.test.tsx` などのDOMテストが PASS すること
- [ ] 5. Biome Lint・TypeScript型チェック・Preflight検証に合格すること

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Vitest Compat Adapter (`src/test/bun-compat.ts`)
```ts
import 'happy-dom/global';
import './setup';
import { mock, spyOn } from 'bun:test';

// Vitest の vi オブジェクト互換レイヤー
if (typeof (globalThis as any).vi === 'undefined') {
  (globalThis as any).vi = {
    fn: mock,
    spyOn: spyOn,
    mocked: (fn: any) => fn,
    stubGlobal: (key: string, value: any) => {
      (globalThis as any)[key] = value;
      if (typeof window !== 'undefined') {
        (window as any)[key] = value;
      }
    },
    unstubAllGlobals: () => {},
    restoreAllMocks: () => {},
    clearAllMocks: () => {},
    resetAllMocks: () => {},
  };
}
```

### 3.2 bunfig.toml
```toml
[test]
preload = ["./src/test/bun-compat.ts"]
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: Bun Test 互換レイヤーと bunfig.toml の構築
- **Worker Model**: `flash`
- **対象ファイル**: `src/test/bun-compat.ts`, `bunfig.toml`
- **Tasks**:
  - [ ] 1. `src/test/bun-compat.ts` を作成（Happy-DOM global + setup + vi互換）
  - [ ] 2. `bunfig.toml` に `[test] preload = ["./src/test/bun-compat.ts"]` を追加
  - [ ] 3. `bun test ./src/lib/tactical/__tests__/image-utils.test.ts` を実行し、PASS することを確認
  - [ ] 4. `bun test ./extension/features/memo-overlay/__tests__/quick-tag-bar.test.tsx` を実行し、DOMテストが動作することを確認
  - [ ] 5. `bun run ai:check src/test/bun-compat.ts` を実行して合格を確認
- **Worker Handoff Log**:
  <!-- 確定した内容を1〜2行で記録 -->

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `flash`
- **Reviewed At**: 
- **Decision**: `TODO`
- **Audit Checklist**:
  - [ ] 1. 要件網羅性 & テスタビリティ: 全受入基準を網羅
  - [ ] 2. ホスト境界 & Store Provider: テスト設定基盤のためアプリコードへの副作用なし
  - [ ] 3. 設計負債 & 拡張性: 既存テストコードを変更せずにBun Testへ移行可能なアダプター設計
  - [ ] 4. サイレント破壊 & 既存保護: 既存のVitest実行と干渉しない独立したpreload構成
- **Summary**:
  <!-- 判定理由または改善指示を簡潔に記載 -->

## 6. Rejections / Additional Tasks (不可逆修正欄)
- None.
