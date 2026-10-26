# TASK-068: 300行超ファイルの分割・多段相対import解消・Tactical Store Provider 移行

## 1. Metadata
- **Status**: `TODO`
- **Created**: 2026-10-26
- **Target Files**:
  - `src/lib/tactical/unified-interpolation.ts` (MODIFY)
  - `src/lib/tactical/export/video-export-engine.ts` (MODIFY)
  - `src/features/tactical-unified/**` (MODIFY)
  - `src/stores/tactical-unified-store.ts` (DELETE)
  - `.agents/guardrails-baseline.json` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [ ] 1. 多段相対 import（`../../` 56ファイル・73箇所）をすべて `@/` または `~/` エイリアスに統一し、再エクスポート専用ファイル `src/stores/tactical-unified-store.ts` を廃止して `.agents/guardrails-baseline.json` の `deepRelativeImport` を空にする。
- [ ] 2. 静的データ定義を除く 300行超のファイル（`unified-interpolation.ts`, `video-export-engine.ts`, `pitch-renderer.ts`, `syntax-pitch-canvas.tsx`, `matrix-coordinates.ts`, `BillboardObjectLayer.tsx` 等）を単一責務のモジュール（各300行以下）へ分割し、`maxLinesOver300` ベースラインを空にする。
- [ ] 3. `tactical-unified` の周辺パネル・フック群（43ファイル）における `useTacticalUnifiedStore` 直接参照を Context 経由へ段階移行し、二重同期アダプター `tactical-canvas-store-adapter.ts` を縮小・撤去する。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
// ❌ 禁止: import { ... } from '../../core/store/canvas-store-pitch';
// ✅ 推奨:
import { DEFAULT_BOUNDARY_BOX } from '@/features/tactical-unified/core/store/canvas-store-pitch';
```

### 3.2 Key Interfaces & Types
```ts
// 各分割モジュールは 300 行以内、公開関数には明示的な引数・戻り値型を付与
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```ts
// Context 購読フック経由でのスライス取得
const activeTool = useCanvasStore((s) => s.activeTool);
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 多段相対 import (56ファイル) の @/・~/ エイリアス化と Barrel ファイル撤去
- **Worker Model**: `flash_lite`
- **対象ファイル**: `src/features/**/*.ts`, `src/features/**/*.tsx`, `extension/**/*.ts`, `src/stores/tactical-unified-store.ts`, `.agents/guardrails-baseline.json`
- **契約 (Interface)**:
  ```ts
  // guardrails-baseline.json の deepRelativeImport を空オブジェクトにする
  ```
- **Testing Strategy**: `bun .agents/scripts/lib/code-guardrails.ts --write-baseline` で `deepRelativeImport` が 0 件になること。
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:

### Phase 2: src/lib/tactical および src/components の 300行超ファイルの責務分割
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/unified-interpolation.ts`, `src/lib/tactical/export/video-export-engine.ts`, `src/lib/tactical/export/renderers/pitch-renderer.ts`, `src/lib/tactical/export/share-payload.ts`, `src/lib/tactical/player-formatting.ts`, `src/lib/data-management.ts`
- **契約 (Interface)**:
  ```ts
  // 既存の export シグネチャを維持したまま内部サブモジュールへ分割（全ファイル <= 300行）
  ```
- **Testing Strategy**: `src/lib/tactical/` の既存単体テストがすべて無修正で PASS すること。
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:

### Phase 3: src/features/tactical-unified の 300行超ファイルの責務分割
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/utils/matrix-coordinates.ts`, `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx`, `src/features/tactical-unified/core/components/PlayerLayer.tsx`, `src/features/tactical-unified/panels/export/export-preview-player.tsx`, `src/features/tactical-unified/panels/right-panel/squad-sub-panel.tsx`, `src/features/tactical-unified/core/utils/canvas-coordinates.ts`, `.agents/guardrails-baseline.json`
- **契約 (Interface)**:
  ```ts
  // guardrails-baseline.json の maxLinesOver300 を空にする
  ```
- **Testing Strategy**: `src/features/tactical-unified/` の全単体テストが PASS し、全ファイルが 300行以下になること。
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
