# TASK-017: MemoOverlayModal & Extension 連携の直接呼出化 & StoreProvider 統合

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-19
- **Target Files**:
  - `src/features/memo-overlay/components/MemoOverlayModal.tsx` (MODIFY)
  - `extension/features/memo-overlay/memo-overlay-bridge.tsx` (MODIFY)
  - `tasks/TASK-017-modal-and-extension-direct-actions.md` (NEW)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `MemoOverlayModal.tsx` 内の hotkeys（escape, ctrl+enter, command+enter）から `window.dispatchEvent('footics-action')` を全廃し、コンポーネントが持っている `handleClose()` および `handleSave()` を直接呼び出すようにすること。
- [x] 2. `MemoOverlayModal.tsx` を `MemoOverlayStoreProvider` でラップし、モーダル初期化時の Props（mode, initialMemo 等）確定注入を有効化すること。
- [x] 3. `extension/features/memo-overlay/memo-overlay-bridge.tsx` で `MemoOverlayStoreProvider` をマウントし、`useMatchMemoLoader` で解決された `resolvedMemo` および `initialData` を初期値として注入すること（初期チラつき Flicker の根絶）。
- [x] 4. `MemoOverlayModal.tsx` の行数を 130行以内（上限 300行クリア: 128行）に維持すること。
- [x] 5. 既存テスト全件および Extension 側のテストがすべて PASS すること。
- [x] 6. `bun run ai:check src/features/memo-overlay` で exit code 0 を確認すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 MemoOverlayModal Direct Hotkeys
```tsx
// src/features/memo-overlay/components/MemoOverlayModal.tsx
useEffect(() => {
  if (!isModalOpen) return;

  hotkeys('escape', (e) => {
    e.preventDefault();
    handleClose();
  });

  hotkeys('ctrl+enter,command+enter', (e) => {
    e.preventDefault();
    handleSave();
  });

  return () => {
    hotkeys.unbind('escape');
    hotkeys.unbind('ctrl+enter');
    hotkeys.unbind('command+enter');
  };
}, [isModalOpen, handleClose, handleSave]);
```

### 3.2 MemoOverlayStoreProvider Integration
```tsx
// src/features/memo-overlay/components/MemoOverlayModal.tsx
<MemoOverlayStoreProvider initialState={{ isModalOpen: true }}>
  <div className="fixed inset-0 ...">
    <MemoOverlayView matchId={matchId} onClose={handleClose} onSave={handleSave} />
  </div>
</MemoOverlayStoreProvider>
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: MemoOverlayModal & MemoOverlayBridge の直接呼出化 & Provider 統合
- **Worker Model**: `inherit`
- **対象ファイル**:
  - `src/features/memo-overlay/components/MemoOverlayModal.tsx`
  - `extension/features/memo-overlay/memo-overlay-bridge.tsx`
- **契約 (Interface)**:
  - 公開 Props（`matchId` 等）の互換性を完全維持
- **Testing Strategy**:
  - `bun run ai:check src/features/memo-overlay` で exit code 0 を確認
  - `rtk vitest run extension/features/memo-overlay` で Extension 側のテスト合格を確認
- **Tasks**:
  - [x] 1. `MemoOverlayModal.tsx` から `window.dispatchEvent` を全廃し、直接 `handleClose()` / `handleSave()` 呼出に置換
  - [x] 2. `MemoOverlayModal.tsx` および `memo-overlay-bridge.tsx` に `MemoOverlayStoreProvider` を導入
  - [x] 3. `bun run ai:check src/features/memo-overlay` および Extension テスト全 PASS を確認
- **Worker Handoff Log**:
  - 確定実装:
    - `MemoOverlayModal.tsx`:
      - `hotkeys('escape')` / `hotkeys('ctrl+enter,command+enter')` から `window.dispatchEvent` を完全削除し、直接 `handleClose()` / `handleSave()` を呼出
      - `<MemoOverlayStoreProvider initialState={{ isModalOpen: true, mode, memo: initialMemo ?? '' }}>` でラップし初期値確定注入
      - `MemoOverlayModalProps` に `initialMemo?: string; mode?: MemoMode;` を追加
      - 行数: 128行（上限130行以内達成）
    - `memo-overlay-bridge.tsx`:
      - `resolvedMemo` および `initialData` から `memoInitialState` を構築し、`<MemoOverlayStoreProvider initialState={memoInitialState}>` でマウント（Flicker根絶）
      - 既存フック・テストとの後方互換性のためシングルトン同期も維持
    - `memo-overlay-types.ts`:
      - `EventPhase`, `MemoMode` の re-export を追加
      - `MemoOverlayInitialState` に `error?: string;` を追加
    - 新規ユニットテスト:
      - `src/features/memo-overlay/components/__tests__/memo-overlay-modal.test.tsx` (7 tests PASS)
      - `extension/features/memo-overlay/__tests__/memo-overlay-bridge.test.tsx` (3 tests PASS)
  - 検証結果:
    - `bun run ai:check src/features/memo-overlay`: exit code 0 (40 tests PASS, type-check OK, biome OK)
    - `bun run ai:check extension/features/memo-overlay`: exit code 0 (18 tests PASS, type-check OK, biome OK)

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `inherit`
- **Reviewed At**: 2026-10-19T07:51:30Z
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 要件網羅性: MemoOverlayModal 内から window.dispatchEvent が全廃され、直接ハンドラが呼ばれているか
  - [x] 境界と副作用: StoreProvider の適用により初期チラつき（Flicker）が防止されているか
  - [x] 設計負債防止: 行数上限を遵守しているか
  - [x] サイレント破壊防止: Extension および Web のモーダル開閉・保存機能が正常に維持されているか
- **Summary**:
  - ① 要件網羅性: `MemoOverlayModal.tsx` 内の hotkeys から `window.dispatchEvent` を完全削除し、`handleClose()` / `handleSave()` の直接呼出に置換されていることを確認。テストで `dispatchEvent` 未呼出かつ保存・クローズ処理の正確な実行を検証済み。
  - ② 境界と副作用: `MemoOverlayBridge` および `MemoOverlayModal` の双方で `MemoOverlayStoreProvider` を適用し、解決済みデータ（`resolvedMemo`, `initialData`）を初期Stateとして注入。初期チラつき（Flicker）が根絶されている。Level 2 コンポーネントにホスト固有APIの漏洩なし。
  - ③ 設計負債防止: `MemoOverlayModal.tsx` は 128行（<= 130行目標クリア）、`memo-overlay-bridge.tsx` は 146行で規約（300行以内）を余裕を持って遵守。
  - ④ サイレント破壊防止: 既存テストおよび新規テスト全 58 件が PASS。`memo-overlay-bridge.tsx` では既存フック/テスト互換性維持のためのシングルトン同期処理を温存し、後方互換性を保証。Biome / TypeScript もエラーゼロ。LGTM。

## 6. Rejections / Additional Tasks (不可逆修正欄)
None
