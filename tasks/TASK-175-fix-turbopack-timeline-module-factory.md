# TASK-175: Turbopack HMR モジュール解決安定化（use client 付与・循環import排除・直接import化）

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-10
- **Target Files**:
  - `src/features/tactical-unified/hooks/tactical-timeline.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/tactical-playback-controls.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-tactical-animation.ts` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/hooks/__tests__/tactical-animation-canvas.test.ts` (VERIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `tactical-timeline.ts` の先頭に `'use client';` を追加し、Next.js Turbopack のクライアント境界を明示すること。
- [x] 2. `tactical-playback-controls.ts` の `AnimationPlaybackRefs` インポート元を `./tactical-animation-canvas` から `./tactical-timeline` に変更し、循環 import を排除すること。
- [x] 3. `use-tactical-animation.ts` で `tactical-timeline`、`tactical-playback-controls`、`tactical-animation-canvas` から必要な関数・型を直接インポートし、バレルファイル中継依存を排除すること。
- [x] 4. `timeline-bar.tsx` で `getSlideSnapTime` を `tactical-playback-controls` から直接インポートすること。
- [x] 5. 対象ファイルに対する `bun run ai:check` が型検査・Biome・テストを含めすべて exit code 0 でパスすること。

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
- **Invariants (破壊禁止の不変条件と理由)**:
  1. `tactical-animation-canvas.ts` における `export * from './tactical-timeline';` および `export * from './tactical-playback-controls';` は、後方互換性およびパブリック API 保護のために削除せず維持すること。
  2. 公開関数のシグネチャ（引数・戻り値型・振る舞い）は一切変更しないこと。
- **Consumers (呼び出し元・別画面の同期確認リスト)**:
  - `src/features/tactical-unified/views/FullTacticalCanvas.tsx` — `useTacticalAnimation` の戻り値・型に影響がないこと
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx` — `getSlideSnapTime` の直接インポート移行で動作が維持されること

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs

#### `tactical-timeline.ts` (1行目に 'use client'; を追加)
```ts
'use client';

import gsap from 'gsap';
import { useMemo, useRef } from 'react';
// ...
```

#### `tactical-playback-controls.ts` (循環importの解消)
```ts
// 変更前:
import type { AnimationPlaybackRefs } from './tactical-animation-canvas';
// 変更後:
import type { AnimationPlaybackRefs } from './tactical-timeline';
```

#### `use-tactical-animation.ts` (直接インポート化)
```ts
// 変更前:
import {
  calculatePitchDimensions,
  createTacticalTimeline,
  pausePlayback,
  renderFrameToCanvas,
  seekPlayback,
  stopPlayback,
  type UseTacticalAnimationOptions,
  useAnimationPlaybackRefs,
} from './tactical-animation-canvas';

// 変更後:
import {
  calculatePitchDimensions,
  createTacticalTimeline,
  type UseTacticalAnimationOptions,
  useAnimationPlaybackRefs,
} from './tactical-timeline';
import {
  pausePlayback,
  seekPlayback,
  stopPlayback,
} from './tactical-playback-controls';
import { renderFrameToCanvas } from './tactical-animation-canvas';
```

#### `timeline-bar.tsx` (直接インポート化)
```ts
// 変更前:
import { getSlideSnapTime } from '@/features/tactical-unified/hooks/tactical-animation-canvas';
// 変更後:
import { getSlideSnapTime } from '@/features/tactical-unified/hooks/tactical-playback-controls';
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: クライアント境界明示と循環インポート解消・直接インポート化
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/hooks/tactical-timeline.ts`
  - `src/features/tactical-unified/hooks/tactical-playback-controls.ts`
  - `src/features/tactical-unified/hooks/use-tactical-animation.ts`
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx`
  - `src/features/tactical-unified/hooks/__tests__/tactical-animation-canvas.test.ts`
- **契約 (Exact Contract & Formula)**:
  1. `tactical-timeline.ts` の先頭（1行目）に `'use client';` を追加。
  2. `tactical-playback-controls.ts` の 7行目: `import type { AnimationPlaybackRefs } from './tactical-timeline';` に変更。
  3. `use-tactical-animation.ts` の 13〜22行目のインポートを `tactical-timeline`, `tactical-playback-controls`, `tactical-animation-canvas` への直接インポートに分割・再配置。
  4. `timeline-bar.tsx` の 34行目の `getSlideSnapTime` のインポート元を `@/features/tactical-unified/hooks/tactical-playback-controls` に変更。
- **Testing Strategy (Concrete Test Values)**:
  - テストファイル: `src/features/tactical-unified/hooks/__tests__/tactical-animation-canvas.test.ts`
  - 実行コマンド: `bun run ai:check src/features/tactical-unified/hooks/tactical-timeline.ts src/features/tactical-unified/hooks/tactical-playback-controls.ts src/features/tactical-unified/hooks/use-tactical-animation.ts src/features/tactical-unified/panels/timeline/timeline-bar.tsx`
  - 期待結果: 型検査 0 エラー、Biome 0 エラー、テスト 13 pass。
- **Tasks**:
  - [x] 1. TDD実装: 対象4ファイルの import/use client 修正 ➔ `bun run ai:check src/features/tactical-unified/hooks/tactical-timeline.ts src/features/tactical-unified/hooks/tactical-playback-controls.ts src/features/tactical-unified/hooks/use-tactical-animation.ts src/features/tactical-unified/panels/timeline/timeline-bar.tsx` PASS
- **Worker Handoff Log**:
  `tactical-timeline.ts` に `'use client'` 付与。`tactical-playback-controls` の循環参照を `tactical-timeline` へ解消し、`use-tactical-animation` と `timeline-bar` の直接 import 化を完了。`tactical-animation-canvas.ts` の re-export も維持。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-10 03:50
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: 受入要件の全網羅、Turbopack HMR 解決パスの整合性
  - [x] 2. Invariants保護 & Consumer同期: `tactical-animation-canvas.ts` の re-export 維持、呼び出し元破壊ゼロ
  - [x] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: クライアント境界（'use client'）の適正化
  - [x] 4. 設計負債 & サイレント破壊防止: 循環参照の完全排除、バレル依存フラット化、公開シグネチャの完全保護
- **Summary**:
  4大定性監査（6大設計品質原則）をクリア。循環インポートの完全排除、Next.js Turbopack 向けの `'use client'` 境界明示、直接 import 化による HMR 依存グラフ健全化が過不足なく安全に達成されている。後方互換 re-export や公開関数シグネチャも完全に保護されている。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
