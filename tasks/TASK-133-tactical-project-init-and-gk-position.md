# TASK-133: tactical-project-init-and-gk-position

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-01
- **Target Files**:
  - `src/lib/tactical/tactical-storage.ts` (MODIFY)
  - `src/lib/tactical/__tests__/tactical-storage.test.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-tactical-match-init.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/__tests__/use-tactical-match-init.test.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-tactical-auto-save.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/__tests__/use-tactical-auto-save-match.test.ts` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar-more-menu.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/__tests__/top-bar-more-menu.test.tsx` (MODIFY)
  - `src/lib/tactical/squad-to-tactical-bridge.ts` (MODIFY)
  - `src/lib/tactical/__tests__/squad-to-tactical-bridge.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. **永続化キーの厳密分離 (`tactical-storage.ts`)**: `saveActiveProjectToDb(project, matchId)` で `const effectiveMatchId = matchId ?? project.matchId;` を使用し、`project.matchId` を持つプロジェクトが単独用キー `'tactical_active_project'` を決して上書きしないこと。また `loadActiveProjectFromDb(matchId)` で `!matchId`（単独 `/tactical` 用ロード）のとき、取得したデータに `val.matchId` が存在する場合は汚染データとみなして `null` を返すこと。
- [x] 2. **試合詳細からの戦術ボード初期化（選択肢2-A, `use-tactical-match-init.ts`）**: `resolveMatchInitialState(matchId, minute)` において、`loadActiveProjectFromDb(String(match.id))` による過去の自動保存データ（`0'` 等）の強制優先返却を廃止し、常に指定された `(match, minute)` から初期フォーメーション状態（`buildMatchPlayersForMinute(match, minute)`）を生成して返すこと。また `injectMatchToTactical` 実行時に `project.matchId` にも `String(match.id)` が設定されること。
- [x] 3. **単独 `/tactical` 起動時の試合状態クリア (`use-tactical-auto-save.ts`)**: 初回マウント時の復元処理（`loadActiveProjectFromDb(matchId)`）で `savedProject` が存在しない場合、既存の `if (matchId && storeApi.getState().project.matchId !== matchId)` に加えて `else if (!matchId && storeApi.getState().project.matchId)` の場合も `resetProject()` を呼び、シングルトンストア等に残存した試合プロジェクト（`Chelsea vs Tottenham (0')` 等）を確実に初期化すること。
- [x] 4. **メニュー「New Project」のリセット分岐（選択肢1-B, `top-bar-more-menu.tsx`）**: `handleNewProject` で `currentProject.matchId` ではなく URL の `searchParams.get('matchId')` を基準に分岐すること。URL に `matchId` がない単独 `/tactical` では `resetProject()` と `clearActiveProjectFromDb(null)` のみを実行してまっさらな初期プロジェクトにし、URL に `matchId` がある試合別ボード上でのみ `resetProject()`・`clearActiveProjectFromDb(urlMatchId)`・`injectMatchToTactical({ match, minute: 0, storeApi })`（`storeApi` 必須渡し）で当該試合の0分時点の初期フォーメーション状態に作り直すこと。
- [x] 5. **初期配置時のGK定位置補正 (`squad-to-tactical-bridge.ts`)**: `convertSquadToTacticalPlayers` において、`mode === 'full' && templatePos.position === 'GK'` の座標算出をフォーメーションリセット時（`resetSlideKeepSquadData` / `buildTeamFormationPlayers`）と完全一致させ、横ピッチ（`'16:9'`）で Home `{ x: 7, y: 50 }` / Away `{ x: 93, y: 50 }`、縦ピッチ（`'9:16'`, `'4:5'`）で `transformCoord(gkBasePos, '16:9', aspectRatio)`（Home `{ x: 50, y: 93 }` / Away `{ x: 50, y: 7 }`）に配置すること。

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
// src/lib/tactical/squad-to-tactical-bridge.ts
import { isVerticalPitch, transformCoord } from '@/lib/tactical/coordinate-transforms';

// src/features/tactical-unified/panels/toolbar/top-bar-more-menu.tsx
import { useSearchParams } from 'next/navigation';
import { clearActiveProjectFromDb } from '@/lib/tactical/tactical-storage';
import { injectMatchToTactical } from '../../hooks/use-tactical-match-init';
import { useTacticalUnifiedStoreApi } from '../../stores/tactical-unified-store-provider';
```

### 3.2 Key Interfaces & Types
```ts
// src/lib/tactical/tactical-storage.ts
export function getTacticalProjectStorageKey(matchId?: string | null): string;
export async function saveActiveProjectToDb(project: TacticalProject, matchId?: string | null): Promise<void>;
export async function loadActiveProjectFromDb(matchId?: string | null): Promise<TacticalProject | null>;
export async function clearActiveProjectFromDb(matchId?: string | null): Promise<void>;

// src/features/tactical-unified/hooks/use-tactical-match-init.ts
export async function resolveMatchInitialState(
  matchId: string | null,
  minute: number,
): Promise<TacticalUnifiedStoreInitialState | null>;
export function injectMatchToTactical({ match, minute, storeApi }: TacticalMatchInitOptions): void;
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// 1. tactical-storage.ts:
//    - saveActiveProjectToDb: const effectiveMatchId = matchId ?? project.matchId; const key = getTacticalProjectStorageKey(effectiveMatchId);
//    - loadActiveProjectFromDb: if (!matchId && val.matchId) return null; (単独キーに混入した試合プロジェクトを拒否)
// 2. use-tactical-match-init.ts:
//    - resolveMatchInitialState: loadActiveProjectFromDb(String(match.id)) の呼び出し・早期リターンを削除し、常に buildMatchPlayersForMinute(match, minute) で新規構築する。
//    - injectMatchToTactical: loadProject に渡すオブジェクトに matchId: String(match.id) を含めること。
// 3. top-bar-more-menu.tsx:
//    - const searchParams = useSearchParams(); const urlMatchId = searchParams?.get('matchId') ?? null;
//    - urlMatchId が truthy のときのみ clearActiveProjectFromDb(urlMatchId) と injectMatchToTactical({ match, minute: 0, storeApi }) を呼ぶ。
//    - urlMatchId が falsy のときは resetProject() と await clearActiveProjectFromDb(null) のみ実行。
// 4. squad-to-tactical-bridge.ts:
//    - const gkBasePos = { x: team === 'home' ? 7 : 93, y: 50 };
//    - const actualPos = mode === 'full' && templatePos.position === 'GK'
//        ? (isVertical ? transformCoord(gkBasePos, '16:9', aspectRatio) : gkBasePos)
//        : (isVertical ? getFormationActualPosVertical(templatePos, team, mode) : getFormationActualPos(templatePos, team, mode));
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: プロジェクト永続化キー分離・試合初期化・New Project リセット制御
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/tactical-storage.ts`, `src/lib/tactical/__tests__/tactical-storage.test.ts`, `src/features/tactical-unified/hooks/use-tactical-match-init.ts`, `src/features/tactical-unified/hooks/__tests__/use-tactical-match-init.test.ts`, `src/features/tactical-unified/hooks/use-tactical-auto-save.ts`, `src/features/tactical-unified/hooks/__tests__/use-tactical-auto-save-match.test.ts`, `src/features/tactical-unified/panels/toolbar/top-bar-more-menu.tsx`, `src/features/tactical-unified/panels/toolbar/__tests__/top-bar-more-menu.test.tsx`
- **契約 (Interface)**:
  ```ts
  export async function saveActiveProjectToDb(project: TacticalProject, matchId?: string | null): Promise<void>;
  export async function loadActiveProjectFromDb(matchId?: string | null): Promise<TacticalProject | null>;
  export async function resolveMatchInitialState(matchId: string | null, minute: number): Promise<TacticalUnifiedStoreInitialState | null>;
  ```
- **Testing Strategy**:
  - `tactical-storage.test.ts`: ①`project.matchId = '10'` のプロジェクトを第2引数なしで `saveActiveProjectToDb(project)` に渡した際、`'tactical_active_project_10'` に保存され `'tactical_active_project'` が汚染されないこと、②`'tactical_active_project'` に `matchId: '10'` を持つデータが入っている状態で `loadActiveProjectFromDb()` を呼ぶと `null` を返すこと。
  - `use-tactical-match-init.test.ts`: `resolveMatchInitialState('1', 45)` が過去の保存データに上書きされず `45'` の初期状態を生成すること。
  - `use-tactical-auto-save-match.test.ts`: `matchId = null` マウント時にストア内 `project.matchId` が残っていれば `resetProject()` が呼ばれること。
  - `top-bar-more-menu.test.tsx`: URL `matchId` なしでの New Project 押下時は `injectMatchToTactical` を呼ばず `resetProject()` と `clearActiveProjectFromDb(null)` を呼ぶこと、URL `?matchId=10` ありでの押下時は `injectMatchToTactical({ match, minute: 0, storeApi })` を呼ぶこと。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/tactical/__tests__/tactical-storage.test.ts` ➔ 実装 ➔ `bun run ai:check src/lib/tactical/tactical-storage.ts src/lib/tactical/__tests__/tactical-storage.test.ts src/features/tactical-unified/hooks/use-tactical-match-init.ts src/features/tactical-unified/hooks/__tests__/use-tactical-match-init.test.ts src/features/tactical-unified/hooks/use-tactical-auto-save.ts src/features/tactical-unified/hooks/__tests__/use-tactical-auto-save-match.test.ts src/features/tactical-unified/panels/toolbar/top-bar-more-menu.tsx src/features/tactical-unified/panels/toolbar/__tests__/top-bar-more-menu.test.tsx` PASS
- **Worker Handoff Log**:
  - `saveActiveProjectToDb`: `effectiveMatchId`（`matchId ?? project.matchId`）による試合キー分離、`loadActiveProjectFromDb`: `!matchId && val.matchId` の単独キー混入拒否。
  - `top-bar-more-menu.tsx`: URL `searchParams.get('matchId')` に基づき単独リセットと試合0分初期化（`injectMatchToTactical` への `storeApi` 渡し含む）を完全分岐。

---

### Phase 2: 初期フォーメーション配置時のGK定位置補正（リセット時との完全一致）
- **Worker Model**: `flash_lite`
- **対象ファイル**: `src/lib/tactical/squad-to-tactical-bridge.ts`, `src/lib/tactical/__tests__/squad-to-tactical-bridge.test.ts`
- **契約 (Interface)**:
  ```ts
  export function convertSquadToTacticalPlayers(
    squad: SquadPlayerInput[],
    formationName: string,
    team: 'home' | 'away',
    mode?: CourtViewMode,
    startOrder?: number,
    existingPlayerMap?: Map<string, number>,
    aspectRatio?: PitchAspectRatio,
  ): Record<string, UnifiedTacticalPlayer>;
  ```
- **Testing Strategy**: `squad-to-tactical-bridge.test.ts`: `mode = 'full'` のとき、GK（`index 0`）の座標が `'16:9'` で Home `{ x: 7, y: 50 }` / Away `{ x: 93, y: 50 }`、`'9:16'` で Home `{ x: 50, y: 93 }` / Away `{ x: 50, y: 7 }` になることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/tactical/__tests__/squad-to-tactical-bridge.test.ts` ➔ 実装 ➔ `bun run ai:check src/lib/tactical/squad-to-tactical-bridge.ts src/lib/tactical/__tests__/squad-to-tactical-bridge.test.ts` PASS
- **Worker Handoff Log**:
  - GK定位置補正: `convertSquadToTacticalPlayers` にて `mode === 'full' && templatePos.position === 'GK'` のとき横ピッチ `{ x: team === 'home' ? 7 : 93, y: 50 }`、縦ピッチでは `transformCoord` で Home `{ x: 50, y: 93 }` / Away `{ x: 50, y: 7 }` へ配置するように同期完了。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-01 21:28
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  永続化キー分離・初期化ロジック・Store Provider遵守・GK座標変換の一貫性が確認され、全受入要件を満たしている。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
