# TASK-137: 選手写真の取得ロジック共通化（名前検索の抜け修正・一括取得による高速化）

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-02
- **Depends On**: なし（TASK-138 と並列実行可。TASK-139 の前提）
- **Target Files**:
  - `src/lib/db/player-merge.ts` (MODIFY)
  - `src/lib/db/__tests__/queries.test.ts` (MODIFY)
  - `src/lib/tactical/player-photo-key.ts` (NEW)
  - `src/lib/tactical/player-photo-resolver.ts` (NEW)
  - `src/lib/tactical/__tests__/player-photo-resolver.test.ts` (NEW)
  - `src/lib/tactical/export/share-payload.ts` (MODIFY: `TacticalPlayerLike` に `name` 追加のみ)
  - `src/lib/tactical/export/share-photos.ts` (MODIFY)
  - `src/lib/tactical/export/__tests__/share-payload.test.ts` (MODIFY)
  - `src/features/tactical-unified/objects/player/hooks/use-player-photo.ts` (MODIFY)
  - `src/features/tactical-unified/objects/player/hooks/__tests__/use-player-photo.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. **不具合修正**: `playerId` で写真が見つからず、選手名（正規化一致）で写真が見つかる選手について、`preloadPlayerPhotos`（プレビュー・エクスポート・動画の経路）が編集画面と同じく写真を返すこと（背番号フォールバックにならない）。
- [x] 2. **取得順序の一本化**: 編集（`usePlayerPhoto`）・プレビュー/エクスポート（`preloadPlayerPhotos`）・共有（`packPlayerPhotos`）が、すべて `resolvePlayerPhotoSources` の同一順序で解決すること。順序は ① `player_photos[playerId]` の Blob → ② `players` マスターの `photoBlob` → ③ マーカー指定 `photoUrl` → ④ マスターの `photoUrl` → ⑤ 選手名一致の写真 Blob。
- [x] 3. **パフォーマンス（一括取得）**: 対象選手が N 人でも、DB アクセスは `getPlayerPhotosBatch` 1回・`getPlayersMasterBatch` 1回・`findPlayerPhotosByNames` 最大1回（`db.players.toArray()` は最大1回）に収まること。選手ごとの DB 往復・全件走査をしてはならない。
- [x] 4. **パフォーマンス（無駄な処理の排除）**: 写真対象が0人、または全員が `existingPhotos` で解決済みの場合、DB アクセスを一切行わないこと。名前検索は ①〜④ で未解決かつ `name` を持つ選手のみ対象とすること。
- [x] 5. DB エラー時は例外を投げず、取得できた分だけ返すこと（`console.warn` のみ）。
- [x] 6. `preloadPlayerPhotos` / `packPlayerPhotos` / `usePlayerPhoto` の公開シグネチャは変更しないこと。`usePlayerPhoto` は `@/lib/db/queries` を直接 import しなくなること。
- [x] 7. `bun run ai:check <対象ファイル>` が exit code 0 で PASS すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { getPlayerPhotosBatch } from '@/lib/db/player-photos';
import { getPlayersMasterBatch, findPlayerPhotosByNames } from '@/lib/db/queries';
import { resolvePlayerPhotoSources } from '@/lib/tactical/player-photo-resolver';
import { getPlayerPhotoKey } from '@/lib/tactical/player-photo-key';
```

### 3.2 Key Interfaces & Types
```ts
// src/lib/tactical/player-photo-key.ts （DB 非依存の純粋関数。core/ から import 可能にするため resolver と分離）
export function getPlayerPhotoKey(p: { playerId?: string | number; id?: string | number }): string;
// = String(p.playerId ?? p.id ?? '')   ※ 既存 extractTargetPlayers のキー規則と同一

// src/lib/tactical/player-photo-resolver.ts （DB 依存あり。Level 3 以上からのみ利用）
export interface PlayerPhotoTarget {
  key: string;
  playerId?: string | number;
  name?: string;
  photoUrl?: string;
}
export type PlayerPhotoSource =
  | { kind: 'blob'; blob: Blob }
  | { kind: 'url'; url: string };
export async function resolvePlayerPhotoSources(
  targets: PlayerPhotoTarget[],
): Promise<Map<string, PlayerPhotoSource>>;

// src/lib/db/player-merge.ts （既存 findPlayerPhotoByName は変更せず残す）
export async function findPlayerPhotosByNames(names: string[]): Promise<Map<string, Blob>>;
// 戻り値のキーは「入力された name 文字列そのまま」。
```

### 3.3 Implementation Notes & Gotchas
- **既存の差分原因**: `usePlayerPhoto` だけが `findPlayerPhotoByName`（名前検索）を持ち、`share-photos.ts` の `preloadPlayerPhotos` / `packPlayerPhotos` には無かった。
- **`findPlayerPhotosByNames`**: `normalizePlayerNameForMatch`（既存）で正規化 → 正規化名が空なら DB を触らず空 Map。`db.players.toArray()` は1回だけ → 一致した `playerId` 群を `getPlayerPhotosBatch` で一括取得 → 各 name に最初に見つかった Blob を割当。`queries.ts` 経由で import できること（`findPlayerPhotoByName` と同経路）。
- **`resolvePlayerPhotoSources`**: `Number(playerId)` が `NaN` または `0` の ID は DB 一括取得の対象外（既存 `preloadPlayerPhotos` と同じ除外規則）。同一 `key` の重複ターゲットは1件にまとめる。
- **`share-photos.ts`**: `extractTargetPlayers` は `Map<string, PlayerPhotoTarget>` を返すよう変更し、`name` は `p.name`（文字列のみ）から取得。`preloadPlayerPhotos` は `existingPhotos[key]` を最優先（従来どおり）、残りだけ resolver に渡す。blob は `createImageBitmap`、url は既存 `createBitmapFromUrlOrBase64`。`packPlayerPhotos` は blob → `blobToBase64`、url は既存の「data: 素通し／fetch で Base64 化／失敗時は URL のまま」ロジックを維持。
- **`use-player-photo.ts`**: 内部の取得チェーンを `resolvePlayerPhotoSources([{ key: 'self', ... }])` 1回に置換。`isCancelled` と `objectUrlToRevoke` による RAII クリーンアップは維持（アンマウント・再取得時に `URL.revokeObjectURL`）。
- **既存テストのモック**: `use-player-photo.test.ts` は `@/lib/db/queries` の `getPlayerPhoto` / `findPlayerPhotoByName` をモックしているため、resolver が使う `getPlayerPhotosBatch` / `getPlayersMasterBatch` / `findPlayerPhotosByNames` のモックへ更新すること（期待する振る舞いは変えない）。
- **禁止**: `src/features/**/core/` から resolver を import しないこと（resolver は DB 依存。core 側は TASK-139 で Context 経由にする）。

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: DB 一括名前検索と resolver（`src/lib` 内で完結）
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/db/player-merge.ts`, `src/lib/db/__tests__/queries.test.ts`, `src/lib/tactical/player-photo-key.ts`, `src/lib/tactical/player-photo-resolver.ts`, `src/lib/tactical/__tests__/player-photo-resolver.test.ts`
- **契約 (Interface)**: 3.2 の3関数（`getPlayerPhotoKey` / `resolvePlayerPhotoSources` / `findPlayerPhotosByNames`）
- **Testing Strategy**:
  - `queries.test.ts`（`findPlayerPhotosByNames`）: `'Malo Gusto'` / `'  malo gusto  '` / `'Malo-Gusto'` が同じ Blob に解決される・未登録名は含まれない・空配列や空文字で DB を触らない。複数 name で `db.players.toArray` が1回だけ呼ばれること（spy）。
  - `player-photo-resolver.test.ts`: 取得順序 ①〜⑤ を1ケースずつ（上位が成功したら下位の DB 関数が呼ばれない）。20ターゲットで `getPlayerPhotosBatch` 1回・`getPlayersMasterBatch` 1回・`findPlayerPhotosByNames` ≤1回。ターゲット0件で DB 呼出0回。DB が reject しても resolve すること。
- **Tasks**:
  - [x] 1. TDD RED: `bun run ai:check:red src/lib/tactical/__tests__/player-photo-resolver.test.ts`
  - [x] 2. 実装 ➔ `bun run ai:check src/lib/db/player-merge.ts src/lib/db/__tests__/queries.test.ts src/lib/tactical/player-photo-key.ts src/lib/tactical/player-photo-resolver.ts src/lib/tactical/__tests__/player-photo-resolver.test.ts` PASS
- **Worker Handoff Log**:
  - `findPlayerPhotosByNames` (`@/lib/db/queries`), `getPlayerPhotoKey` (`@/lib/tactical/player-photo-key`), `resolvePlayerPhotoSources` (`@/lib/tactical/player-photo-resolver`) を実装・エクスポート。各DB呼出は個別 try/catch で例外を抑制し、①〜⑤の順序解決と呼出一括化（20人でも各≤1回）を検証済み。

---

### Phase 2: 既存3経路を resolver へ移行（Phase 1 完了後に実施）
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/export/share-payload.ts`, `src/lib/tactical/export/share-photos.ts`, `src/lib/tactical/export/__tests__/share-payload.test.ts`, `src/features/tactical-unified/objects/player/hooks/use-player-photo.ts`, `src/features/tactical-unified/objects/player/hooks/__tests__/use-player-photo.test.ts`
- **契約 (Interface)**: 公開シグネチャ不変（`preloadPlayerPhotos` / `packPlayerPhotos` / `usePlayerPhoto`）
- **Testing Strategy**:
  - `share-payload.test.ts`: ① `playerId` の写真なし＋`name` 一致の master に写真あり → `preloadPlayerPhotos` の結果にそのキーの ImageBitmap が入る（今回の不具合の再現テスト）。② `existingPhotos` で全員解決済み → DB 関数の呼出0回。③ `packPlayerPhotos` でも名前一致の写真が Base64 で返る。
  - `use-player-photo.test.ts`: 既存の全ケース（playerId の Blob／photoUrl／name フォールバック／`revokeObjectURL`）が resolver 経由でも同じ結果になること。
- **Tasks**:
  - [x] 1. TDD RED: `bun run ai:check:red src/lib/tactical/export/__tests__/share-payload.test.ts`
  - [x] 2. 実装 ➔ `bun run ai:check src/lib/tactical/export/share-payload.ts src/lib/tactical/export/share-photos.ts src/lib/tactical/export/__tests__/share-payload.test.ts src/features/tactical-unified/objects/player/hooks/use-player-photo.ts src/features/tactical-unified/objects/player/hooks/__tests__/use-player-photo.test.ts` PASS
- **Worker Handoff Log**:
  - `preloadPlayerPhotos` / `packPlayerPhotos` / `usePlayerPhoto` を `resolvePlayerPhotoSources` へ統合移行。公開シグネチャ・RAII を維持し、全解決時 DB 呼出 0 回、名前一致写真解決、全チェック PASS を確認。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-02 01:15
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  3経路（編集・エクスポート・共有）の写真解決を `resolvePlayerPhotoSources` に一本化し、名前フォールバックの抜けと N 回 DB 走査を解消。一括取得・無駄呼出排除・例外安全・RAII クリーンアップを網羅し、公開シグネチャ維持を確認。全要件充足のため LGTM。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
