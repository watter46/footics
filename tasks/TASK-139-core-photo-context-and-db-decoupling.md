# TASK-139: 選手写真を Context 経由で注入（`core/` から DB 依存を排除・一括読込による高速化）

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-02
- **Depends On**: TASK-137 完了後（`resolvePlayerPhotoSources` / `getPlayerPhotoKey` を使用）。TASK-138 とは対象ファイルが重ならないため並列実行可。
- **Goal**: Level 2（`core/`）の `PlayerMarkerItem` が間接的に DB を読んでいる規約違反を解消し、写真の読込を「選手ごとのフック」から「Level 3 での一括読込＋Context 配布」に変える。
- **Target Files**:
  - `src/features/tactical-unified/core/hooks/player-photo-context.tsx` (NEW)
  - `src/features/tactical-unified/core/index.ts` (MODIFY: export 追加)
  - `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/__tests__/player-marker-item.test.tsx` (MODIFY)
  - `src/features/tactical-unified/objects/player/hooks/use-player-photo-registry.ts` (NEW)
  - `src/features/tactical-unified/objects/player/hooks/__tests__/use-player-photo-registry.test.ts` (NEW)
  - `src/features/tactical-unified/views/FullTacticalCanvas.tsx` (MODIFY)
  - `src/features/tactical-unified/objects/player/hooks/use-player-photo.ts` (DELETE)
  - `src/features/tactical-unified/objects/player/hooks/__tests__/use-player-photo.test.ts` (DELETE)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. **層規約**: `core/` 配下（テスト除く）が `@/features/tactical-unified/objects/**`・`@/lib/db/**`・`@/lib/tactical/player-photo-resolver` を import しないこと（`rg` で0件。resolver 経由の「間接 DB 依存」も禁止）。`core/` が import してよいのは DB 非依存の `@/lib/tactical/player-photo-key` のみ。
- [x] 2. **表示一致**: 編集画面で `insideContent === 'photo'` の選手は、従来どおり写真で表示されること。写真が無い選手・`PlayerPhotoProvider` が無い環境（Extension の `core/` 利用側など）では、背番号表示にフォールバックしてエラーにならないこと。
- [x] 3. **パフォーマンス（一括読込）**: 対象選手が N 人でも、写真読込は `resolvePlayerPhotoSources` 1回（初回）。スライドを切り替えても、既に読込済みのキーは再読込しないこと（新しく現れたキーだけを解決）。選手ごとの `useEffect`・DB 往復が発生しないこと。
- [x] 4. **パフォーマンス（描画の安定）**: 全選手分の読込結果は1回の状態更新でまとめて反映し、読込完了時の再描画は1回に収まること。ドラッグや再生で `slides` の参照が変わっても、写真の構成（key・name・photoUrl の組）が同じなら resolver を呼ばず、Context の値の参照も変えないこと。
- [x] 5. **RAII**: 生成した `URL.createObjectURL` はアンマウント時にすべて `revokeObjectURL` し、読込中のアンマウントでは結果を捨てて state 更新しないこと。
- [x] 6. **Zero-Flicker**: アクティブフェーズの全スライドの選手を対象に先読みし、スライド切替・再生中に背番号→写真のチラつきが出ないこと。
- [x] 7. 旧 `usePlayerPhoto` と、そのテストが削除され、参照が残っていないこと。`bun run ai:check <対象ファイル>` が exit code 0 で PASS すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { getPlayerPhotoKey } from '@/lib/tactical/player-photo-key';            // core/ から可（DB 非依存）
import { resolvePlayerPhotoSources } from '@/lib/tactical/player-photo-resolver'; // Level 3（registry フック）のみ
import { selectActivePhaseSlides } from '@/features/tactical-unified/stores/tactical-unified-selectors';
```

### 3.2 Key Interfaces & Types
```ts
// core/hooks/player-photo-context.tsx（Level 2・ホスト非依存・DB を知らない）
export type PlayerPhotoMap = ReadonlyMap<string, HTMLImageElement>;
export function PlayerPhotoProvider(props: { photos: PlayerPhotoMap; children: React.ReactNode }): React.JSX.Element;
export function usePlayerPhotoImage(marker: {
  playerId?: string | number;
  id: string;
  style?: { insideContent?: string };
}): HTMLImageElement | null;
// insideContent !== 'photo'、または Provider 無し、または未登録キー → null

// objects/player/hooks/use-player-photo-registry.ts（Level 3 から利用。resolver を呼ぶ）
export interface PlayerPhotoRegistryInput {
  id: string;
  playerId?: string | number;
  name?: string;
  style?: { photoUrl?: string; insideContent?: string };
}
export function usePlayerPhotoRegistry(players: PlayerPhotoRegistryInput[]): PlayerPhotoMap;
```

### 3.3 Implementation Notes & Gotchas
- **キー規則**: 登録側（registry）も参照側（`usePlayerPhotoImage`）も必ず `getPlayerPhotoKey(marker)` を使う（独自に `String(...)` しない）。
- **registry の動作**: ① `insideContent === 'photo'` の選手を key で重複排除 → ② 「key|name|photoUrl」を連結・ソートした署名文字列を `useMemo` で作る → ③ 署名が変わったときだけ `useEffect`：キャッシュ（`useRef<Map<string, HTMLImageElement>>`）に無い key だけを resolver へ渡す → ④ `blob` は `URL.createObjectURL`、`url` はそのまま `Image` に設定し、全件の `onload`/`onerror` を `Promise.allSettled` で待つ → ⑤ 成功分を ref のキャッシュへ追加し、**1回だけ** `setPhotos(new Map(cache))`。署名が同じなら Map の参照を維持。
- **対象選手**: `selectActivePhaseSlides` の全スライドの `players`（ベンチ含む）。`FullTacticalCanvas`（Level 3）で `useTacticalUnifiedStoreContext` から取得して渡す。`core/` から `useTacticalUnifiedStore` を参照しない。
- **RAII**: `isCancelled` フラグ、ObjectURL 配列を ref で保持し、アンマウント時に全 revoke。画像読込済みのキャッシュは state 更新のたびに revoke しない（使用中の画像を壊さない）。
- **`PlayerMarkerItem`**: 既存の `usePlayerPhoto(...)` 呼出を `usePlayerPhotoImage(marker)` に置換するのみ。他の描画ロジック・props は変更しない。
- **`FullTacticalCanvas`**: `CanvasStoreProvider` の外側または内側のどちらでもよいが、`CanvasStageContainer` を `PlayerPhotoProvider` で包む。Level 3 の責務（データ読込と注入）に限り、複雑な処理は registry フックに置く。
- **Extension**: `extension/` 側は変更しない。Provider が無いので背番号表示のまま動く（`usePlayerPhotoImage` は null を返す）。

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: `core/` 側を Context 受け取りに変更（DB 非依存化）
- **Worker Model**: `flash`
- **対象ファイル**: `core/hooks/player-photo-context.tsx`, `core/index.ts`, `core/components/PlayerMarkerItem.tsx`, `core/components/__tests__/player-marker-item.test.tsx`
- **契約 (Interface)**: 3.2 の `PlayerPhotoProvider` / `usePlayerPhotoImage` / `PlayerPhotoMap`
- **Testing Strategy**:
  - `player-marker-item.test.tsx`（MODIFY）: `usePlayerPhoto` のモックを廃止し、`PlayerPhotoProvider` に `new Map([[key, img]])` を渡して検証。① 写真あり → 画像ノードが描画される。② Provider 無し → 背番号テキストが描画される。③ `insideContent !== 'photo'` → Context に写真があっても背番号。
  - `rg "objects/|lib/db|player-photo-resolver" src/features/tactical-unified/core --glob '!**/__tests__/**'` が0件。
- **Tasks**:
  - [x] 1. TDD RED: `bun run ai:check:red src/features/tactical-unified/core/components/__tests__/player-marker-item.test.tsx`
  - [x] 2. 実装 ➔ `bun run ai:check src/features/tactical-unified/core/hooks/player-photo-context.tsx src/features/tactical-unified/core/index.ts src/features/tactical-unified/core/components/PlayerMarkerItem.tsx src/features/tactical-unified/core/components/__tests__/player-marker-item.test.tsx` PASS
- **Worker Handoff Log**:
  - export: `PlayerPhotoMap`, `PlayerPhotoProvider`, `usePlayerPhotoImage` を `core/` から公開。`usePlayerPhotoImage` 内の `useContext` は Rules of Hooks に従い関数トップレベルで呼び出し。

---

### Phase 2: Level 3 の一括読込フックと配線（Phase 1 完了後に実施）
- **Worker Model**: `flash`
- **対象ファイル**: `objects/player/hooks/use-player-photo-registry.ts`, `objects/player/hooks/__tests__/use-player-photo-registry.test.ts`, `views/FullTacticalCanvas.tsx`, `objects/player/hooks/use-player-photo.ts`（削除）, `objects/player/hooks/__tests__/use-player-photo.test.ts`（削除）
- **契約 (Interface)**: 3.2 の `usePlayerPhotoRegistry`
- **Testing Strategy**:
  - `use-player-photo-registry.test.ts`（NEW、resolver をモック）: ① 20人（photo 指定15人）で resolver が1回だけ呼ばれ、渡された targets が15件。② `players` の配列参照を変えても署名が同じなら resolver 追加呼出0回・戻り値の Map 参照が不変。③ 新しい選手を1人追加 → resolver が呼ばれ、渡された targets は新規 key のみ。④ 読込完了後の `renderHook` の再レンダー回数が1回増えるだけ。⑤ アンマウントで全 ObjectURL が revoke され、読込中アンマウントで state 更新されない。⑥ `insideContent !== 'photo'` の選手は resolver に渡らない。
  - 既存 `full-tactical-canvas*.test.tsx` が GREEN（`views/__tests__/`）。
- **Tasks**:
  - [x] 1. TDD RED: `bun run ai:check:red src/features/tactical-unified/objects/player/hooks/__tests__/use-player-photo-registry.test.ts`
  - [x] 2. 実装・配線・旧フック削除 ➔ `rg "usePlayerPhoto\b|use-player-photo'" src` が0件であることを確認
  - [x] 3. `bun run ai:check src/features/tactical-unified/objects/player/hooks/use-player-photo-registry.ts src/features/tactical-unified/objects/player/hooks/__tests__/use-player-photo-registry.test.ts src/features/tactical-unified/views/FullTacticalCanvas.tsx` PASS
- **Worker Handoff Log**:
  - export: `usePlayerPhotoRegistry`, `PlayerPhotoRegistryInput` を提供。`signature` メモ化による resolver 呼出最小化・Map 参照不変担保、RAII クリーンアップ（アンマウント時の一括 revokeObjectURL）を実装。旧フックと残存 mock を完全削除。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-02
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  - Level 2（`core/`）の `PlayerMarkerItem` から DB / resolver 依存を完全に排除し、`PlayerPhotoProvider` / `usePlayerPhotoImage` の Context 注入モデルへ移行完了。
  - Level 3 の `FullTacticalCanvas` でアクティブフェーズ全スライド対象の `usePlayerPhotoRegistry` 一括ロードを配線。重複排除、署名ベースの差分ロード、Map 参照安定性、アンマウント時の RAII revoke を確認。
  - 旧 `usePlayerPhoto` およびテスト・モック残骸を全廃。全スコープテストおよび親ビューテストが PASS。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
