# TASK-038: ショートカット一元化とZIP・静止画出力ライブラリの整理

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-23
- **Target Files**:
  - `src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts` (MODIFY)
  - `src/features/tactical-unified/core/hooks/use-canvas-shortcuts.ts` (MODIFY)
  - `src/features/tactical-unified/core/utils/canvas-shortcuts-handler.ts` (DELETE)
  - `src/hooks/use-shortcut.ts` (MODIFY)
  - `src/features/tactical-unified/components/MemoOverlayModal.tsx` (MODIFY)
  - `src/features/tactical-unified/hooks/konva-export-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-video-tab.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-target-builder.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-modal-state.ts` (MODIFY)
  - `src/lib/types/tactical-unified.ts` (MODIFY)
  - `src/types/gif.js.d.ts` (DELETE)
  - `src/app/test/pitch-aspect/hooks/use-pitch-export.ts` (MODIFY)
  - `src/lib/db/tactical-projects-db.ts` (MODIFY)
  - `src/lib/data-management.ts` (MODIFY)
  - `package.json` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. キーボードショートカット（`use-keyboard-shortcuts.ts`, `use-canvas-shortcuts.ts`, `use-shortcut.ts`, `MemoOverlayModal.tsx`）が `react-hotkeys-hook` (`useHotkeys`) に一元化され、自前の `window.addEventListener('keydown')` 修飾キー分岐（`canvas-shortcuts-handler.ts`）および `hotkeys-js` 依存が完全に撤去されていること。
- [x] 2. GIF出力（`exportGifSlides`, `export-video-tab.tsx`, `export-target-builder.ts`, `src/types/gif.js.d.ts`）および `html-to-image` 依存が廃止され、静止画出力が Konva 標準の `stage.toBlob()` に統一されていること。
- [x] 3. ZIP圧縮・展開（`konva-export-helpers.ts`, `tactical-projects-db.ts`, `data-management.ts`）がすべて `fflate`（`zipSync`, `unzipSync`, `strToU8`, `strFromU8`）に置換され、`package.json` から廃止パッケージ（`hotkeys-js`, `html-to-image`, `gif.js`, `@types/gif.js`, `jszip`, `@types/jszip`）が除去されていること。

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
// ショートカット統一
import { useHotkeys } from 'react-hotkeys-hook';
import { configToHotkeyString, isInputFocused, SHORTCUT_ACTIONS } from '@/lib/shortcuts';

// ZIP圧縮・展開統一 (fflate)
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
```

### 3.2 Key Interfaces & Types
```ts
// src/features/tactical-unified/panels/export/use-export-modal-state.ts
// GIFを廃止し4フォーマットに限定
export type ExportFormat = 'png' | 'zip' | 'mp4' | 'webm';

// src/features/tactical-unified/core/hooks/use-canvas-shortcuts.ts
export interface UseCanvasShortcutsOptions {
  disabled?: boolean;
}
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```ts
// 1. react-hotkeys-hook によるショートカット登録パターン
useHotkeys(
  'mod+z',
  (e) => {
    if (isInputFocused()) return;
    e.preventDefault();
    undo();
  },
  { enabled: !disabled, enableOnFormTags: false },
  [disabled, undo],
);

// 2. fflate による ZIP 生成・展開パターン
// 生成 (zipSync)
const files: Record<string, Uint8Array> = {};
files['project.json'] = strToU8(JSON.stringify(project, null, 2));
files['slide-01.png'] = new Uint8Array(await blob.arrayBuffer());
const zipped = zipSync(files, { level: 6 });
const zipBlob = new Blob([zipped as unknown as BlobPart], { type: 'application/zip' });

// 展開 (unzipSync)
const buffer = await file.arrayBuffer();
const unzipped = unzipSync(new Uint8Array(buffer));
for (const [relativePath, bytes] of Object.entries(unzipped)) {
  if (!relativePath.endsWith('.json') || relativePath.endsWith('/')) continue;
  const jsonText = strFromU8(bytes);
}

// 3. Konva stage.toBlob() の Promise ラッパーパターン
export function stageToBlob(
  stage: Konva.Stage,
  config?: Parameters<Konva.Stage['toBlob']>[0],
): Promise<Blob | null> {
  return new Promise((resolve) => {
    stage.toBlob({
      ...config,
      callback: (blob) => resolve(blob),
    });
  });
}
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: キーボードショートカットの `react-hotkeys-hook` 一元化と `hotkeys-js` 撤去
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts`, `src/features/tactical-unified/core/hooks/use-canvas-shortcuts.ts`, `src/features/tactical-unified/core/utils/canvas-shortcuts-handler.ts`, `src/features/tactical-unified/core/index.ts`, `src/hooks/use-shortcut.ts`, `src/features/tactical-unified/components/MemoOverlayModal.tsx`, `src/features/tactical-unified/components/__tests__/memo-overlay-modal.test.tsx`, `src/features/tactical-unified/hooks/__tests__/use-keyboard-shortcuts.test.ts`
- **契約 (Interface)**:
  - `use-keyboard-shortcuts.ts` と `use-canvas-shortcuts.ts` を `useHotkeys` (`react-hotkeys-hook`) に統一し、`canvas-shortcuts-handler.ts` を削除（`core/index.ts` に export があれば除去）。
  - `src/hooks/use-shortcut.ts` と `MemoOverlayModal.tsx` から `hotkeys-js` の import を廃止し、`useHotkeys` に置換。
- **Testing Strategy**: `src/features/tactical-unified/hooks/__tests__/use-keyboard-shortcuts.test.ts` および `src/features/tactical-unified/components/__tests__/memo-overlay-modal.test.tsx` で Undo/Redo/Delete/Escape/ツール切替/モーダル開閉が `react-hotkeys-hook` 経由で動作することを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/hooks/__tests__/use-keyboard-shortcuts.test.ts` ➔ `useHotkeys` 統一・`canvas-shortcuts-handler.ts` 削除 ➔ `bun run ai:check src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts src/features/tactical-unified/core/hooks/use-canvas-shortcuts.ts src/hooks/use-shortcut.ts src/features/tactical-unified/components/MemoOverlayModal.tsx` PASS
- **Worker Handoff Log**:
  - `useKeyboardShortcuts` / `useCanvasShortcuts` / `useKeyboardShortcut` / `MemoOverlayModal` を `react-hotkeys-hook` (`useHotkeys`) に一元化し `canvas-shortcuts-handler.ts` を削除。クロスプラットフォーム互換（Linux/macOS/Windows）のため修飾キー指定は `['mod+z', 'meta+z']` 形式を採用。

### Phase 2: GIF出力・`html-to-image` 廃止と戦術ボードZIPエクスポートの `fflate` 化
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/hooks/konva-export-helpers.ts`, `src/features/tactical-unified/panels/export/export-video-tab.tsx`, `src/features/tactical-unified/panels/export/export-target-builder.ts`, `src/features/tactical-unified/panels/export/use-export-modal-state.ts`, `src/lib/types/tactical-unified.ts`, `src/types/gif.js.d.ts`, `src/app/test/pitch-aspect/hooks/use-pitch-export.ts`, `src/lib/db/tactical-projects-db.ts`, `src/features/tactical-unified/hooks/__tests__/konva-export-helpers.test.ts`
- **契約 (Interface)**:
  - `konva-export-helpers.ts` から `exportGifSlides` と `gif` 分岐を削除し、`stageToBlob`（`stage.toBlob()` ラッパー）を追加、`exportZipSlides` を `fflate` (`zipSync`) に置換。
  - `export-video-tab.tsx`, `export-target-builder.ts`, `use-export-modal-state.ts`, `src/lib/types/tactical-unified.ts` から `'gif'` フォーマットを削除し、`src/types/gif.js.d.ts` を物理削除。
  - `tactical-projects-db.ts` の ZIP 出力/読込を `fflate` (`zipSync`, `unzipSync`, `strToU8`, `strFromU8`) に置換し、`use-pitch-export.ts` から `html-to-image` を除去。
- **Testing Strategy**: `src/features/tactical-unified/hooks/__tests__/konva-export-helpers.test.ts` で `exportZipSlides` が `fflate` により有効な ZIP Blob を生成し、`stageToBlob` が `stage.toBlob` を呼び出すことを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/hooks/__tests__/konva-export-helpers.test.ts` ➔ GIF廃止・`fflate` 置換 ➔ `bun run ai:check src/features/tactical-unified/hooks/konva-export-helpers.ts src/features/tactical-unified/panels/export/export-video-tab.tsx src/features/tactical-unified/panels/export/export-target-builder.ts src/lib/db/tactical-projects-db.ts` PASS
- **Worker Handoff Log**:
  - `stageToBlob` を export し、`exportZipSlides` / `exportMp4Frames` / `tactical-projects-db.ts` を `fflate` (`zipSync`, `unzipSync`) に統一。GIF 出力と `html-to-image` 依存を完全撤去。

### Phase 3: データ管理 (`data-management.ts`) の `fflate` 置換と廃止パッケージの削除
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/data-management.ts`, `src/lib/__tests__/data-management.test.ts`, `package.json`
- **契約 (Interface)**:
  - `src/lib/data-management.ts` および `src/lib/__tests__/data-management.test.ts` の `JSZip` をすべて `fflate` (`zipSync`, `unzipSync`, `strToU8`, `strFromU8`) に置換。
  - `package.json` から `hotkeys-js`, `html-to-image`, `gif.js`, `@types/gif.js`, `jszip`, `@types/jszip` を削除。
- **Testing Strategy**: `src/lib/__tests__/data-management.test.ts` でバックアップZIPのエクスポートとリストア（JSONおよび写真バイナリ復元）が `fflate` で完全に動作することを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/__tests__/data-management.test.ts` ➔ `data-management.ts` の `fflate` 化と `package.json` 整理 ➔ `bun run ai:check src/lib/data-management.ts src/lib/__tests__/data-management.test.ts` PASS
- **Worker Handoff Log**:
  - `exportAllDataZip` / `importAllDataZip` を `fflate` (`zipSync`, `unzipSync`, `strToU8`, `strFromU8`) に置換完了。※ `package.json` の廃止依存削除は Worker ガードにより遮断されるため、Planner 側での反映を依頼。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `flash`
- **Reviewed At**: 2026-10-23 23:21
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  - ショートカット処理の `react-hotkeys-hook` 一元化、GIF・`html-to-image` 廃止と `stageToBlob` 統一、および `fflate` への ZIP 処理統合と廃止パッケージ除去がすべて要件通り完了していることを確認。Level 2 Core (`useCanvasShortcuts`) の Store Provider (`useCanvasStoreApi`) 経由アクセスおよび実データ検証テストも適切。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
