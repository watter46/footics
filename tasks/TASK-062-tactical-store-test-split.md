# TASK-062: tactical-store-test-split

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-26
- **Target Files**:
  - `src/features/tactical-unified/stores/__tests__/tactical-unified-store-project-slide.test.ts` (NEW)
  - `src/features/tactical-unified/stores/__tests__/tactical-unified-store-players.test.ts` (NEW)
  - `src/features/tactical-unified/stores/__tests__/tactical-unified-store-aspect-boundary.test.ts` (NEW)
  - `src/features/tactical-unified/stores/__tests__/tactical-unified-store-objects-lock.test.ts` (NEW)
  - `src/features/tactical-unified/stores/__tests__/tactical-unified-store.test.ts` (DELETE)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. 旧 `tactical-unified-store.test.ts` に含まれる全69件のテストケースが、4つのカテゴリ別ファイルに1件の漏れもなく移行されていること。
- [x] 2. 分割後の各テストファイルが 300〜600 行程度に収まり、テストの目的が明確であること。
- [x] 3. 新規4テストファイルがすべて PASS し、既存の全振る舞いが保護されていること。
- [x] 4. 旧巨大テストファイルが削除または整理され、二重実行・重複が排除されていること。
- [x] 5. `bun run ai:check` でテスト・型・Lint がすべて合格すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '../tactical-unified-store';
import { createDefaultPlayer, createDefaultProject } from '@/lib/tactical/types';
import type { TacticalProject, AspectRatio, BoundaryBox } from '@/lib/tactical/types';
```

### 3.2 Key Interfaces & Types
```ts
// 各テスト実行前の共通クリーンアップ
beforeEach(() => {
  useTacticalUnifiedStore.getState().resetProject('test-project');
  useTacticalUnifiedStore.setState({
    selectedObjects: [],
    clipboard: null,
  });
});
```

### 3.3 Implementation Notes & Gotchas
```ts
// 1. 各テストファイルに独立した beforeEach クリーンアップを配置し、テスト間の状態リークを防止する。
// 2. テストの期待値、アサーション、テスト名、引数は旧ファイルと100%同一にし、サイレント変更を行わない。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 4つの役割別テストファイルの作成
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/stores/__tests__/tactical-unified-store-project-slide.test.ts`
  - `src/features/tactical-unified/stores/__tests__/tactical-unified-store-players.test.ts`
  - `src/features/tactical-unified/stores/__tests__/tactical-unified-store-aspect-boundary.test.ts`
  - `src/features/tactical-unified/stores/__tests__/tactical-unified-store-objects-lock.test.ts`
- **契約 (Interface)**:
  ```ts
  // 4ファイルで旧全69テストケースを完全網羅
  ```
- **Testing Strategy**: `rtk vitest run src/features/tactical-unified/stores/__tests__/tactical-unified-store-*.test.ts`
- **Tasks**:
  - [x] 1. Project & Slide 操作テスト（スライド作成・削除・背景画像・保存状態・リセット等）を作成
  - [x] 2. Players & Squad 操作テスト（選手追加・移動・矢印連動・ベンチ・フォーメーション・フォーカス等）を作成
  - [x] 3. Aspect Ratio & Boundary 操作テスト（比率座標変換・収束防止・境界線フィット・ピッチ移動ズーム等）を作成
  - [x] 4. Objects & Lock 操作テスト（選択・消去・反転・クリップボード・汎用ロック等）を作成
  - [x] 5. 各テストファイルが PASS することを確認
- **Worker Handoff Log**:
  - 全69件のテストケースを4つのカテゴリ別ファイルへ移行完了、全件PASSを確認。

---

### Phase 2: 旧テストファイルの整理と一括回帰検証
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/stores/__tests__/tactical-unified-store.test.ts` (DELETE)
- **契約 (Interface)**:
  ```ts
  // 旧ファイルの安全な削除と全体の整合性確認
  ```
- **Testing Strategy**: `bun run ai:check src/features/tactical-unified/stores/__tests__/`
- **Tasks**:
  - [x] 1. 全69テストが新ファイル群に存在することを確認
  - [x] 2. 旧 `tactical-unified-store.test.ts` を削除
  - [x] 3. `bun run ai:check src/features/tactical-unified/stores/__tests__/` PASS
- **Worker Handoff Log**:
  - 旧ファイルを安全に削除し、`bun run ai:check` による全検証に合格。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-26
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 全69テストの完全移行（漏れゼロ）、全PASS
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: テスト間の独立性（beforeEachでの完全リセット）
  - [x] 3. 設計負債 & 拡張性: カテゴリ別ファイル分割、保守性向上
  - [x] 4. サイレント破壊 & 既存保護: テスト内容・アサーションの無改変維持
- **Summary**:
  旧 `tactical-unified-store.test.ts` の全69テストを役割別の4ファイルに漏れなく分割・移行し、旧ファイルを削除完了。全テストが正常にパスし、回帰なしを確認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
