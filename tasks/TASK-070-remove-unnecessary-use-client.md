# TASK-070: [Level 1-B] 純粋 .ts ファイル (45件) からの不要 'use client' 宣言の一掃

## 1. Metadata
- **Status**: `TODO`
- **Created**: 2026-10-26
- **Target Files**:
  - `src/app/test/pitch-aspect/hooks/*.ts` (MODIFY)
  - `src/features/analysis/hooks/use-events.ts` (MODIFY)
  - `src/features/dashboard/hooks/*.ts` (MODIFY)
  - `src/features/management/data-io/hooks/*.ts` (MODIFY)
  - `src/features/match/hooks/*.ts` (MODIFY)
  - `src/features/national-dashboard/hooks/use-national-dashboard.ts` (MODIFY)
  - `src/features/tactical-unified/core/hooks/*.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/*.ts` (MODIFY)
  - `src/features/tactical-unified/objects/**/hooks/*.ts` (MODIFY)
  - `src/features/tactical-unified/panels/**/use-*.ts` (MODIFY)
  - `src/features/teams/hooks/*.ts` (MODIFY)
  - `src/hooks/use-data-sync.ts` (MODIFY)
  - `src/hooks/use-shortcut.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [ ] 1. JSX を含まない純粋な `.ts` ファイル（計45ファイル）の先頭に記述された不要な `'use client'` ディレクティブをすべて削除する（R11 規約準拠）。
- [ ] 2. `src/hooks/use-data-sync.ts` 内の `console.log`（1箇所）を同時に削除する（Wave 1 並列タスクとのファイル競合を防止するため本タスクで実施）。
- [ ] 3. 公開されているカスタムフック名・引数・戻り値のシグネチャを一切変更せず、既存テストがすべて PASS すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
// ファイル先頭の 'use client'; 行のみを削除し、import 群はそのまま維持する
import { useEffect, useState } from 'react';
```

### 3.2 Key Interfaces & Types
```ts
// 型定義・関数シグネチャの変更なし
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// 並列実行時のファイル競合を防ぐため、.agents/guardrails-baseline.json および .tsx ファイル（page.tsx 等）は編集しないこと。
// src/hooks/use-data-sync.ts では 'use client' 削除と同時に console.log も削除すること。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 非戦術ボード領域（dashboard, teams, match, management, analysis, src/hooks）21件の 'use client' 除去
- **Worker Model**: `flash_lite`
- **対象ファイル**: `src/app/test/pitch-aspect/hooks/use-pitch-export.ts`, `src/app/test/pitch-aspect/hooks/use-pitch-interaction.ts`, `src/features/analysis/hooks/use-events.ts`, `src/features/dashboard/hooks/use-custom-event-operations.ts`, `src/features/dashboard/hooks/use-dashboard-filters.ts`, `src/features/dashboard/hooks/use-dashboard.ts`, `src/features/dashboard/hooks/use-match-cache-recovery.ts`, `src/features/dashboard/hooks/use-match-metadata.ts`, `src/features/management/data-io/hooks/use-global-data-backup.ts`, `src/features/management/data-io/hooks/use-match-data-import.ts`, `src/features/management/data-io/hooks/use-memo-data-io.ts`, `src/features/match/hooks/use-match-list.ts`, `src/features/match/hooks/use-match-memo.ts`, `src/features/national-dashboard/hooks/use-national-dashboard.ts`, `src/features/teams/hooks/use-chelsea-squad.ts`, `src/features/teams/hooks/use-player-master.ts`, `src/features/teams/hooks/use-team-squad-client.ts`, `src/features/teams/hooks/use-team-squad.ts`, `src/hooks/use-data-sync.ts`, `src/hooks/use-shortcut.ts`
- **契約 (Interface)**:
  ```ts
  // 先頭の 'use client' を除去し、use-data-sync.ts の console.log を除去
  ```
- **Testing Strategy**: `bun run ai:check` で対象ファイルの検査と関連テストが PASS すること。
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:

### Phase 2: tactical-unified 領域 24件の 'use client' 除去
- **Worker Model**: `flash_lite`
- **対象ファイル**: `src/features/tactical-unified/core/hooks/use-boundary-box-drag.ts`, `src/features/tactical-unified/core/hooks/use-canvas-export.ts`, `src/features/tactical-unified/core/hooks/use-canvas-pointer-drawing.ts`, `src/features/tactical-unified/core/hooks/use-canvas-pointer-interaction.ts`, `src/features/tactical-unified/core/hooks/use-canvas-polygon-zone.ts`, `src/features/tactical-unified/core/hooks/use-canvas-selection-box.ts`, `src/features/tactical-unified/core/hooks/use-canvas-shortcuts.ts`, `src/features/tactical-unified/core/hooks/use-canvas-store.ts`, `src/features/tactical-unified/core/hooks/use-canvas-zone-rotation.ts`, `src/features/tactical-unified/core/hooks/use-canvas-zoom-pan.ts`, `src/features/tactical-unified/core/hooks/use-node-position-transition.ts`, `src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts`, `src/features/tactical-unified/hooks/use-konva-export.ts`, `src/features/tactical-unified/hooks/use-konva-video-export.ts`, `src/features/tactical-unified/hooks/use-tactical-animation.ts`, `src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts`, `src/features/tactical-unified/objects/ball/hooks/use-ball-image.ts`, `src/features/tactical-unified/objects/player/hooks/use-player-photo.ts`, `src/features/tactical-unified/panels/dialogs/use-project-actions.ts`, `src/features/tactical-unified/panels/export/use-export-benchmark.ts`, `src/features/tactical-unified/panels/export/use-export-event-listener.ts`, `src/features/tactical-unified/panels/export/use-export-modal-state.ts`, `src/features/tactical-unified/panels/export/use-export-share.ts`, `src/features/tactical-unified/panels/export/use-video-morphing-config.ts`, `src/features/tactical-unified/panels/toolbar/use-toolbar-drag.ts`
- **契約 (Interface)**:
  ```ts
  // 先頭の 'use client' をすべて除去
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
