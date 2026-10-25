# TASK-058: fix-add-player-dialog-photo-call

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-26
- **Target Files**:
  - `src/features/teams/components/AddPlayerDialog.tsx` (MODIFY)
  - `src/features/teams/components/__tests__/AddPlayerDialog.test.tsx` (CREATE)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `AddPlayerDialog.tsx` の `executeSave` において、`savePlayerPhoto` 呼び出し時の引数を `savePlayerPhoto(id, photo)` に修正し、TypeScript エラー TS2554 (`Expected 2 arguments, but got 4`) を解消すること。
- [x] 2. `AddPlayerDialog` のテスト (`src/features/teams/components/__tests__/AddPlayerDialog.test.tsx`) を追加し、フォーム送信時に `savePlayerMaster` および `savePlayerPhoto` が正しい引数（`id`, `photo` の2引数）で呼び出されることを検証すること。
- [x] 3. `bun run ai:check src/features/teams/components/AddPlayerDialog.tsx src/features/teams/components/__tests__/AddPlayerDialog.test.tsx` が exit code 0 で成功すること。

## 3. Context Snippets (参照コード・型定義・import)

```ts
// src/lib/db/queries.ts
export async function savePlayerPhoto(
  playerId: number,
  photoBlob: Blob,
): Promise<void> {
  await db.player_photos.put({
    playerId,
    photoBlob,
    mimeType: photoBlob.type || 'image/webp',
    updatedAt: Date.now(),
  });
  dispatchRefreshEvent();
}
```

```tsx
// src/features/teams/components/AddPlayerDialog.tsx
// line 87
// BEFORE:
if (photo) await savePlayerPhoto(id, photo, name, season);

// AFTER:
if (photo) await savePlayerPhoto(id, photo);
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: AddPlayerDialog 引数修正 & テスト作成
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/teams/components/AddPlayerDialog.tsx`
  - `src/features/teams/components/__tests__/AddPlayerDialog.test.tsx`
- **Tasks**:
  - [x] 1. `src/features/teams/components/AddPlayerDialog.tsx` の `savePlayerPhoto(id, photo, name, season)` を `savePlayerPhoto(id, photo)` に修正。
  - [x] 2. `src/features/teams/components/__tests__/AddPlayerDialog.test.tsx` を作成し、写真付きで保存された場合に `savePlayerPhoto` が `(id, file)` の2引数で呼ばれることを検証。
  - [x] 3. `bun run ai:check src/features/teams/components/AddPlayerDialog.tsx src/features/teams/components/__tests__/AddPlayerDialog.test.tsx` を実行して合格を確認。

#### Worker Handoff Log
- `savePlayerPhoto(id, photo)`: `AddPlayerDialog.tsx` の不要な `name`, `season` 引数を削除し2引数呼び出しに修正完了。
- Portal 先（`document.body`）へのマウントと `URL.createObjectURL` モックによりダイアログ送信テストを整備。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-26 01:39
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: TS2554 型エラー解消、写真有無両パターンの単体テスト追加
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: IndexedDB クエリ呼び出しの引数整合のみ、境界逸脱なし
  - [x] 3. 設計負債 & 拡張性: queries.ts のシグネチャに厳格準拠
  - [x] 4. サイレント破壊 & 既存保護: 既存動作・他コンポーネントへの破壊的影響なし
- **Summary**: `savePlayerPhoto(id, photo)` への修正および単体テスト整備により、Next.js ビルド時の型エラー TS2554 が完全に解消された。
