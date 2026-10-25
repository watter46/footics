# TASK-060: 未使用import文の削除と整理

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-26
- **Target Files**:
  - `src/features/tactical-unified/__tests__/pitch-bench-transition.test.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/BoundaryBoxHud.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/BoundaryBoxTiltControls.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/hud/hud-icons.tsx` (MODIFY)
  - `src/features/tactical-unified/hooks/__tests__/konva-export-helpers.test.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/__tests__/tactical-animation-canvas.test.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-konva-video-export.ts` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/__tests__/squad-panel-step5.test.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/squad-sub-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/stores/slide-aspect-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-transition-slice.ts` (MODIFY)
  - `src/lib/tactical/export/share-payload.ts` (MODIFY)
  - `src/lib/tactical/match-to-tactical-bridge.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. 検出された13ファイル（15箇所）の未使用 import 文を削除し、コードをクリーンアップする。
- [x] 2. 削除後に `bunx biome check --diagnostic-level=warn --reporter=concise src/` を実行し、`noUnusedImports` の警告が 0 件になること。
- [x] 3. 既存のテストおよび型検査（`tsc`）が 100% PASS すること（機能的・構造的デグレゼロ）。

## 3. Context Snippets (対象ファイルと未使用 import 行)

```
! src/features/tactical-unified/__tests__/pitch-bench-transition.test.ts:1:8: lint/correctness/noUnusedImports: This import is unused.
! src/features/tactical-unified/core/components/BoundaryBoxHud.tsx:4:8: lint/correctness/noUnusedImports: These imports are unused.
! src/features/tactical-unified/core/components/BoundaryBoxTiltControls.tsx:4:8: lint/correctness/noUnusedImports: This import is unused.
! src/features/tactical-unified/core/components/hud/hud-icons.tsx:1:13: lint/correctness/noUnusedImports: This import is unused.
! src/features/tactical-unified/hooks/__tests__/konva-export-helpers.test.ts:1:10: lint/correctness/noUnusedImports: Several of these imports are unused.
! src/features/tactical-unified/hooks/__tests__/konva-export-helpers.test.ts:3:10: lint/correctness/noUnusedImports: Several of these imports are unused.
! src/features/tactical-unified/hooks/__tests__/tactical-animation-canvas.test.ts:2:10: lint/correctness/noUnusedImports: Several of these imports are unused.
! src/features/tactical-unified/hooks/use-konva-video-export.ts:13:8: lint/correctness/noUnusedImports: This import is unused.
! src/features/tactical-unified/hooks/use-konva-video-export.ts:14:8: lint/correctness/noUnusedImports: This import is unused.
! src/features/tactical-unified/panels/right-panel/__tests__/squad-panel-step5.test.tsx:2:13: lint/correctness/noUnusedImports: This import is unused.
! src/features/tactical-unified/panels/right-panel/squad-sub-panel.tsx:8:13: lint/correctness/noUnusedImports: This import is unused.
! src/features/tactical-unified/stores/slide-aspect-helpers.ts:4:3: lint/correctness/noUnusedImports: Several of these imports are unused.
! src/features/tactical-unified/stores/slide-transition-slice.ts:4:23: lint/correctness/noUnusedImports: Several of these imports are unused.
! src/lib/tactical/export/share-payload.ts:3:3: lint/correctness/noUnusedImports: Several of these imports are unused.
! src/lib/tactical/match-to-tactical-bridge.ts:14:22: lint/correctness/noUnusedImports: Several of these imports are unused.
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 未使用 import の削除
- **Worker Model**: `flash`
- **対象ファイル**: Target Files に記載の13ファイル
- **Tasks**:
  - [x] 1. 対象ファイルの未使用 import 指定を削除し、必要に応じて import 文を整理する。
  - [x] 2. `bunx biome check --diagnostic-level=warn --reporter=concise src/` で `noUnusedImports` が 0 件になることを確認。
  - [x] 3. `bun run ai:check` を実行し、全チェックが PASS することを確認。
- **Worker Handoff Log**:
  - 対象13ファイルから未使用 import（15箇所）を完全除去し、`noUnusedImports` 警告 0 件および `ai:check`（Biome/tsc/vitest）全パスを確認。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `flash`
- **Reviewed At**: 2026-10-26 04:15
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 不要 import の完全削除
  - [x] 2. ホスト境界 & Store Provider: 非該当（ロジック不変）
  - [x] 3. 設計負債 & 拡張性: コードの純化
  - [x] 4. サイレント破壊 & 既存保護: 誤って利用中シンボルを削除していないか
- **Summary**: 検出された13ファイル15箇所の未使用 import のみが正確に削除されており、既存ロジック・型・テストへの副作用やホスト境界破壊は一切認められません。

## 6. Rejections / Additional Tasks (不可逆修正欄)
