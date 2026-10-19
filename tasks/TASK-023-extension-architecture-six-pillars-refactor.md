# TASK-023: Extension & Web アーキテクチャ6大原則リファクタリング

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-19
- **Target Files**:
  - `extension/features/memo-overlay/memo-overlay-bridge.tsx` (MODIFY)
  - `extension/features/memo-overlay/components/QuickTagBar.tsx` (MODIFY)
  - `src/features/memo-overlay/components/MemoOverlayView.tsx` (MODIFY)
  - `src/features/memo-overlay/hooks/useMemoOverlayDerived.ts` (MODIFY)
  - `extension/features/memo-overlay/__tests__/memo-overlay-bridge.test.tsx` (MODIFY)
  - `extension/entrypoints/background/commands/types.ts` (NEW)
  - `extension/entrypoints/background/commands/registry.ts` (NEW)
  - `extension/entrypoints/background/commands/capture-command.ts` (NEW)
  - `extension/entrypoints/background/commands/mini-mode-command.ts` (NEW)
  - `extension/entrypoints/background/commands/memo-command.ts` (NEW)
  - `extension/entrypoints/background.ts` (MODIFY)
  - `extension/entrypoints/background/__tests__/commands.test.ts` (NEW)
  - `extension/features/capture/services/capture-service.ts` (NEW)
  - `extension/entrypoints/overlay.content.tsx` (MODIFY)
  - `extension/features/capture/services/__tests__/capture-service.test.ts` (NEW)
  - `extension/features/storage-sync/footics-app-bridge.ts` (MODIFY)
  - `src/hooks/use-data-sync.ts` (MODIFY)
  - `src/hooks/__tests__/use-data-sync.test.ts` (NEW)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `memo-overlay-bridge.tsx` の 46 行に及ぶシングルトン手動同期 `useEffect` (L48-L93) を完全撤去し、`MemoOverlayStoreProvider` への Props 確定注入および Context 参照（`useMemoOverlayStoreContext`）に統一すること。
- [x] 2. `extension/entrypoints/background/commands/` 配下に `CommandRegistry` と各ハンドラーを新設し、手続き型分岐を撤去して単体テストを確立すること。
- [x] 3. `extension/features/capture/services/capture-service.ts` に低レベル処理をカプセル化し、`overlay.content.tsx` を純粋マウンターに純化すること。
- [x] 4. `footics-app-bridge.ts` から `CustomEvent` を削除し、`window.postMessage` に一本化して重複発火を解消すること。
- [x] 5. 全改修対象の単体テストが整備され、`bun run ai:check` および `rtk vitest run extension` が全件 PASS すること。

## 3. Context Snippets (参照コード・型定義・import)

```ts
// MemoOverlay Store Context (src/features/memo-overlay/stores/memo-overlay-provider.tsx)
export function MemoOverlayStoreProvider({ children, initialState }: MemoOverlayStoreProviderProps): React.JSX.Element;
export function useMemoOverlayStoreContext<T>(selector: (state: MemoOverlayState) => T): T;
export function useMemoOverlayContext<T = MemoOverlayState>(selector?: (state: MemoOverlayState) => T): T;

// Command Context (extension/entrypoints/background/commands/types.ts)
export interface BackgroundCommandContext {
  activeTab?: browser.tabs.Tab;
  findFooticsTab: () => Promise<browser.tabs.Tab | undefined>;
  sendBridgeMessage: <T = unknown>(message: string, data: unknown, destination: string) => Promise<T>;
  storage: typeof browser.storage.local;
  captureTab: (options: { format: 'jpeg'; quality: number }) => Promise<string | undefined>;
  processCanvas: (dataUrl: string, tab?: browser.tabs.Tab) => Promise<void>;
}
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: MemoOverlay Store Provider 完全移行
- [x] 1. `QuickTagBar.tsx`, `MemoOverlayView.tsx`, `useMemoOverlayDerived.ts` の `useMemoOverlayStore` 参照を `useMemoOverlayStoreContext` / `useMemoOverlayContext` へ置換。
- [x] 2. `memo-overlay-bridge.tsx` の 46行同期 `useEffect` を撤去し、Propsから `initialState` を計算して `MemoOverlayStoreProvider` へ渡す。
- [x] 3. `memo-overlay-bridge.test.tsx` を更新して検証（`rtk vitest run extension/features/memo-overlay`）。

### Phase 2: Background Command Registry 導入
- [x] 1. `commands/types.ts`, `commands/registry.ts`, 各ハンドラー（`capture-command.ts`, `mini-mode-command.ts`, `memo-command.ts`）を作成。
- [x] 2. `commands.test.ts` を作成してテスト（RED → GREEN）。
- [x] 3. `background.ts` の `onCommand` リスナーを `registry.execute(...)` に置き換え。

### Phase 3: CaptureService ファサード抽出
- [x] 1. `capture-service.ts` を新設し、テスト `capture-service.test.ts` を作成。
- [x] 2. `overlay.content.tsx` を純粋マウンター化。
- [x] 3. `rtk vitest run extension/features/capture` で検証。

### Phase 4: 境界通信の単一プロトコル化
- [x] 1. `footics-app-bridge.ts` の `CustomEvent` を削除。
- [x] 2. `use-data-sync.ts` の `footics-action` リスナーを削除し、単一化。
- [x] 3. `use-data-sync.test.ts` を新設して検証。
- [x] 4. 全体検証: `bun run ai:check` および `rtk vitest run extension`。

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `inherit`
- **Reviewed At**: 2026-10-19
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 要件網羅性: 4つの課題すべてに対して手抜きなく実装され、テストが存在するか
  - [x] 境界と副作用: Level 2 core にホスト依存の混入がないか、useEffectによるFlickerがないか
  - [x] 設計負債防止: OCP, SLAP, SRP が守られ、1ファイル200行以内に収まっているか
  - [x] サイレント破壊防止: 既存機能・既存テストが壊れていないか
- **Summary**:
  1. **要件網羅性**: 
     - Phase 1: `memo-overlay-bridge.tsx` の 46 行に及ぶ同期 `useEffect` を完全撤去し、`MemoOverlayStoreProvider` への Props 確定注入および Context 参照（`useMemoOverlayStoreContext`）へ置換。シングルトン汚染防止テストを含む単体テストが整備。
     - Phase 2: `CommandRegistry` と各ハンドラー（`CaptureCommand`, `MiniModeCommand`, `MatchMemoCommand`, `EventMemoCommand`）を新設し、手続き型分岐を撤去。16件の包括的な単体テストがパス。
     - Phase 3: `CaptureService` ファサードにより DRM・クロップ・ストレージ通信をカプセル化し、`overlay.content.tsx` を純粋マウンターへ純化。10件のパイプライン単体テストがパス。
     - Phase 4: `CustomEvent` を完全撤廃し、`window.postMessage` に一本化。`useDataSync` にて型安全なメッセージ受信とクエリ無効化をテスト（8件）で検証。
  2. **境界と副作用**:
     - Level 2 core (`MemoOverlayView.tsx`, `useMemoOverlayDerived.ts`) に `chrome.*` などのホスト依存混入は皆無。
     - Store Provider パターンにより、マウント後の非同期同期による画面 Flicker（チラつき）が根本解消された。
  3. **設計負債防止 (OCP, SLAP, SRP, 行数)**:
     - Background コマンドは OCP に従い、新規コマンド追加時に既存コードを変更せずクラス登録のみで拡張可能。
     - Content Script は SLAP に従い、低レベル詳細（キャンバス描画・座標計算・メッセージパケット組み立て）が `CaptureService` に隠蔽された。
     - 新規・改修モジュールはいずれも高凝集で、大半が 30〜120 行とコンパクトに保たれている（`background.ts` も 120行以上の手続きコードが削減された）。
  4. **サイレント破壊防止**:
     - `depcruise` による依存関係違反は 0 件。
     - 各フェーズの既存機能・フォールバック（動画なし時、クロップ失敗時、タブ未検出時等）がすべて温存され、テストで検証されている。

## 6. Rejections / Additional Tasks (不可逆修正欄)
- 特になし。6大原則に準拠した高凝集・疎結合なリファクタリングが完璧に完遂されている。
