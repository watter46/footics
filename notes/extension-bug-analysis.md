# Footics Extension コードチェック結果・バグ分析レポート

- 調査日時: 2026-10-12
- 調査元 Conversation ID: `2e280260-bbd3-4ed4-8818-e0609c321549`
- 対象パッケージ: `extension` (`footics-extension`)

---

## 1. 検出されたバグ・懸念点一覧

### ① テスト環境・テストランナー不整合 (重要度: 高)
- **現象**:
  - `bun test extension` 実行時に **8件失敗 / 2件未処理例外** が発生。
    1. `extension/features/memo-overlay/__tests__/quick-tag-bar.test.tsx`:
       `hotkeys-js` が JSDOM 環境未ロード状態でインポートされ、`navigator.userAgent` 参照により `TypeError: undefined is not an object` クラッシュ。
    2. `extension/features/capture/__tests__/tactical-bridge.test.ts`:
       `webextension-polyfill` がブラウザ拡張機能コンテキスト外でインポートされ、`Error: This script should only be loaded in a browser extension.`。
    3. `extension/features/storage-sync/__tests__/offline-queue.test.ts`:
       `Dexie` 関連テストにおいて `fake-indexeddb` がロードされず `DatabaseClosedError: MissingAPIError IndexedDB API missing` により6件全滅。
- **補足**:
  - `bunx vitest run extension` 経由ではプロジェクト共通の `vitest.setup.ts`（jsdom + fake-indexeddb）がロードされるため 41件すべてパスする。
  - テストコマンド・設定の境界が曖昧で、CI やスクリプトで `bun test` が叩かれた場合に即座に壊れる状態。

### ② テストコード内の Mock 実装不整合 (重要度: 中)
- **対象ファイル**:
  - `extension/features/capture/__tests__/tactical-bridge.test.ts` (L29-L32)
- **現象**:
  - `BroadcastChannel` のモックがアロー関数 `vi.fn().mockImplementation(() => ({ ... }))` として定義されている。
  - プロダクションコード側（`new BroadcastChannel(...)`）で呼び出された際に `TypeError: ... is not a constructor` となり、Vitest のコンソールに warning が発生した上で catch 節にフォールバックしている。
- **修正案**:
  ```ts
  class MockBroadcastChannel {
    postMessage = vi.fn();
    close = vi.fn();
  }
  (globalThis as any).BroadcastChannel = MockBroadcastChannel;
  ```

### ③ MiniMemoPanel での EVENT モード保存時の挙動不整合 (仕様バグ懸念: 中)
- **対象ファイル**:
  - `extension/features/memo-overlay/components/mini-memo-panel.tsx`
  - `extension/features/memo-overlay/hooks/use-memo-save.ts` (L26-L41)
- **現象**:
  - `MiniMemoPanel` には時間（`timeStr`）やタグ（`selectedLabels`）を入力する UI が存在しない（メモテキストエリアのみ）。
  - しかし保存時に共通フック `useMemoSave` を呼び出すため、もし `mode === 'EVENT'` の状態でミニパネルから保存しようとすると、`getValidationError({ ...state, phase: 0 })` の時間バリデーションで弾かれ、保存できない。
- **対策**:
  - ミニモード保存時は強制的に `MATCH` モードとして扱うか、動画要素から現在の再生時刻（再生秒数）を自動抽出し、デフォルトラベルを付与して保存を完結させる仕様に統一する。

### ④ Biome Lint / Formatter エラー・警告 (重要度: 中)
- **現象**:
  - `bunx biome check extension` で **2 エラー / 25 警告** が検出。
    - `extension/entrypoints/background.ts`: フォーマット不整合
    - `extension/entrypoints/overlay.content.tsx`: import 順序不整合 (`organizeImports`)
    - テストおよびフック内での `any` 型使用 (`noExplicitAny` 違反)

### ⑤ Windows WSL 固有パスのハードコード (環境依存バグ: 低)
- **対象ファイル**:
  - `extension/package.json` (L11)
- **現象**:
  - `postbuild` スクリプトで `/mnt/c/Users/nowat/extensions/$npm_package_name/` がハードコードされており、別マシンや Linux/CI 環境での `bun run build` が失敗する。

---

## 2. 推奨される着手順序

1. **テスト環境の修正と整備 (最優先)**
   - `BroadcastChannel` のモックをクラスベースに修正。
   - `extension/package.json` に明確な test スクリプト（`vitest run extension` 等）を定義。
2. **MiniMemoPanel の保存ロジック仕様整理**
   - ミニモード時の EVENT メモ保存ハンドリングの改善（時間自動補完または MATCH 固定）。
3. **Biome のリント・フォーマット適用**
   - `bunx biome check --write extension` の実行と、明示的な型定義への修正。
4. **ビルドスクリプトの可搬性確保**
   - `sync-extension` をオプショナルなスクリプトまたは環境変数参照に変更。
