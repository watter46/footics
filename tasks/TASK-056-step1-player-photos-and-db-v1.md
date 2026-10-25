# TASK-056: Step 1: 選手画像管理（256x256 WebP・player_photos分離）＆ Dexie v1 クリーン再設計 ＆ 戦術ボード反映

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-26
- **Target Files**:
  - `src/lib/schema.ts` (MODIFY)
  - `src/lib/db/schema.ts` (MODIFY)
  - `src/lib/tactical/image-utils.ts` (MODIFY)
  - `src/lib/db/queries.ts` (MODIFY)
  - `src/lib/db/export.ts` (MODIFY)
  - `src/lib/data-management.ts` (MODIFY)
  - `src/lib/tactical/__tests__/image-utils.test.ts` (MODIFY)
  - `src/lib/db/__tests__/queries.test.ts` (MODIFY)
  - `src/lib/db/__tests__/export.test.ts` (MODIFY)
  - `src/lib/__tests__/data-management.test.ts` (MODIFY)
  - `src/features/teams/hooks/use-season-player-copy.ts` (MODIFY)
  - `src/lib/tactical/squad-to-tactical-bridge.ts` (MODIFY)
  - `src/features/teams/hooks/__tests__/use-player-master.test.tsx` (MODIFY)
  - `src/lib/tactical/__tests__/squad-to-tactical-bridge.test.ts` (MODIFY)
  - `src/features/tactical-unified/objects/player/components/player-marker-ring.tsx` (MODIFY)
  - `src/features/tactical-unified/objects/player/hooks/use-player-photo.ts` (NEW)
  - `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx` (MODIFY)
  - `src/lib/tactical/export/tactical-frame-renderer.ts` (MODIFY)
  - `src/features/tactical-unified/core/__tests__/player-marker-item.test.tsx` (MODIFY)
  - `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts` (MODIFY)
  - `src/lib/tactical/export/share-payload.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-share.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx` (MODIFY)
  - `src/features/tactical-unified/hooks/konva-export-helpers.ts` (MODIFY)
  - `src/lib/tactical/export/video-export-engine.ts` (MODIFY)
  - `src/lib/tactical/export/tactical-video-exporter.ts` (MODIFY)
  - `src/app/export/share/[shareId]/page.tsx` (MODIFY)
  - `src/lib/tactical/export/__tests__/share-payload.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. Dexie `version(1)` クリーン再設計と死にテーブル撤去: `src/lib/db/schema.ts` から `v15`〜`v20` の旧マイグレーションおよび未使用テーブル `tactical_snapshots`, `event_memos` を完全撤去し、全8テーブル（`matches`, `events`, `custom_events`, `match_memos`, `players`, `player_photos`, `tactical_projects`, `keyval`）を最適インデックスで `this.version(1)` に単一宣言すること。また旧 v20 DB との `VersionError` 発生時に自動で `Dexie.delete('footics_db')` して再オープンするリカバリ処理を実装すること。
- [x] 2. Zod Contract-First 化と `player_photos` 分離・256×256 WebP 自動変換: `src/lib/schema.ts` に `PlayerMasterSchema`, `PlayerPhotoSchema`, `KeyValEntrySchema` を定義し、`resizeAndCropImageToBlob` の既定を `size = 256`, `mimeType = 'image/webp'`, `quality = 0.85` に更新。`savePlayerPhoto` で WebP 変換後に `db.player_photos`（`playerId` 主キー）へ格納し、`db.players` には `photoBlob` を重複保存しないこと（クエリ取得時に JOIN 結合）。
- [x] 3. 3D足元リングの中央非表示化: `player-marker-ring.tsx` および `tactical-frame-renderer.ts` の 3Dリング描画から中央の背番号テキスト描画を撤去し、3Dリングの中央には何も表示しない仕様に統一すること。
- [x] 4. 2Dサークル `Photo` モードの Konva ＆ エクスポート完全接続: `PlayerMarkerItem.tsx` に `usePlayerPhoto` フックを接続して `PlayerMarkerCircle` に `loadedImage` を渡し、`tactical-frame-renderer.ts` の 2Dサークル描画に `playerPhotos` の円内クリップ描画（写真未登録時は背番号フォールバック）を実装。PC静止画/動画エクスポート・プレビュー・iPhone PWA 共有ペイロード（`use-export-share.ts` / `/export/share/[shareId]`）のすべてで顔写真が描画されること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { db, ensureDatabaseReady, type PlayerMaster, type PlayerPhoto } from '@/lib/db/schema';
import { getPlayerPhoto, getPlayerPhotosBatch, savePlayerPhoto } from '@/lib/db/queries';
import { resizeAndCropImageToBlob } from '@/lib/tactical/image-utils';
import { packPlayerPhotos, preloadSlidePlayerPhotos, unpackPlayerPhotos } from '@/lib/tactical/export/share-payload';
```

### 3.2 Key Interfaces & Types
```ts
// src/lib/schema.ts
export const PlayerMasterSchema = z.object({
  id: z.string(), // '${season}_${playerId}'
  playerId: z.number(),
  name: z.string(),
  season: z.string(),
  defaultShirtNo: z.number().optional(),
  position: z.string().optional(),
  photoBlob: z.instanceof(Blob).optional(), // クエリJOIN用（物理playersテーブルには保存しない）
  photoUrl: z.string().optional(),
  teamName: z.string().optional(),
  isExcluded: z.boolean().optional(),
  updatedAt: z.number(),
});
export type PlayerMaster = z.infer<typeof PlayerMasterSchema>;

export const PlayerPhotoSchema = z.object({
  playerId: z.number(),
  photoBlob: z.instanceof(Blob),
  mimeType: z.string().default('image/webp'),
  updatedAt: z.number(),
});
export type PlayerPhoto = z.infer<typeof PlayerPhotoSchema>;
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// 1. src/lib/db/schema.ts: this.version(1).stores({ matches: 'id, date, matchType', events: '[match_id+id], match_id', custom_events: 'id, match_id, created_at', match_memos: 'matchId', players: 'id, playerId, season, [season+teamName]', player_photos: 'playerId, updatedAt', tactical_projects: 'id, matchId, updatedAt', keyval: 'key' });
// 2. VersionError 自動リカバリ: db.open() が err?.name === 'VersionError' (または inner?.name === 'VersionError') で失敗した際、await db.delete(); await db.open(); を実行する ensureDatabaseReady() を実装する。
// 3. savePlayerMaster: const { photoBlob, ...record } = updated; で db.players.put(record) し、photoBlob が渡された場合は savePlayerPhoto(player.playerId, photoBlob) へ委譲する。
// 4. tactical-frame-renderer.ts: 2Dサークルの描画順序は (1) ベース円塗りつぶし ➔ (2) insideContent === 'photo' && photoSource があれば ctx.save() + ctx.arc() + ctx.clip() + ctx.drawImage() + ctx.restore() ➔ (3) 白枠線 stroke ➔ (4) 写真がない場合または insideContent === 'number' の場合は背番号テキスト描画。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: Dexie `version(1)` クリーン再設計・死にテーブル撤去・WebP変換・`player_photos` リポジトリ刷新
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/schema.ts`
  - `src/lib/db/schema.ts`
  - `src/lib/tactical/image-utils.ts`
  - `src/lib/db/queries.ts`
  - `src/lib/db/export.ts`
  - `src/lib/data-management.ts`
  - `src/lib/tactical/__tests__/image-utils.test.ts`
  - `src/lib/db/__tests__/queries.test.ts`
  - `src/lib/db/__tests__/export.test.ts`
  - `src/lib/__tests__/data-management.test.ts`
- **契約 (Interface)**:
  ```ts
  export async function ensureDatabaseReady(database?: FooticsDatabase): Promise<void>;
  export async function resizeAndCropImageToBlob(fileOrBlob: Blob | File, size?: number, mimeType?: string, quality?: number): Promise<Blob>;
  export async function getPlayerPhoto(playerId: number): Promise<PlayerPhoto | undefined>;
  export async function getPlayerPhotosBatch(playerIds: number[]): Promise<Map<number, Blob>>;
  export async function getAllPlayerPhotos(): Promise<PlayerPhoto[]>;
  ```
- **Testing Strategy**:
  - `image-utils.test.ts`: デフォルトで `256x256` かつ `'image/webp'`（`quality: 0.85`）の Blob が生成されることを検証。
  - `queries.test.ts`: `savePlayerPhoto` が `db.player_photos` に保存され、`db.players` の物理レコードには `photoBlob` を持たないこと、`getPlayerMaster` / `getPlayerMastersBySeason` で `photoBlob` が JOIN 結合されて返ること、`mergePlayerId` で `tempPlayerId` の写真が `officialPlayerId` に引き継がれること、`ensureDatabaseReady` が `VersionError` 時に `delete()` ➔ `open()` することを検証。
  - `export.test.ts` & `data-management.test.ts`: `event_memos` / `tactical_snapshots` 撤去後のバックアップ・リストアおよび `player_photos` の ZIP 入出力を検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/tactical/__tests__/image-utils.test.ts src/lib/db/__tests__/queries.test.ts src/lib/db/__tests__/export.test.ts src/lib/__tests__/data-management.test.ts` ➔ 実装 ➔ `bun run ai:check src/lib/schema.ts src/lib/db/schema.ts src/lib/tactical/image-utils.ts src/lib/db/queries.ts src/lib/db/export.ts src/lib/data-management.ts src/lib/tactical/__tests__/image-utils.test.ts src/lib/db/__tests__/queries.test.ts src/lib/db/__tests__/export.test.ts src/lib/__tests__/data-management.test.ts` PASS
- **Worker Handoff Log**:
  - `ensureDatabaseReady`, `savePlayerPhoto`, `getPlayerPhoto`, `getPlayerPhotosBatch`, `getAllPlayerPhotos`, `PlayerPhotoSchema`, `KeyValEntrySchema` を確定エクスポート。物理 `db.players` テーブルには `photoBlob` を持たせず、クエリ時に `db.player_photos` から JOIN 結合する。

### Phase 2: チーム管理・シーズン引き継ぎ・スカッド連携の `player_photos` 最適化
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/teams/hooks/use-season-player-copy.ts`
  - `src/lib/tactical/squad-to-tactical-bridge.ts`
  - `src/features/teams/hooks/__tests__/use-player-master.test.tsx`
  - `src/lib/tactical/__tests__/squad-to-tactical-bridge.test.ts`
- **契約 (Interface)**:
  ```ts
  // squad-to-tactical-bridge.ts: sp.photoBlob がある場合は insideContent = 'photo' のみ設定し、失効する URL.createObjectURL は style.photoUrl に入れず sp.photoUrl (外部URL) のみ設定する
  ```
- **Testing Strategy**:
  - `use-player-master.test.tsx`: `db.player_photos` 分離後のフック動作が全件 PASS すること。
  - `squad-to-tactical-bridge.test.ts`: `photoBlob` を持つ選手が `insideContent: 'photo'` になり、一時 `blob:` URL を `style.photoUrl` に書き込まないこと（`photoUrl` 指定時はそのまま保持）を検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/teams/hooks/__tests__/use-player-master.test.tsx src/lib/tactical/__tests__/squad-to-tactical-bridge.test.ts` ➔ 実装 ➔ `bun run ai:check src/features/teams/hooks/use-season-player-copy.ts src/lib/tactical/squad-to-tactical-bridge.ts src/features/teams/hooks/__tests__/use-player-master.test.tsx src/lib/tactical/__tests__/squad-to-tactical-bridge.test.ts` PASS
- **Worker Handoff Log**:
  - `convertSquadToTacticalPlayers`: `photoBlob` 存在時は `insideContent: 'photo'` を設定し `style.photoUrl` は `undefined`（外部URL指定時のみ保持）。シーズン間コピー時は `savePlayerMaster` に `photoBlob` を渡すことで `player_photos` に自動委譲。

### Phase 3: 3Dリング中央非表示化 ＆ Konva 編集画面・2D Canvas レンダラーの `Photo` 描画実装
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/objects/player/components/player-marker-ring.tsx`
  - `src/features/tactical-unified/objects/player/hooks/use-player-photo.ts` (NEW)
  - `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx`
  - `src/lib/tactical/export/tactical-frame-renderer.ts`
  - `src/features/tactical-unified/core/__tests__/player-marker-item.test.tsx`
  - `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts`
- **契約 (Interface)**:
  ```ts
  export function usePlayerPhoto(playerId?: string, photoUrl?: string, enabled?: boolean): HTMLImageElement | null;
  export interface RenderTacticalFrameOptions {
    // ...既存フィールド
    playerPhotos?: Record<string, CanvasImageSource | null | undefined>;
  }
  ```
- **Testing Strategy**:
  - `player-marker-item.test.tsx`: 3Dリング（`markerType: 'ring'`）時に中央の背番号 `<Text>` が描画されないこと（下部ラベルのみ）、2Dサークルかつ `insideContent: 'photo'` 時に `PlayerMarkerCircle` へ画像が渡されることを検証。
  - `tactical-frame-renderer.test.ts`: 3Dリング時にリング内背番号 `fillText` が呼ばれないこと、2Dサークルかつ `insideContent: 'photo'` で `playerPhotos` がある場合に `ctx.drawImage` が呼ばれ、画像がない場合は背番号 `fillText` にフォールバックすることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/core/components/__tests__/player-marker-item.test.tsx src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/objects/player/components/player-marker-ring.tsx src/features/tactical-unified/objects/player/hooks/use-player-photo.ts src/features/tactical-unified/objects/player/hooks/__tests__/use-player-photo.test.ts src/features/tactical-unified/core/components/PlayerMarkerItem.tsx src/features/tactical-unified/core/components/__tests__/player-marker-item.test.tsx src/lib/tactical/export/tactical-frame-renderer.ts src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts src/lib/tactical/unified-interpolation.ts` PASS
- **Worker Handoff Log**:
  - `usePlayerPhoto` を新規作成（RAII クリーンアップ付き）。3Dリング中央背番号描画を撤去し、2Dサークルの `insideContent: 'photo'` 時のクリップ写真描画（未登録時は背番号フォールバック）を実装。`RenderTacticalFrameOptions.playerPhotos` を接続。

### Phase 4: PC静止画/動画エクスポート・プレビュー・iPhone PWA 共有への選手写真バンドル接続
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/export/share-payload.ts`
  - `src/features/tactical-unified/panels/export/use-export-share.ts`
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx`
  - `src/features/tactical-unified/hooks/konva-export-helpers.ts`
  - `src/lib/tactical/export/video-export-engine.ts`
  - `src/lib/tactical/export/tactical-video-exporter.ts`
  - `src/app/export/share/[shareId]/page.tsx`
  - `src/lib/tactical/export/__tests__/share-payload.test.ts`
- **契約 (Interface)**:
  ```ts
  export async function preloadSlidePlayerPhotos(slides: any[], existingPhotos?: Record<string, string>): Promise<Record<string, ImageBitmap>>;
  ```
- **Testing Strategy**:
  - `share-payload.test.ts`: `p.style.insideContent === 'photo'` の選手から `db.player_photos` の Blob が Base64 化されて `packPlayerPhotos` で抽出されること、`preloadSlidePlayerPhotos` が `ImageBitmap` マップを返すことを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/tactical/export/__tests__/share-payload.test.ts` ➔ 実装 ➔ `bun run ai:check src/lib/tactical/export/share-payload.ts src/features/tactical-unified/panels/export/use-export-share.ts src/features/tactical-unified/panels/export/export-preview-player.tsx src/features/tactical-unified/panels/export/ios-export-presets.ts src/features/tactical-unified/hooks/konva-export-helpers.ts src/lib/tactical/export/video-export-engine.ts src/lib/tactical/export/tactical-video-exporter.ts src/app/export/share/[shareId]/page.tsx src/lib/tactical/export/__tests__/share-payload.test.ts` PASS
- **Worker Handoff Log**:
  - `preloadSlidePlayerPhotos` をエクスポート。PC静止画/動画/プレビュー/共有プレイヤーの全パイプラインに選手写真のプリロードおよび描画後の `ImageBitmap.close()`（RAII解放）を配線。iosプリセットを `ios-export-presets.ts` に分離。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-26 00:40
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ（ObjectURL revoke / ImageBitmap close）
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  Dexie v1 クリーン再設計（死にテーブル撤去・リカバリ）・player_photos 分離保存・256x256 WebP 自動変換・3Dリング中央非表示化・Konva および全エクスポートパイプラインへの選手写真接続が、厳格な RAII リソース解放（ObjectURL revoke / ImageBitmap close）とともに 6大設計品質原則に完全準拠して実装されていることを確認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
