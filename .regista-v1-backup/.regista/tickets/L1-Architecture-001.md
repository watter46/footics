---
status: DONE
id: L1-Architecture-001
emoji: 🔧
title: ExtensionとWebアプリ間の依存関係分離とリファクタリング (本番ビルドエラー修正)
depends_on: []
model: Gemini 3.7 Flash [high]
effort: medium
context_files:
  - extension/entrypoints/content.ts
  - extension/features/storage-sync/save-queue.ts
  - src/lib/db/index.ts
---
status: DONE

# 🔧 L1-Architecture-001: ExtensionとWebアプリ間の依存関係分離とリファクタリング (本番ビルドエラー修正)

## UX Impact
本番環境の拡張機能で発生している `lt is not a function` クラッシュを解消し、Web・Extension間のデータ保存機能が安定して動作するようにする。

## Detailed Spec
1. **依存関係の分離**: `extension/features/storage-sync/save-queue.ts` などから `src/lib/db/index.ts` への直接インポートを削除する。現状 `index.ts` を経由することで、`JSZip` の動的インポートや Web 専用の不要なモジュール（Zustand フックや DOM アクセスコードなど）が Content Script にバンドルされ、Terser の minify やトップレベルのモジュール初期化時にエラー（循環参照や名前解決エラー）を引き起こしている可能性が高い。
2. **軽量アクセスレイヤーの構築またはメッセージングへの完全委譲**: 
   - 案A: Extension が Dexie に直接アクセスする必要がある場合、Web 側の不要なロジックを含まない `src/lib/db/schema.ts` などのみの最小限のインポートに留め、保存関数を Extension 内で再定義するか、Extension 専用の DB ファイル（例: `src/lib/db/extension-db-queries.ts`）を新設する。
   - 案B: DB への直接アクセスをやめ、Web 側のページが存在する場合は常に `window.postMessage` 経由で Web 側に保存を委譲する。
3. **安全なビルドの確認**: 上記の修正により、`wxt build` 時に Web 専用の不要なモジュールが Content Script 側に含まれなくなることを確認する。

## Acceptance Criteria & Verification Commands
- [ ] Extension 側のコードから `src/lib/db/index.ts` (および `export.ts`, `tactical-projects-db.ts` 等) への直接依存が排除されていること。
- [ ] `rtk pnpm build` (wxt build) が成功し、本番環境 (あるいは minify ビルド) で Content Script ロード時にクラッシュが発生しないこと。
- [ ] 拡張機能からのイベント保存キュー（`save-queue.ts`）が引き続き正常に処理されること。

### Verification
`rtk biome check extension/features/storage-sync/save-queue.ts`
`rtk pnpm type-check:scoped extension/features/storage-sync/save-queue.ts`
`rtk pnpm build` # 拡張機能のビルド
