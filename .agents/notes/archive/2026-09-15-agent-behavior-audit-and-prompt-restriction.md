# 📋 エージェント挙動監査ログ & プロンプト制約引き継ぎ書

- **作成日**: 2026-09-15
- **対象タスク**: Extensionの `Alt+S` スクリーンショット不具合の原因調査
- **目的**: 調査タスクにおけるエージェントの過剰なツール実行（不要な全体テスト・過剰なファイル探索）のログ記録と、プロンプトによる行動制限ルールの改定検討

---

## 1. 実際の実行ログ（監査対象）

ユーザーからの「Alt+S でスクリーンショットが取れなくなった原因を探りたい」という質問に対する実際のエージェント内部ログ：

```text
> extensionにてALt+sでスクリーンショットが取れるはずだが取れなくなっている
  この原因を探りたい

● Search(Search Alt+s in extension)
  ⎿  Found 1 results
● Read(~/src/footics/extension/wxt.config.ts)
  ⎿  Read 80 lines
● Search(Search capture-to-tactical in extension)
  ⎿  Found 2 results
● Read(~/src/footics/extension/entrypoints/background.ts)
  ⎿  Read 305 lines
● Find(Find all extension files)
  ⎿  Found 71 matches
● Search(Search TRIGGER_CAPTURE in extension)
  ⎿  Found 3 results
● Read(~/src/footics/extension/entrypoints/overlay.content.tsx)
  ⎿  Read 131 lines
● Read(~/src/footics/extension/features/capture/tactical-bridge.ts)
  ⎿  Read 109 lines
     ▸ Thought for 3s, 705 tokens
● Search(Search defineContentScript in extension)
  ⎿  Found 2 results
● Read(~/src/footics/extension/entrypoints/main-bridge.content.ts)
  ⎿  Read 41 lines
● Search(Search setNamespace in codebase)
  ⎿  Found 1 results
● Search(Search webext-bridge)
  ⎿  Found 10 results
● Read(~/src/footics/extension/types/messaging.ts)
  ⎿  Read 87 lines
● Read(~/src/footics/extension/features/capture/drm-capture-engine.ts)
  ⎿  Read 123 lines
● Read(~/src/footics/extension/features/capture/video-cropper.ts)
  ⎿  Read 173 lines
● Bash(rtk vitest run)  <--- 🚨 問題点1: コード無変更・調査段階での全体テスト実行
  ⎿  <output +69 lines>
     AssertionError: expected ...
     FAIL (12) (※ Webアプリ本体側の無関係なテスト失敗ログ)
● ManageTask(status ...)
● Search(Search TACTICAL_PENDING_CAPTURE in codebase)
  ⎿  Found 6 results
● Search(Search TACTICAL_CAPTURE_RECEIVED in codebase)
  ⎿  Found 7 results
● Read(~/src/footics/src/features/tactical-unified/hooks/use-tactical-capture-bridge.ts)
  ⎿  Read 134 lines
● Read(~/src/footics/extension/features/storage-sync/footics-app-bridge.ts)
  ⎿  Read 188 lines
● Read(~/src/footics/extension/constants/index.ts)
  ⎿  Read 58 lines
● Read(~/src/footics/extension/features/memo-overlay/hooks/use-overlay-shortcut-interceptor.ts)
  ⎿  Read 94 lines
● Search(Search alt+s in repo)
  ⎿  Found 1 results
```

---

## 2. 課題・非効率ポイントの分析

| 課題項目 | 実際に行われた挙動 | 本来あるべき挙動（理想） |
| :--- | :--- | :--- |
| **① テスト実行** | コード変更がない「調査・質問」にもかかわらず `rtk vitest run`（全体テスト600件以上）を実行し、無関係な失敗ログでコンテキストを汚染。 | **調査時はテスト実行を禁止**。検証が必要な場合でも対象ファイル（`rtk vitest run extension` 等）の最小スコープに限定。 |
| **② 探索の深さ** | ショートカット未発火という最上流の問題に対し、下流の「動画切り抜き」「キャンバス描画」「オフライン同期」まで15ファイル以上を無差別に読解。 | **仮説駆動（Hypothesis-Driven）**で設定（`wxt.config.ts`）とハンドラ（`background.ts`）の2ファイルで早期打ち切り（Early Exit）。 |
| **③ 読解の粒度** | 100行超のファイルも先頭から末尾まで全行取得（Full Read）し、トークンを浪費。 | `grep_search` や行番号範囲指定を活用し、必要な関数・ブロックのみを閲覧。 |

---

## 3. プロンプトによる制限ルール（`AGENTS.md` 反映案）

エージェントの自律判断に委ねず、常時プロンプト（`AGENTS.md`）で以下の禁止事項と遵守事項を強制する。

### 規約改定案

```markdown
## 3. 厳格なルールとコマンドラッパー (`rtk`)

- **テスト実行スコープの厳格化（MUST / FORBIDDEN）**:
  - ❌ **引数なしの全体テスト（`rtk vitest run` / `pnpm test` 等）の実行は禁止**。
  - ⭕ 必ず対象ファイルまたは最小ディレクトリ（例: `rtk vitest run path/to/file.test.ts`）を明示すること。
  - ❌ **コード変更を伴わない「原因調査・質問・壁打ち」フェーズでのテスト実行は禁止**（静的読解・コード検索のみで回答する）。
- **探索・読解の最小化（Early Exit）**:
  - 原因調査時は、現象に直結する上位レイヤー（設定・エントリーポイント）から順に確認し、原因候補が挙がった時点で下流の実装詳細（描画・クロップ・UI等）への深追いを打ち切る。
  - 100行を超えるファイルは無闇に全行Readせず、`grep_search` や行数指定（StartLine/EndLine）を活用する。
```

---

## 4. 別チャットでの継続検討アジェンダ

1. **`AGENTS.md` へのルール反映と文言確定**
   * コマンド実行禁止の表現強度（FORBIDDEN / MUST）
   * GMオーケストレーション時とDirectモード時でのテスト実行権限の差分
2. **`safety-guard.js` 等のスクリプト側での自動ブロック検討（補助的ガード）**
   * 引数なしの `vitest run` を検知した場合に即時拒否または警告するラッパーの必要性検証
3. **他エージェント（Worker群）のスキルへの波及**
   * 各Workerスキル（`worker-frontend`, `worker-extension` 等）の検証手順における最小スコープ徹底
