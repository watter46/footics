# TASK-132: player-auto-merge-and-backup-optimization

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-01
- **Target Files**:
  - `src/lib/db/queries-player.ts` (MODIFY)
  - `src/lib/db/player-merge.ts` (CREATE)
  - `src/lib/db/player-photos.ts` (CREATE)
  - `src/lib/db/__tests__/queries.test.ts` (MODIFY)
  - `src/lib/data-loader.ts` (MODIFY)
  - `src/lib/data-loader.test.ts` (MODIFY)
  - `src/lib/data-management-helpers.ts` (MODIFY)
  - `src/lib/data-management.ts` (MODIFY)
  - `src/lib/data-management-export.ts` (CREATE)
  - `src/lib/data-management-import.ts` (CREATE)
  - `src/lib/__tests__/data-management.test.ts` (MODIFY)
  - `src/features/teams/utils/squad-builder.ts` (MODIFY)
  - `src/features/teams/utils/squad-aggregation.ts` (MODIFY)
  - `src/features/teams/utils/__tests__/squad-builder.test.ts` (MODIFY)
  - `src/lib/tactical/export/share-photos.ts` (MODIFY)
  - `src/lib/tactical/export/share-payload.ts` (MODIFY)
  - `src/lib/tactical/export/__tests__/share-payload.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. **名前正規化とDB自動名寄せ・優先順位**: `normalizePlayerNameForMatch(name)`（大文字小文字・前後空白・NFDアクセント記号除去・ハイフン/連続空白の単一スペース化）を実装し、`savePlayerMaster` および `savePlayerMastersBatch` で公式ID（`playerId > 0`）保存時に同一シーズン・同一チーム内の同名仮ID選手（`playerId < 0`）を自動検出して統合すること。競合時は「写真は手動登録側を引き継ぎ、背番号（`undefined` / `99` 以外）とポジション（`'Sub'` / `'Other'` 以外）は手動側で明示設定されていれば手動側を優先、未設定なら公式側を採用」し、仮IDレコードと仮ID写真を削除すること。
- [x] 2. **一括保存 (`savePlayerMastersBatch`)・複合インデックス活用・戦術ボード参照更新**: 複数選手を単一トランザクションで一括保存・自動名寄せし `dispatchRefreshEvent()` を最後に1回だけ呼ぶ `savePlayerMastersBatch` を実装し、`processClubMatch`（`data-loader.ts`）および `importAllDataZip`（`data-management.ts`）のN+1直列ループを置き換えること。また `mergePlayerId` と自動名寄せ時に `db.tactical_projects` 内のスライド上の選手参照（`playerId`）も仮IDから公式IDへ更新し、`queryPlayerMastersByFilter` で `[season+teamName]` 複合インデックスを活用すること。
- [x] 3. **全体バックアップ / リストアの完全性と高速化**:
  - `exportAllDataZip`: `db.tactical_projects`（`tactical_projects.json`）と `db.keyval`（`keyval.json`）をZIPに含め、写真は `getAllPlayerPhotos()` から `photos/${playerId}.${ext}`（＋メタデータ `player_photos.json`、後方互換用 `photoFileName`）として重複なく出力し、画像エントリは `[buffer, { level: 0 }]`（無圧縮）で格納すること。
  - `importAllDataZip`: 既存データを残しつつマージ（選択肢A）し、`tactical_projects.json` と `keyval.json` を `bulkPut` で復元し、選手・写真は新形式（`player_photos.json` / `photos/${playerId}.${ext}`）と旧形式（`photos/${safeId}.${ext}`）の両方に対応して一括トランザクション＋自動名寄せで復元すること。
  - `uint8ArrayToBlob`: `new Blob([new Uint8Array(data)], { type: mimeType })` とし、`fflate.unzipSync` の部分ビュー（`byteOffset > 0`）によるバッファ混入バグを防止すること。
- [x] 4. **スカッド構築の名寄せ優先順位統一と戦術共有の負ID写真対応**: `buildUnifiedSquad` と `mergeMasterAndSquadPlayers` で `normalizePlayerNameForMatch` と選択肢Aの優先順位（手動の明示設定背番号・ポジション・写真を優先）を適用し、`share-photos.ts`（`preloadPlayerPhotos`）で `numId !== 0`（負の仮IDを含む）の写真を `db.player_photos` からバッチ取得すること。

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
import { db, type PlayerMaster, type PlayerPhoto } from './schema';
import { ensureTacticalProject, type TacticalProject } from '@/lib/types/tactical-unified';
import { normalizePlayerNameForMatch, savePlayerMastersBatch, getAllPlayerPhotos } from '@/lib/db/queries-player';
```

### 3.2 Key Interfaces & Types
```ts
// src/lib/db/queries-player.ts
export function normalizePlayerNameForMatch(name: string): string;
export type SavePlayerMasterInput = Partial<PlayerMaster> & {
  playerId: number;
  name: string;
  season?: string;
};
export async function savePlayerMastersBatch(players: SavePlayerMasterInput[]): Promise<void>;

// src/lib/data-management-helpers.ts
export function uint8ArrayToBlob(data: Uint8Array, mimeType?: string): Blob;
export function findPhotoBlob(
  unzipped: Record<string, Uint8Array>,
  id: string,
  fileName?: string,
  playerId?: number,
): Blob | undefined;
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// 1. normalizePlayerNameForMatch(name): name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim()
// 2. 優先順位（選択肢A）ヘルパー:
//    - resolveMergedShirtNo(manualNo, officialNo): (manualNo !== undefined && manualNo !== 99) ? manualNo : (officialNo ?? manualNo)
//    - resolveMergedPosition(manualPos, officialPos): (manualPos && manualPos !== 'Sub' && manualPos !== 'Other') ? manualPos : (officialPos && officialPos !== 'Sub' ? officialPos : (manualPos ?? officialPos ?? 'Other'))
// 3. queryPlayerMastersByFilter: teamName 指定時は db.players.where('[season+teamName]').equals([season, teamName]) を使用。ただし teamName === 'Chelsea' の場合は teamName 未設定のレガシーレコード互換のため where('season').equals(season) フォールバックまたは併用に注意。
// 4. fflate zipSync の無圧縮指定: files[`photos/${fileName}`] = [buffer, { level: 0 }] as unknown as Uint8Array (Zippable 型でタプル指定可能)。
// 5. importAllDataZip の戻り値: 既存の { matchCount, memoCount, playerCount, photoCount } に optional または追加で tacticalProjectCount?: number を含め、既存呼び出し元の型互換を維持すること。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 選手DBの自動名寄せ・写真引き継ぎ・一括保存・戦術プロジェクト参照更新
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/db/queries-player.ts`, `src/lib/db/__tests__/queries.test.ts`
- **契約 (Interface)**:
  ```ts
  export function normalizePlayerNameForMatch(name: string): string;
  export async function savePlayerMastersBatch(players: SavePlayerMasterInput[]): Promise<void>;
  ```
- **Testing Strategy**: `queries.test.ts`: ①アクセント記号やハイフン違い（例: `Estêvão` と `Estevao`）の負ID選手が公式ID保存時に自動統合され、写真・明示背番号（`!== 99`）・明示ポジション（`!== 'Sub' && !== 'Other'`）が公式IDへ引き継がれて負IDレコードと負ID写真が消えること、②`mergePlayerId` / 自動名寄せ時に `db.tactical_projects` 内の選手参照も更新されること、③`savePlayerMastersBatch` が単一トランザクションで一括処理することを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/db/__tests__/queries.test.ts` ➔ 実装 ➔ `bun run ai:check src/lib/db/queries-player.ts src/lib/db/__tests__/queries.test.ts` PASS
- **Worker Handoff Log**:
  - `normalizePlayerNameForMatch`, `resolveMergedShirtNo`, `resolveMergedPosition`, `savePlayerMastersBatch` を確定。
  - 300行上限のため `player-merge.ts` と `player-photos.ts` に分離して `queries-player.ts` から再エクスポート。自動名寄せ時に `db.tactical_projects` の参照も単一トランザクションで同期。

---

### Phase 2: 試合JSONインポート時の一括選手同期・自動名寄せ
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/data-loader.ts`, `src/lib/data-loader.test.ts`
- **契約 (Interface)**:
  ```ts
  export async function importMatchJsonFile(file: File): Promise<string>;
  ```
- **Testing Strategy**: `data-loader.test.ts`: 手動追加した仮ID選手（例: `-12345`, 写真・背番号設定済み）が存在する状態で WhoScored 試合JSONをインポートした際、`savePlayerMastersBatch` により公式IDへ自動名寄せ・写真引き継ぎされ、二重登録にならないことを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/data-loader.test.ts` ➔ 実装 ➔ `bun run ai:check src/lib/data-loader.ts src/lib/data-loader.test.ts` PASS
- **Worker Handoff Log**:
  - `processClubMatch` 内の選手保存ループを `savePlayerMastersBatch` による一括登録・自動名寄せに移行。
  - 試合インポート時に手動登録の仮ID選手と写真・背番号・ポジションが公式IDへ即時統合され、二重登録を排除。

---

### Phase 3: 全体バックアップ / リストアの完全性保証と高速化・Blob変換バグ修正
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/data-management-helpers.ts`, `src/lib/data-management.ts`, `src/lib/__tests__/data-management.test.ts`
- **契約 (Interface)**:
  ```ts
  export async function exportAllDataZip(): Promise<void>;
  export async function importAllDataZip(file: File | Blob): Promise<{ matchCount: number; memoCount: number; playerCount: number; photoCount: number; tacticalProjectCount?: number }>;
  ```
- **Testing Strategy**: `data-management.test.ts`: ①サブ配列 `Uint8Array`（`byteOffset > 0`）を `uint8ArrayToBlob` に渡した際にスライスされた正確なサイズの `Blob` になること、②`tactical_projects`・`keyval`・`player_photos`（`db.players` 未登録の単体写真含む）が欠落・重複なくZIP出力・復元されること、③リストア時に同名仮ID選手と公式ID選手が自動名寄せされ写真が引き継がれることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/__tests__/data-management.test.ts` ➔ 実装 ➔ `bun run ai:check src/lib/data-management-helpers.ts src/lib/data-management.ts src/lib/__tests__/data-management.test.ts` PASS
- **Worker Handoff Log**:
  - `uint8ArrayToBlob` の `new Blob([new Uint8Array(data)])` による部分ビュー混入バグを修正。
  - `exportAllDataZip`（`data-management-export.ts`）と `importAllDataZip`（`data-management-import.ts`）を分離（300行上限遵守）。`tactical_projects.json`・`keyval.json`・`player_photos.json`（単体写真・無圧縮レベル0格納）の入出力および `savePlayerMastersBatch` によるリストア時自動名寄せに対応。

---

### Phase 4: スカッド構築・集約における名寄せ優先順位の統一
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/teams/utils/squad-builder.ts`, `src/features/teams/utils/squad-aggregation.ts`, `src/features/teams/utils/__tests__/squad-builder.test.ts`
- **契約 (Interface)**:
  ```ts
  export function buildUnifiedSquad(params: BuildSquadParams): UnifiedSquadResult;
  export function mergeMasterAndSquadPlayers(teamPlayers: Player[], masterPlayers: PlayerMaster[]): MergedSquadPlayer[];
  ```
- **Testing Strategy**: `squad-builder.test.ts`: `normalizePlayerNameForMatch` による表記揺れ一致と、選択肢Aの優先順位（手動側の背番号が `99` や未設定なら公式側を採用、明示設定なら手動側を採用、ポジションも `'Sub'`/`'Other'` 以外なら手動側優先、写真は手動側引き継ぎ）が `buildUnifiedSquad` と `mergeMasterAndSquadPlayers` の双方で一貫して動作することを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/teams/utils/__tests__/squad-builder.test.ts` ➔ 実装 ➔ `bun run ai:check src/features/teams/utils/squad-builder.ts src/features/teams/utils/squad-aggregation.ts src/features/teams/utils/__tests__/squad-builder.test.ts` PASS
- **Worker Handoff Log**:
  - `buildUnifiedSquad` と `mergeMasterAndSquadPlayers`（`resolvePlayerConflict`）で `normalizePlayerNameForMatch`, `resolveMergedShirtNo`, `resolveMergedPosition` を適用。
  - 順序に依存せず公式ID（`playerId > 0`）を優先しつつ、手動の明示背番号・ポジション・写真を正しくマージするよう統一。

---

### Phase 5: 戦術ボード共有・エクスポート時の手動選手（負の仮ID）写真プリロード対応
- **Worker Model**: `flash_lite`
- **対象ファイル**: `src/lib/tactical/export/share-photos.ts`, `src/lib/tactical/export/__tests__/share-payload.test.ts`
- **契約 (Interface)**:
  ```ts
  export async function preloadPlayerPhotos(scenes: TacticalSceneLike[], existingPhotos?: Record<string, string>): Promise<Record<string, ImageBitmap>>;
  ```
- **Testing Strategy**: `share-payload.test.ts`: 負の仮ID（例: `-12345`）を持つ選手の `photoBlob` が `db.player_photos` に保存されている場合、`preloadPlayerPhotos` および `packSharePayload` で漏れなく取得・パックされることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/tactical/export/__tests__/share-payload.test.ts` ➔ 実装 ➔ `bun run ai:check src/lib/tactical/export/share-photos.ts src/lib/tactical/export/__tests__/share-payload.test.ts` PASS
- **Worker Handoff Log**:
  - `preloadPlayerPhotos`（および互換エイリアス `preloadSlidePlayerPhotos`）と `packPlayerPhotos` で `numId !== 0` / `id !== 0` を適用し、負の仮ID選手の写真を `db.player_photos` から取得・プリロード可能に拡張。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-01 21:18
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  選手自動名寄せ・写真引き継ぎ・一括トランザクション・バックアップ完全性・戦術負ID写真取得の全要件をクリア。モジュール分割（300行上限）とSLAP/OCP設計も適合。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
