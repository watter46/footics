---
name: rtk-guide
description: Regista組織向けRTK (Regista Toolkit) 逆引きリファレンス・コマンドガイド。トークン消費を最小化し、エージェントの内蔵ツールへの誤ったフォールバックを防ぐためのベストプラクティス。
---

# RTK (Regista Toolkit) ガイド & 逆引きリファレンス

Registaエージェントがコマンド実行やファイル・ディレクトリ調査を行う際は、コンテキストの肥大化を防ぎトークン消費を最小化するため、**必ず `rtk` (Regista Toolkit) 経由** で実行すること。

---

## 1. 目的別 逆引きコマンド早見表

| やりたいこと | 推奨コマンド | 避けるべきアンチパターン（禁止） |
| :--- | :--- | :--- |
| **ファイル本文の精読** | `rtk read <file>` | 内蔵 `view_file`（全行・広域）、生の `cat` |
| **ファイルの構造・概要把握** | `rtk smart <file>` | `view_file` での全体読み込み |
| **ディレクトリ配下の確認** | `rtk ls <dir>` または `rtk tree <dir>` | `rtk find <dir>/`（0件になりやすい）、内蔵 `find_by_name` |
| **特定パターンのファイル検索** | `rtk find <dir> -name "<pattern>"` | 内蔵 `find_by_name`（プロジェクト全域検索） |
| **ファイル内の文字列検索** | `rtk grep "<query>" <path>` | 内蔵 `grep_search`（プロジェクト全域検索） |
| **JSONの構造・キー確認** | `rtk json --keys-only <file>` | `node -e` ワンライナー、生JSONの全行表示 |
| **変更差分の確認** | `rtk diff` | 生の `git diff`（巨大ログ） |
| **Git状態・履歴確認** | `rtk git status`, `rtk git log -n 5` | 生の `git status`, `git log` |
| **テスト実行（失敗のみ抽出）** | `rtk test vitest run <path>` | 生の `vitest`、`pnpm test` |
| **コマンド実行（エラーのみ抽出）** | `rtk err <command>` | 標準出力が大量に出る生のビルド・検証コマンド |
| **型チェック** | `rtk tsc --noEmit` / `rtk pnpm type-check:scoped` | 生の `tsc` |
| **トークン削減量の確認** | `rtk gain` | - |

---

## 2. ロール別 推奨コマンドマッピング

### ① Scout（探索・調査専門）
* **構造把握**: `rtk ls <dir>`, `rtk tree <dir>`
* **型・スキーマ・Contract確認**: `rtk json --keys-only <file>`
* **ファイル仕様調査**: `rtk smart <file>` → `rtk read <file>`
* **依存関係調査**: `rtk deps`

### ② Worker（実装専門）
* **コード編集直前の行番号ピンポイント確認**: `view_file`（※100行以内のスライス指定必須）
* **実装後の差分セルフチェック**: `rtk diff`
* **単体テスト・検証**: `rtk test vitest run <path>`
* **ビルド検証**: `rtk err pnpm build`

### ③ QA（レビュー・品質保証専門）
* **チケット差分の抽出**: `rtk diff`
* **テスト検証**: `rtk test vitest run <path>`
* **リント・フォーマット検証**: `rtk biome check <path>`

### ④ GM / Valkyrie / オーディン（統括・監査）
* **キャッシュ・Contract確認**: `rtk json <file>`
* **トークン削減効果の計測・監視**: `rtk gain`

---

## 3. よくある失敗（アンチパターン）と回避策

### ❌ `rtk find` で 0 件になり、内蔵 `Find` にフォールバックしてしまう
* **原因**: `rtk find .agents/scripts/` のように、パターンを指定せず末尾スラッシュ付きディレクトリを渡すと 0 件判定になりやすい。
* **回避策**:
  * 単にディレクトリ内の一覧を見たいなら `rtk ls .agents/scripts` または `rtk tree .agents/scripts` を使う。
  * 検索したいなら必ずパターンを指定する: `rtk find .agents/scripts -name "*"`

### ❌ JSONの中身をパースするために `node -e` を多用してしまう
* **原因**: シェル上でJSONを加工しようとしてインラインNodeスクリプトを書いてしまう。
* **回避策**: `rtk json --keys-only <file>` や `rtk json <file>` を活用する。

### ❌ テスト通過時の大量ログでコンテキストを埋めてしまう
* **原因**: 通常の `pnpm vitest run` は成功した数百件のテスト名を出力する。
* **回避策**: `rtk test vitest run <path>` を使用する（失敗したテストのスタックトレースのみが出力される）。
