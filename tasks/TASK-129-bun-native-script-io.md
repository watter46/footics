# TASK-129: スクリプトのBunネイティブI/O高速化

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-01
- **Completed**: 2026-11-01
- **Target Files**:
  - `scripts/map/find-symbol.ts` (MODIFY)
  - `scripts/map/generate-repo-map.ts` (MODIFY)
  - `scripts/lint/check-file-size.ts` (MODIFY)
  - `scripts/task/validate-task.ts` (MODIFY)
  - `scripts/task/new-task.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. `scripts/map/find-symbol.ts` が `fs.readFileSync` の代わりに `Bun.file().text()` を使用し、既存のシンボル検索テストおよびCLI動作を満たすこと
- [x] 2. `scripts/map/generate-repo-map.ts` が `readFile` / `writeFile` の代わりに `Bun.file().text()` / `Bun.write()` を使用し、マップ生成が高速かつ正常に完遂すること
- [x] 3. `scripts/lint/check-file-size.ts` が `fs.readFileSync` の代わりに `Bun.file().text()` を使用し、行数チェック動作を維持すること
- [x] 4. `scripts/task/validate-task.ts` および `scripts/task/new-task.ts` が `Bun.file()` / `Bun.write()` を活用し、`bun test scripts/` が全件合格すること
- [x] 5. Biome Lint・TypeScript型チェック・Preflight検証に合格すること

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Bun Native I/O APIs
```ts
// 読み込み
const file = Bun.file(filePath);
if (await file.exists()) {
  const content = await file.text();
}

// 同期判定が必要な箇所（同期バリデーション等）
import { existsSync } from 'node:fs'; // 必要に応じて併用可

// 書き込み
await Bun.write(targetPath, content);
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: マップ生成・検索スクリプトのBunネイティブ化
- **Worker Model**: `planner`
- **対象ファイル**: `scripts/map/find-symbol.ts`, `scripts/map/generate-repo-map.ts`
- **Tasks**:
  - [x] 1. `scripts/map/find-symbol.ts` を `Bun.file(mapPath).text()` に置換
  - [x] 2. `scripts/map/generate-repo-map.ts` を `Bun.file(fullPath).text()` および `Bun.write(outMapPath, ...)` に置換
  - [x] 3. `bun run map` および `bun run ai:find useChelseaSquad` を実行して動作確認
- **Worker Handoff Log**:
  - `Bun.file().text()` と `Bun.write()` への置換完了。マップ生成・シンボル検索ともに即時完了を確認。

### Phase 2: タスク・リントスクリプトのBunネイティブ化
- **Worker Model**: `planner`
- **対象ファイル**: `scripts/lint/check-file-size.ts`, `scripts/task/validate-task.ts`, `scripts/task/new-task.ts`
- **Tasks**:
  - [x] 1. `scripts/lint/check-file-size.ts` を `Bun.file(filePath).size` による早期判定に最適化
  - [x] 2. `scripts/task/validate-task.ts` の同期I/O安全性を検証
  - [x] 3. `scripts/task/new-task.ts` を `Bun.write(targetPath, template)` に置換
  - [x] 4. `bun test scripts/` を実行して全テスト通過を確認
- **Worker Handoff Log**:
  - `scripts/` 下の23件の単体テストすべて PASS。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `planner`
- **Reviewed At**: 2026-11-01
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 全受入基準を網羅
  - [x] 2. ホスト境界 & Store Provider: スクリプト層のためアプリ境界への影響なし
  - [x] 3. 設計負債 & 拡張性: Bunエコシステムへの標準化と不要なNode API依存の縮小
  - [x] 4. サイレント破壊 & 既存保護: 既存CLI引数および出力フォーマットの維持
- **Summary**:
  - BunネイティブI/Oへの移行完了。既存動作・テストともに100%維持されているため LGTM。

## 6. Rejections / Additional Tasks (不可逆修正欄)
- None.
