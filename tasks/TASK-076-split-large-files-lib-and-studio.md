# TASK-076: [Level 5-B] src/lib・syntax-studio の 300行超ファイル (10件) の単一責務分割

## 1. Metadata
- **Status**: `TODO`
- **Created**: 2026-10-26
- **Target Files**:
  - `src/lib/tactical/unified-interpolation.ts` (MODIFY)
  - `src/lib/tactical/export/video-export-engine.ts` (MODIFY)
  - `src/lib/tactical/export/renderers/pitch-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/share-payload.ts` (MODIFY)
  - `src/lib/tactical/export/auto-benchmark-engine.ts` (MODIFY)
  - `src/lib/tactical/player-formatting.ts` (MODIFY)
  - `src/lib/data-management.ts` (MODIFY)
  - `src/lib/db/tactical-projects-db.ts` (MODIFY)
  - `src/components/features/syntax-studio/syntax-json-drawer.tsx` (MODIFY)
  - `src/components/features/syntax-studio/syntax-pitch-canvas.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [ ] 1. `src/lib/tactical/unified-interpolation.ts`（1065行）および `video-export-engine.ts`（873行）を、計算フェーズ・エンコード制御・フレーム描画ごとの単一責務モジュール（各300行以下）へ分割する。
- [ ] 2. `pitch-renderer.ts`（490行）, `share-payload.ts`（379行）, `auto-benchmark-engine.ts`（304行）, `player-formatting.ts`（368行）, `data-management.ts`（362行）, `tactical-projects-db.ts`（401行）を各300行以下のサブモジュールへ分割する。
- [ ] 3. `syntax-json-drawer.tsx`（336行）および `syntax-pitch-canvas.tsx`（490行）からカスタムフック・サブパーツを抽出し、300行以下にする。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
// 既存の公開モジュールパスからの named export シグネチャを維持する（export * は禁止）
```

### 3.2 Key Interfaces & Types
```ts
// 既存の型定義・関数シグネチャを維持し、呼び出し側への破壊的変更をゼロにする
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// 並列実行する TASK-068（src/features/tactical-unified/ 専任）と競合しないよう、src/features/tactical-unified/ 配下は編集しないこと。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: unified-interpolation.ts (1065行) と player-formatting.ts (368行) の責務分割
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/unified-interpolation.ts`, `src/lib/tactical/player-formatting.ts`
- **契約 (Interface)**:
  ```ts
  // 補間ロジックを player / ball / annotation / camera 等のサブモジュール（各 <= 300行）へ分割
  ```
- **Testing Strategy**: `src/lib/tactical/` の既存単体テストがすべて無修正で PASS すること。
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:

### Phase 2: video-export-engine.ts (873行)・pitch-renderer.ts・share-payload.ts・auto-benchmark-engine.ts の分割
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/export/video-export-engine.ts`, `src/lib/tactical/export/renderers/pitch-renderer.ts`, `src/lib/tactical/export/share-payload.ts`, `src/lib/tactical/export/auto-benchmark-engine.ts`
- **契約 (Interface)**:
  ```ts
  // エクスポート関連の全ファイルを 300行以下に分割
  ```
- **Testing Strategy**: `src/lib/tactical/export/` の既存単体テストがすべて PASS すること。
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:

### Phase 3: data-management.ts・tactical-projects-db.ts・syntax-studio 2件の分割
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/data-management.ts`, `src/lib/db/tactical-projects-db.ts`, `src/components/features/syntax-studio/syntax-json-drawer.tsx`, `src/components/features/syntax-studio/syntax-pitch-canvas.tsx`
- **契約 (Interface)**:
  ```ts
  // 4ファイルすべてを 300行以下に分割
  ```
- **Testing Strategy**: `bun run ai:check` で対象ファイルの検査と関連テストが PASS すること。
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
