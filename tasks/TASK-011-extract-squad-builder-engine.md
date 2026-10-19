# TASK-011: スカッド合成エンジンの抽出 & use-team-squad スリム化

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-19
- **Target Files**:
  - `src/features/teams/utils/squad-builder.ts` (NEW)
  - `src/features/teams/utils/__tests__/squad-builder.test.ts` (NEW)
  - `src/features/teams/hooks/use-team-squad.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `squad-builder.ts` に `buildUnifiedSquad` および `buildVirtualMatch` を純粋関数として抽出すること。
- [x] 2. プリセット、DB Matches、PlayerMaster（新規/更新/除外）、同名選手の重複排除（仮ID vs 公式ID優先マージ）の振る舞いが100%維持されていること。
- [x] 3. `squad-builder.test.ts` にて、プリセット展開、除外リスト反映、Matches反映、PlayerMaster反映、重複排除、仮想Match生成の全ケースを網羅するテストを作成し PASS すること。
- [x] 4. `use-team-squad.ts` を 100行以内（目標 < 90行、上限 150行クリア）にスリム化し、既存の返り値シグネチャ・インターフェースを完全維持すること。
- [x] 5. `bun run ai:check src/features/teams` および既存テスト全件（11件）が PASS すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import type { PlayerMaster } from '@/lib/db/schema';
import {
  CHELSEA_PRESETS_BY_SEASON,
  DEFAULT_OPPONENT_SQUAD,
  DEFAULT_SEASON,
  type Season,
} from '@/lib/tactical/chelsea-preset';
import { normalizePosition } from '@/lib/tactical/player-formatting';
import { getSeasonFromDate } from '@/lib/tactical/season-utils';
import type { SupportedTeam } from '@/lib/tactical/teams-config';
import type { Match, Player } from '@/types';
```

### 3.2 Key Interfaces & Types
```ts
export interface BuildSquadParams {
  teamConfig: SupportedTeam;
  effectiveTeamName: string;
  season: string;
  matches?: Match[];
  masters?: PlayerMaster[];
  excludedPlayers?: Array<{ playerId: number }>;
}

export interface UnifiedSquadResult {
  teamPlayers: Player[];
  opponentPlayers: Player[];
  dictionary: Record<string, string>;
}
```

### 3.3 Implementation Details
```ts
// src/features/teams/utils/squad-builder.ts
export function matchTeamName(targetTeamName: string, name?: string): boolean {
  if (!name) return false;
  const t = targetTeamName.toLowerCase().trim();
  const n = name.toLowerCase().trim();
  return n.includes(t) || t.includes(n);
}

export function getTacticsMatchId(teamSlug: string): string {
  return `${teamSlug}-tactics-board`;
}
// buildUnifiedSquad は use-team-squad.ts の useMemo 内ロジック（excludedIds, presetSquad, matches, masters, opponentSquad, deduplication）をそのまま純粋関数化
// buildVirtualMatch は use-team-squad.ts の virtualMatch 生成 useMemo 内ロジックをそのまま純粋関数化
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: squad-builder.ts & 網羅的ユニットテスト (TDD)
- **Worker Model**: `inherit`
- **対象ファイル**: `src/features/teams/utils/squad-builder.ts`, `src/features/teams/utils/__tests__/squad-builder.test.ts`
- **契約 (Interface)**:
  - `export function getTacticsMatchId(teamSlug: string): string`
  - `export function matchTeamName(targetTeamName: string, name?: string): boolean`
  - `export function buildUnifiedSquad(params: BuildSquadParams): UnifiedSquadResult`
  - `export function buildVirtualMatch(teamConfig: SupportedTeam, teamPlayers: Player[], opponentPlayers: Player[], dictionary: Record<string, string>): Match`
- **Testing Strategy**: `src/features/teams/utils/__tests__/squad-builder.test.ts`
  - Chelsea プリセット取得テスト
  - 除外選手（excludedIds）テスト
  - Matches からの選手抽出テスト
  - PlayerMaster 反映 & isExcluded テスト
  - 仮ID (-1) と公式ID (123) の重複排除テスト
  - `buildVirtualMatch` の構造検証
- **Tasks**:
  - [x] 1. TDD実装: テスト作成 ➔ `squad-builder.ts` 実装 ➔ `bun run ai:check src/features/teams/utils/` PASS
- **Worker Handoff Log**:
  - `squad-builder.ts`: `matchTeamName`, `getTacticsMatchId`, `buildUnifiedSquad`, `buildVirtualMatch` をexport。単体テスト全11件PASS。

---

### Phase 2: use-team-squad.ts のスリム化 & 結合確認
- **Worker Model**: `inherit`
- **対象ファイル**: `src/features/teams/hooks/use-team-squad.ts`
- **契約 (Interface)**:
  - `export function useTeamSquad({ teamId, teamName, season }: UseTeamSquadOptions = {})`
  - 返り値: `{ teamConfig, teamPlayers, opponentPlayers, virtualMatch, isLoading, refetch }`
- **Testing Strategy**: `src/features/teams/hooks/__tests__/use-team-squad.test.tsx` および既存全テスト
- **Tasks**:
  - [x] 1. `use-team-squad.ts` を `squad-builder.ts` 呼び出しに置換し 100行以内に縮小
  - [x] 2. `bun run ai:check src/features/teams` 全テスト PASS を検証
- **Worker Handoff Log**:
  - `use-team-squad.ts`: 96行にスリム化完了。`getTacticsMatchId` を re-export して後方互換性を維持。関連テストおよび全22件のテストPASS。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `inherit`
- **Reviewed At**: 2026-10-19 11:41
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 要件網羅性: Requirements の仕様が手抜きなくコードに実在するか（テストのハリボテ化がないか）
  - [x] 境界と副作用: Level 2 core にホスト依存の混入がないか、useEffectによるFlickerがないか
  - [x] 設計負債防止: switch/ifの増殖（OCP違反）がなく、1ファイル250行以内（Hook 150行以内）に収まっているか
  - [x] サイレント破壊防止: 指示外ファイルの変更や既存コード・テストの勝手な削除がないか
- **Summary**: `Fix 1` の再審査完了。`squad-builder.ts` において `!p.isFirstEleven` が `!!p.isFirstEleven` へ正しく修正され、共通処理抽出によりファイル行数も 244行（上限 250行以内）に最適化された。また、`squad-builder.test.ts` にてスタメン/ベンチ選手の `isFirstEleven` 保持が厳密に検証され、全テスト（12件）および関連コンポーネント・フック結合テスト（23件）が PASS していることを確認した。

## 6. Rejections / Additional Tasks (不可逆修正欄)

### Fix 1 (2026-10-19)
- **Worker Model**: `inherit`
- **Rejection Reason**:
  1. [サイレント破壊] `squad-builder.ts` L67 および L169 において、元のコード `!!p.isFirstEleven` が `!p.isFirstEleven` に誤変換されており、スタメン・ベンチフラグの真偽値が反転している。
  2. [設計負債] `squad-builder.ts` が 273行となっており、Pure Util の行数上限（250行以内）を超過している。
  3. [テスト検証漏れ] `squad-builder.test.ts` にて `isFirstEleven` の真偽値検証が欠如しており、上記バグを検知できていなかった。
- **Target Files**:
  - `src/features/teams/utils/squad-builder.ts`
  - `src/features/teams/utils/__tests__/squad-builder.test.ts`
- **Required Steps**:
  - [x] 1. `squad-builder.ts` L67 & L169 の `!p.isFirstEleven` を `!!p.isFirstEleven` に修正する。
  - [x] 2. `squad-builder.ts` の共通処理（Player オブジェクトや Formation オブジェクトの初期値生成等）を整理・抽出して 250行以内（推奨 200行前後）にスリム化する。
  - [x] 3. `squad-builder.test.ts` に `isFirstEleven` の保持（スタメン選手は true、ベンチ選手は false）を検証するテストを追加する。
  - [x] 4. `bun run ai:check` および `bun scripts/task/validate-task.ts tasks/TASK-011-extract-squad-builder-engine.md` が PASS することを確認する。
- **Worker Handoff Log**:
  - `squad-builder.ts`: `createBasePlayer` および `createVirtualTeam` を導入し、`registerPlayer` で共通化。`!p.isFirstEleven` を `!!p.isFirstEleven` に修正。コード行数を 244行（< 250行）に圧縮完了。
  - `squad-builder.test.ts`: スタメン (Robert Sánchez: true, Away DC (L): true) とベンチ (Filip Jörgensen: false, Away Sub GK: false) の `isFirstEleven` フラグ保持テストを追加し全12件 PASS。
  - `bun run ai:check` PASS。
