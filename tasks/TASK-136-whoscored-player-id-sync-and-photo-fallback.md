# TASK-136: whoscored-player-id-sync-and-photo-fallback

## 1. Metadata
- **Status**: `TODO`
- **Created**: 2026-11-01
- **Target Files**:
  - `src/lib/tactical/chelsea-preset.ts` (MODIFY)
  - `src/lib/tactical/__tests__/chelsea-preset.test.ts` (NEW)
  - `src/lib/db/player-merge.ts` (MODIFY)
  - `src/lib/db/queries-player.ts` (MODIFY)
  - `src/lib/db/__tests__/queries.test.ts` (MODIFY)
  - `src/lib/data-loader.ts` (MODIFY)
  - `src/lib/data-management-import.ts` (MODIFY)
  - `src/features/teams/utils/squad-actions.ts` (MODIFY)
  - `src/features/tactical-unified/objects/player/hooks/use-player-photo.ts` (MODIFY)
  - `src/features/tactical-unified/objects/player/hooks/__tests__/use-player-photo.test.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/__tests__/player-marker-item.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [ ] 1. `chelsea-preset.ts`: 全シーズン（24-25, 25-26, 26-27）のチェルシー選手IDを、旧345000番台からWhoScored/Opta実ID（Palmer: 395692, Gusto: 403850, Caicedo: 410175, Neto: 337916, Fofana: 373946, Colwill: 421351, Lavia: 425319, Sánchez: 362151, James: 361330, Cucurella: 363496, Fernández: 369430, Jackson: 426050, Estêvão: 510728 等）へ更新すること。
- [ ] 2. `player-merge.ts` / `queries-player.ts`: `isLegacyOrTempPlayerId(id)` を導入し、`savePlayerMastersBatch` において負の仮IDだけでなく旧345000番台（345000〜349999）も名寄せ対象として検知すること。
- [ ] 3. `queries-player.ts`: 旧仮IDの写真Blob（`db.player_photos`）を公式IDへ移行・コピーし、旧仮IDの選手・写真レコードを削除し、`tactical_projects` 内の選手ID参照も新公式IDへ自動マッピング更新すること。さらに既存DB内を一括整理する `mergeLegacyPlayersAndPhotos()` を提供すること。
- [ ] 4. `data-loader.ts`, `data-management-import.ts`, `squad-actions.ts`: 試合取込後、ZIP復元（リストア）完了時、および「Sync Squad」実行時に自動名寄せ・写真引き継ぎ・クリーンアップ処理が実行されること。
- [ ] 5. `use-player-photo.ts`: `usePlayerPhoto(playerId, photoUrl, enabled, playerName)` の第4引数 `playerName` を追加し、IDでの写真取得が未ヒットの場合に選手名（`normalizePlayerNameForMatch`）で同名選手を検索してその写真Blobをフォールバック描画すること。
- [ ] 6. `PlayerMarkerItem.tsx`: `usePlayerPhoto` に `marker.name` を渡すこと。
- [ ] 7. 各Phaseのテストおよび型検査（`bun run ai:check`）が全件 PASS すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { normalizePlayerNameForMatch, updateTacticalProjectsPlayerIds } from './player-merge';
import { db, type PlayerMaster } from './schema';
import { getPlayerPhoto } from '@/lib/db/queries';
```

### 3.2 Key Interfaces & Types
```ts
// 旧ID判定ヘルパー
export function isLegacyOrTempPlayerId(id: number): boolean {
  return id < 0 || (id >= 345000 && id < 350000);
}

// 選手写真フックシグネチャ拡張
export function usePlayerPhoto(
  playerId?: string,
  photoUrl?: string,
  enabled = true,
  playerName?: string,
): HTMLImageElement | null;
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
- **RAII & Zero-Flicker**: `usePlayerPhoto` での URL.createObjectURL はアンマウントまたは再取得時に確実に revoke すること。
- **4層境界厳守**: `usePlayerPhoto` や `PlayerMarkerItem` は Level 2 ドメインUIパーツ。ブラウザ拡張固有API（chrome.*）を混入させないこと。
- **データ破壊防止**: 同名選手統合時、公式ID側の背番号・ポジションが未設定（99やSub）の場合のみ旧仮ID側の設定値を優先継承すること（既存の `resolveMergedShirtNo`, `resolveMergedPosition` 規約厳守）。

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: Chelsea プリセットの WhoScored 公式 ID 化
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/chelsea-preset.ts`
  - `src/lib/tactical/__tests__/chelsea-preset.test.ts`
- **Chelsea 全選手 WhoScored 公式ID一覧**:
  - Robert Sánchez: 362151
  - Filip Jörgensen: 404749
  - Reece James: 361330
  - Malo Gusto: 403850
  - Wesley Fofana: 373946
  - Levi Colwill: 421351
  - Marc Cucurella: 363496
  - Tosin Adarabioyo: 136464
  - Benoît Badiashile: 365406
  - Axel Disasi: 300426
  - Renato Veiga: 434077
  - Moisés Caicedo: 410175
  - Enzo Fernández: 369430
  - Cole Palmer: 395692
  - Roméo Lavia: 425319
  - Kiernan Dewsbury-Hall: 391256
  - Carney Chukwuemeka: 410639
  - Noni Madueke: 389935
  - Pedro Neto: 337916
  - Nicolas Jackson: 426050
  - Christopher Nkunku: 300945
  - João Félix: 362431
  - Jadon Sancho: 346300
  - Mykhailo Mudryk: 409376
  - Marc Guiu: 483208
  - Kendry Páez: 477772
  - Estêvão Willian: 510728
- **契約 (Interface)**:
  `CHELSEA_PRESETS_BY_SEASON` 内の全選手 `playerId` が WhoScored 公式ID（正の数値）であること。
- **Testing Strategy**:
  - `src/lib/tactical/__tests__/chelsea-preset.test.ts`:
    - 全シーズンで 345000 番台の ID が 0 件であること。
    - Palmer (`395692`), Gusto (`403850`), Caicedo (`410175`), Colwill (`421351`) 等が正しく設定されていること。
- **Tasks**:
  - [x] 1. TDD RED: `chelsea-preset.test.ts` を作成し公式ID検証テストを追加。
  - [x] 2. TDD GREEN: `chelsea-preset.ts` のチェルシー選手IDを公式IDに置換。
  - [x] 3. `bun run ai:check src/lib/tactical/chelsea-preset.ts src/lib/tactical/__tests__/chelsea-preset.test.ts` PASS。
- **Worker Handoff Log**:
  - `CHELSEA_PRESETS_BY_SEASON`（24-25, 25-26, 26-27）の全チェルシー選手IDをWhoScored公式ID（正の整数値）へ更新。Jadon Sancho は公式ID 346300 のため、旧仮ID範囲は 345000〜345999（345000番台）として検証。

---

### Phase 2: 名寄せロジック拡張と写真・プロジェクト参照自動引き継ぎ
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/db/player-merge.ts`
  - `src/lib/db/queries-player.ts`
  - `src/lib/db/__tests__/queries.test.ts`
- **契約 (Interface)**:
  ```ts
  // player-merge.ts
  export function isLegacyOrTempPlayerId(id: number): boolean;

  // queries-player.ts (export)
  export async function mergeLegacyPlayersAndPhotos(season?: string): Promise<void>;
  export async function findPlayerPhotoByName(name: string): Promise<Blob | undefined>;
  ```
- **実装詳細**:
  - `player-merge.ts`: `isLegacyOrTempPlayerId(id)` を実装（`id < 0 || (id >= 345000 && id < 350000)`）。
  - `queries-player.ts`:
    - `savePlayerMastersBatch`: `db.players` からの仮ID検索で `playerId < 0` だけでなく `isLegacyOrTempPlayerId` な選手を名寄せ対象として取得。
    - `deletePlayerMaster`: `playerId < 0` を `isLegacyOrTempPlayerId(playerId)` に変更。
    - `findPlayerPhotoByName(name: string)`: 選手名を `normalizePlayerNameForMatch` で比較し、マッチする選手IDの写真Blob（`db.player_photos`）を返却。
    - `mergeLegacyPlayersAndPhotos(season?: string)`:
      - 既存DBの旧仮ID選手（`isLegacyOrTempPlayerId`）を検索。
      - 同名（`normalizePlayerNameForMatch`）の公式ID選手（既存DB、または未登録ならChelseaプリセット `CHELSEA_PRESETS_BY_SEASON` から公式選手作成）に写真Blobを移行。
      - 旧仮IDの選手・写真レコードを削除。
      - `idMap` を構築して `updateTacticalProjectsPlayerIds(idMap)` で戦術プロジェクト内の `playerId` 参照を公式IDに置換。
- **Testing Strategy**:
  - `src/lib/db/__tests__/queries.test.ts`:
    - 旧345000番台の仮ID選手・写真が存在するとき、公式ID同名選手保存で写真・属性が引き継がれ旧レコードが削除されること。
    - `mergeLegacyPlayersAndPhotos` で既存DB内の旧仮ID写真・選手が一括で公式IDへ統合・移行されること。
    - `findPlayerPhotoByName` で同名選手の写真Blobが正しく取得できること。
- **Tasks**:
  - [ ] 1. TDD RED: `queries.test.ts` に旧345000番台からの自動名寄せ・写真引き継ぎ・tactical_projects 更新・findPlayerPhotoByName テストを追加。
  - [ ] 2. TDD GREEN: `player-merge.ts` に `isLegacyOrTempPlayerId` を定義し、`queries-player.ts` の `savePlayerMastersBatch` で 345000 番台を統合対象に含める。`mergeLegacyPlayersAndPhotos` および `findPlayerPhotoByName` を実装。
  - [ ] 3. `bun run ai:check src/lib/db/player-merge.ts src/lib/db/queries-player.ts src/lib/db/__tests__/queries.test.ts` PASS。
- **Worker Handoff Log**:

---

### Phase 3: 試合取込・データ復元・スカッド同期との統合
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/data-loader.ts`
  - `src/lib/data-management-import.ts`
  - `src/features/teams/utils/squad-actions.ts`
- **契約 (Interface)**:
  リストア時、スカッド同期（Sync Squad）時、試合取込時に `mergeLegacyPlayersAndPhotos` を実行。
- **実装詳細**:
  - `data-management-import.ts`: `importAllDataZip` の戻り値直前で `await mergeLegacyPlayersAndPhotos()` を呼び出し。
  - `squad-actions.ts`: `handleSyncSquad` 内（または `syncSquadToMaster` 後）で `await mergeLegacyPlayersAndPhotos(selectedSeason)` を実行。
  - `data-loader.ts`: `processClubMatch` のチェルシー選手同期直後で `await mergeLegacyPlayersAndPhotos(season)` を実行。
- **Testing Strategy**:
  - 既存の `data-loader.test.ts`, `data-management.test.ts`, `use-team-squad-client.test.tsx` の回帰検証。
- **Tasks**:
  - [ ] 1. `data-management-import.ts`: リストア処理末尾で `mergeLegacyPlayersAndPhotos` を呼び出し。
  - [ ] 2. `squad-actions.ts`: `handleSyncSquad` 内で `mergeLegacyPlayersAndPhotos` を実行。
  - [ ] 3. `data-loader.ts`: 試合取込時の選手同期で `mergeLegacyPlayersAndPhotos` と連携。
  - [ ] 4. `bun run ai:check src/lib/data-loader.ts src/lib/data-management-import.ts src/features/teams/utils/squad-actions.ts` PASS。
- **Worker Handoff Log**:

---

### Phase 4: 戦術ボード描画の選手名フォールバック（二重防護）
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/objects/player/hooks/use-player-photo.ts`
  - `src/features/tactical-unified/objects/player/hooks/__tests__/use-player-photo.test.ts`
  - `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx`
  - `src/features/tactical-unified/core/components/__tests__/player-marker-item.test.tsx`
- **契約 (Interface)**:
  ```ts
  export function usePlayerPhoto(
    playerId?: string,
    photoUrl?: string,
    enabled = true,
    playerName?: string,
  ): HTMLImageElement | null;
  ```
- **実装詳細**:
  - `use-player-photo.ts`:
    - 第4引数 `playerName?: string` を追加。
    - `playerId` で写真が見つからない場合、`playerName` があれば `findPlayerPhotoByName(playerName)` を実行。取得できた写真Blobから object URL を生成してロード。
    - RAII: revoke 処理を確実に実行、依存配列に `playerName` を追加。
  - `PlayerMarkerItem.tsx`:
    - `usePlayerPhoto` 呼び出し時に第4引数として `marker.name` を渡す。
- **Testing Strategy**:
  - `use-player-photo.test.ts`:
    - `playerId` に写真がないが `playerName` で同名選手がDBに存在する場合、その写真 Blob をフォールバック取得して画像をロードすること。
  - `player-marker-item.test.tsx`:
    - `PlayerMarkerItem` が `usePlayerPhoto` に `marker.name` を第4引数として渡していること。
- **Tasks**:
  - [ ] 1. TDD RED: `use-player-photo.test.ts` と `player-marker-item.test.tsx` に名前フォールバックテストを追加。
  - [ ] 2. TDD GREEN: `use-player-photo.ts` で `findPlayerPhotoByName` を用いたフォールバックを実装し、`PlayerMarkerItem.tsx` から `marker.name` を渡す。
  - [ ] 3. `bun run ai:check src/features/tactical-unified/objects/player/hooks/use-player-photo.ts src/features/tactical-unified/objects/player/hooks/__tests__/use-player-photo.test.ts src/features/tactical-unified/core/components/PlayerMarkerItem.tsx src/features/tactical-unified/core/components/__tests__/player-marker-item.test.tsx` PASS。
- **Worker Handoff Log**:

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
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
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
