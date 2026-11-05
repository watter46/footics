# TASK-156: Fix Half/Full formation mode and apply full formation

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-05
- **Target Files**:
  - `src/lib/data/formations.ts` (MODIFY)
  - `src/lib/data/__tests__/formations.test.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-formation-helpers.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `getFormationActualPos` で `mode?: FormationMode` ('full' | 'half') を受け取り、'full' の時はピッチ全体（自陣〜敵陣ゴールライン間）、'half' の時は自陣ハーフコート内に展開されること。デフォルト引数は `'full'` とすること。
- [x] 2. `slide-formation-helpers.ts` の `buildTeamFormationPlayers` において、`mode` および `aspectRatio` が `getFormationActualPos` に正確に伝達され、フォーメーション適用時に 'half' / 'full' が正しく反映されること。
- [x] 3. ユニットテスト `src/lib/data/__tests__/formations.test.ts` で 'full' と 'half' の座標展開（STの到達位置の比較など）が検証されていること。
- [x] 4. 既存テスト (`bun run ai:check`) がすべてパスすること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import type { FormationMode, FormationType } from '@/lib/data/formations';
import { getFormationActualPos } from '@/lib/data/formations';
import { getScreenPitchBounds } from '@/lib/tactical/pitch-geometry';
import type { AspectRatio } from '@/lib/types/tactical/primitives';
```

### 3.2 Key Interfaces & Formulas
```ts
// src/lib/data/formations.ts
export type FormationMode = 'full' | 'half';

// full: ピッチ全体 (0..1)
// half: 自陣ハーフコート (0..0.5)
const depthFactor = mode === 'half' ? 0.5 : 1.0;
const depthRatio = ((100 - clampedTop) / 100) * depthFactor;
const attackRatio = isAway ? 1 - depthRatio : depthRatio;
const widthRatio = isAway ? (100 - clampedLeft) / 100 : clampedLeft / 100;
```

### 3.3 Reference Call in Helpers
```ts
// src/features/tactical-unified/stores/slide-formation-helpers.ts
const rawPos = getFormationActualPos(pos, team, mode, aspectRatio);
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: getFormationActualPos の full / half 対応実装とテスト
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/data/formations.ts`
  - `src/lib/data/__tests__/formations.test.ts`
  - `src/features/tactical-unified/stores/slide-formation-helpers.ts`
- **Testing Strategy**: `src/lib/data/__tests__/formations.test.ts` で 4-3-3 の ST について `mode: 'full'` では `x > bounds.xMid`（敵陣内）、`mode: 'half'` では `x < bounds.xMid`（自陣内）となることを検証。
- **Tasks**:
  - [x] 1. `formations.ts`: `getFormationActualPos` で `mode` を反映（既定値 `'full'`）。`arg3` / `arg4` のオーバーロード引数を正しくパース。
  - [x] 2. `slide-formation-helpers.ts`: `getFormationActualPos(pos, team, mode, aspectRatio)` に `aspectRatio` を渡す。
  - [x] 3. `formations.test.ts`: full / half の挙動テストを実装・更新。
  - [x] 4. `bun run ai:check` PASS を確認。
- **Worker Handoff Log**:
  - `getFormationActualPos` は `arg3` ('full' | 'half', 既定: 'full') を評価し、`depthFactor` (half: 0.5, full: 1.0) でピッチ展開。`aspectRatio` を渡した場合は直接ピッチbounds座標が返るため `slide-formation-helpers` では二重変換を回避。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `flash`
- **Reviewed At**: 2026-11-05 14:36
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**: getFormationActualPos の full/half モード実装と slide-formation-helpers での引数伝達・二重変換解消、横画面・縦画面双方でのハーフコート境界値テストを含め、4大定性監査をすべてクリア。

## 6. Rejections / Additional Tasks (不可逆修正欄)
