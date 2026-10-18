# 別コンテキスト（チャット）からエージェント実行ログを参照・調査する方法

Antigravity（Gemini CLI / IDE）では、すべてのチャットセッションの行動履歴・思考プロセス・ツール呼び出し・入出力が、ローカルファイルシステム上にリアルタイムで永続化されています。

これを利用することで、**「現在進行中のチャットのコンテキスト（トークン）を一切汚さずに、別チャットから過去のセッションを客観的にデバッグ・分析する」** ことが可能です。

---

## 1. ログの保存場所と構造

すべての会話ログは以下のディレクトリに格納されています：

```
~/.gemini/antigravity-cli/brain/<conversation-id>/
├── .system_generated/
│   ├── logs/
│   │   ├── transcript.jsonl        # 各ステップの行動・ツール実行・思考の要約ログ (JSONL形式)
│   │   └── transcript_full.jsonl   # 切り捨てなしの完全ログ
│   └── steps/                      # ツールごとの詳細な実行結果テキスト
├── docs-xxx.md                     # 生成された Artifact (計画書やレポート等)
└── scratch/                        # 一時ファイル
```

* `<conversation-id>`: 各チャットごとに一意に割り振られる UUID（例: `5515d0e6-aec1-48a5-ad28-998b49654e95`）。

---

## 2. Conversation ID の特定方法

過去のセッションIDは、以下のいずれかの方法で特定できます。

### 方法A: ディレクトリの更新日時から最新順に探す (推奨)
直近で実行したチャットの ID を知りたい場合、ターミナルで以下を実行します：
```bash
rtk run "ls -lt ~/.gemini/antigravity-cli/brain/ | head -n 6"
```

### 方法B: チャットのURLから確認する
Antigravity IDE / ブラウザでチャットを開いている場合、URLの末尾に含まれる文字列がそのまま Conversation ID になっています。

---

## 3. 別チャットからログを調査する実用コマンド集

エージェントに直接実行させるか、ターミナルで実行して確認できます。

### ① どんなプロンプトで開始されたセッションか確認する
```bash
rtk run "head -n 1 ~/.gemini/antigravity-cli/brain/<ID>/.system_generated/logs/transcript.jsonl | jq -r .content"
```

### ② ツール呼び出し（実行コマンドや開いたファイル）の履歴を一覧化する
エージェントが何を実行したかを一目瞭然にするコマンド：
```bash
rtk run "cat ~/.gemini/antigravity-cli/brain/<ID>/.system_generated/logs/transcript.jsonl | jq -r -c 'select(.tool_calls != null and (.tool_calls | length > 0)) | \"[\" + (.step_index|tostring) + \"] \" + .tool_calls[0].name + \": \" + (.tool_calls[0].args.CommandLine // .tool_calls[0].args.AbsolutePath // .tool_calls[0].args.TargetFile // \"\")'"
```

### ③ 特定のコマンドやエラーを検索する
```bash
rtk run "grep -n 'Error' ~/.gemini/antigravity-cli/brain/<ID>/.system_generated/logs/transcript.jsonl"
```

### ④ トークン消費量を確認する
各ステップのコンテキストサイズ（`total_prompt`）、課金対象入力（`input`）、キャッシュヒット（`cache`）、出力（`output`）を集計します。
```bash
rtk run "cat ~/.gemini/antigravity-cli/brain/<ID>/.system_generated/logs/transcript.jsonl | jq -c 'select(.input_tokens != null) | {step: .step_index, total_prompt: (.input_tokens + .cache_read_tokens), input: .input_tokens, cache: .cache_read_tokens, output: .output_tokens}'"
```

---

## 4. エージェントへの指示プロンプト例（活用パターン）

新しいチャットを開いた際、ログをコピペせずに以下のようにプロンプトを投げるだけで、エージェントが自律的に過去の実行を分析してくれます。

### パターン1: 過去チャットの調査・デバッグ
> 「直前のセッション（ID: `<conversation-id>`）でエージェントが迷走してトークンが跳ね上がってしまいました。ログファイルを直接読みに行って原因を調査してください」

### パターン2: 2つのセッションの比較・検証
> 「ID: `<ID-1>`（修正前）と ID: `<ID-2>`（修正後）の `transcript.jsonl` を比較して、ツール呼び出し回数や実行ステップの違いをレポートしてください」

### パターン3: 別チャットで作成した計画書の引き継ぎ
> 「セッション `<conversation-id>` で作成された Artifact（計画書）の内容を読み込んで、このチャットで実装を進めてください」

---

## 5. この手法のメリット
1. **トークンの爆発を防止**: 数万行の実行ログをチャットに貼り付けると、以降の全ターンでその分の入力トークンを消費し続けます。ファイルから直接必要な情報だけを抽出することで、トークン消費を最小限に抑えられます。
2. **完全な客観性**: チャットUI上で省略・丸められたログではなく、実際にモデルが受信した出力やエラーの生データを正確に検証できます。

---

## 6. 主要タスクのセッションログ一覧 (Session Log Registry)

### TASK-002: 共通キャンバス刷新・完全移植 (2026-10-18)
- **親セッション (Planner)**: `3f6a692c-43d4-40cc-bb61-7a06dd66640f`
- **Phase 1 Worker (型定義 & Storeファクトリ)**: `d00ae9a2-9f95-4707-8947-1300e426370f`
- **Phase 2 Worker (ポインタ & 幾何フック)**: `1c0c953e-0d44-4369-86c0-3236bf727b01`
- **Phase 3 Worker (オブジェクト描画レイヤー)**: `ef7996cf-047e-4380-8e0a-4ab3714f18fc`
- **Phase 4 Worker (HUD & インラインエディタ & ツールバー)**: `d08ed682-b71e-4848-ad15-3e6c5eed617e`
- **Phase 5 Worker (CanvasStageContainer & エクスポート)**: `6fa3a630-4d7a-493e-98d7-6c8ba5546194`
- **Phase 6 Worker (Extension結合 & 全体ビルド)**: `c592aba0-5577-4df8-9fcb-1d6e0eb62225`
- **Reviewer (自動検証 & 最終審査 LGTM)**: `c4da4cc4-529c-43a7-acbb-81dd3d53046d`
- **ログパス**: `~/.gemini/antigravity-cli/brain/<ID>/.system_generated/logs/transcript.jsonl`

