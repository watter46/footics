# TASK-061: eliminate-any-types

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-26
- **Target Files**:
  - `src/lib/national-match-schema.ts` (MODIFY)
  - `src/lib/query-keys.ts` (MODIFY)
  - `src/lib/tactical/initial-mapping.ts` (MODIFY)
  - `src/lib/tactical/__tests__/initial-mapping.test.ts` (NEW)
  - `src/lib/tactical/export/share-payload.ts` (MODIFY)
  - `src/lib/tactical/export/__tests__/share-payload.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. 対象4モジュールから `any` / `any[]` を完全排除し、適切な TypeScript 型および Zod スキーマへ置換すること
- [x] 2. `as any` による握りつぶしを行わず、既存モデル（`FormattedPlayer`, `SlideSchema`, `TacticalSceneSchema`, `FilterState` 等）と整合すること
- [x] 3. 実行時挙動を変更せず、新規テスト `initial-mapping.test.ts` および既存テストがすべて PASS すること
- [x] 4. `bun run typecheck:full` および `bun test` / `vitest` が 100% PASS すること

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import type { FormattedMatchData, FormattedPlayer } from '@/lib/national-match-schema';
import type { Formation, FilterState } from '@/types';
import { SlideSchema } from '@/lib/types/tactical-unified';
import { TacticalSceneSchema } from '@/lib/types/syntax-integration';
```

### 3.2 Key Interfaces & Types
```ts
// national-match-schema.ts
export type NationalTimelineEvent = [unknown, unknown, string, unknown, unknown, unknown, number, number, ...unknown[]];
export type NationalTimelinePeriod = [number, NationalTimelineEvent[] | undefined, NationalTimelineEvent[] | undefined, ...unknown[]];

// initial-mapping.ts
export interface InitialPlayerMapping {
  playerId: number;
  name: string;
  shirtNo: string;
  position: string;
  x: number;
  y: number;
  team: 'home' | 'away';
  area: 'pitch' | 'bench';
}

// share-payload.ts
export interface TacticalPlayerLike {
  id?: string | number;
  playerId?: number | string;
  photoUrl?: string;
  insideContent?: string;
  options?: { photoUrl?: string; insideContent?: string; [key: string]: unknown };
  style?: { photoUrl?: string; insideContent?: string; [key: string]: unknown };
  [key: string]: unknown;
}
export interface TacticalSceneLike {
  id?: string;
  players?: Record<string, TacticalPlayerLike> | TacticalPlayerLike[];
  [key: string]: unknown;
}
```

### 3.3 Implementation Notes & Gotchas
```ts
// 1. 後方互換性不要（最新の型・スキーマに厳格化してOK）
// 2. share-payload.ts の scenes は SlideSchema | TacticalSceneSchema または TacticalSceneLike を受け入れ可能にする
// 3. initial-mapping.ts の getShirtNo は文字列/数値を安全に string 化する既存実装を維持
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: ナショナルデータ・クエリキー・初期マッピング型安全化
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/national-match-schema.ts`, `src/lib/query-keys.ts`, `src/lib/tactical/initial-mapping.ts`, `src/lib/tactical/__tests__/initial-mapping.test.ts`
- **契約 (Interface)**:
  ```ts
  export function getActivePlayersNational(matchData: FormattedMatchData, minute: number): { homeActiveIds: number[]; awayActiveIds: number[] };
  export function getActivePlayersClub(matchCentreData: ClubMatchCentreDataLike, minute: number): { homeActiveIds: number[]; awayActiveIds: number[] };
  export function generateInitialMapping(metadata: InitialMappingMetadata, orientation?: 'vertical' | 'horizontal'): Record<number, InitialPlayerMapping>;
  ```
- **Testing Strategy**: `src/lib/tactical/__tests__/initial-mapping.test.ts` を新規作成。クラブ/ナショナルの交代計算とフォーメーション配置を検証。
- **Tasks**:
  - [x] 1. TDD実装: `src/lib/tactical/__tests__/initial-mapping.test.ts` 作成 ➔ RED
  - [x] 2. `national-match-schema.ts` の timeline / lineup / player 型を unknown / tuple へ更新
  - [x] 3. `query-keys.ts` の `eventKeys.filtered` を `FilterState | Record<string, unknown>` へ更新
  - [x] 4. `initial-mapping.ts` の全 any (17箇所) を排除し `InitialPlayerMapping` 等へ更新 ➔ `bun run ai:check src/lib/tactical/initial-mapping.ts` PASS
- **Worker Handoff Log**:
  確定シンボル: `NationalTimelineEvent`, `NationalTimelinePeriod`, `NationalInfoArray`, `NationalLineupData`, `InitialPlayerMapping`, `ClubMatchCentreDataLike`, `InitialMappingMetadata`.
  注意点: `NationalMatchRawDataSchema` のタプル厳格化によりダッシュボード/ローダー波及型エラーを解消し、`initial-mapping.ts` 内の全 any (17箇所) を完全排除。

---

### Phase 2: 戦術共有・書き出しペイロード型安全化
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/export/share-payload.ts`, `src/lib/tactical/export/__tests__/share-payload.test.ts`
- **契約 (Interface)**:
  ```ts
  export const TacticalExportSharePayloadSchema: z.ZodType<...>;
  export async function packPlayerPhotos(scenes: TacticalSceneLike[]): Promise<Record<string, string>>;
  export async function preloadSlidePlayerPhotos(slides: TacticalSceneLike[], existingPhotos?: Record<string, string>): Promise<Record<string, ImageBitmap>>;
  ```
- **Testing Strategy**: `rtk vitest run src/lib/tactical/export/__tests__/share-payload.test.ts` で全ケース PASS
- **Tasks**:
  - [x] 1. `TacticalSceneLike` / `TacticalPlayerLike` を定義し、`TacticalExportSharePayloadSchema` の `scenes` を型付け
  - [x] 2. `packPlayerPhotos`, `preloadSlidePlayerPhotos` の引数を `TacticalSceneLike[]` へ更新
  - [x] 3. `src/lib/tactical/export/__tests__/share-payload.test.ts` 実行確認 ➔ `bun run ai:check src/lib/tactical/export/share-payload.ts` PASS
- **Worker Handoff Log**:
  - `TacticalPlayerLike` と `TacticalSceneLike` を export。`TacticalExportSharePayloadSchema.scenes` は `z.custom<TacticalSceneLike>` により非nullオブジェクト型として安全化。内部の `any` を完全排除。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-26 04:45
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  対象4モジュール（national-match-schema, query-keys, initial-mapping, share-payload）から `any` を完全排除し、適切な Zod スキーマ・タプル・Duck-typing インターフェースへ置換。`as any` 等の握りつぶしも一切なく、新規テスト `initial-mapping.test.ts` と `share-payload.test.ts` の境界値検証を含め高品質に実装されている。ホスト境界・既存公開シンボルの破壊もなく LGTM。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
