# Tavily (MCP)

## 目的

Tavily MCP Server を介して、Web検索、抽出（Extraction）、マッピング、クローリング、および詳細リサーチを行います。
特に `tavily_map` によるサイト構造の把握と、`tavily_extract` によるコンテンツ取得を組み合わせた「リサーチワークフロー」の基盤として機能します。

## 使用ケース

- **サイト構造の把握**: `tavily_map` を使用して、ドキュメントサイト等の URL リストを高速に取得します。
- **コンテンツの一括抽出**: `tavily_extract` を使用して、複数の URL から Markdown 形式でテキスト情報を取得します。
- **最新情報の検索**: `tavily_search` を使用して、学習データに含まれない最新の技術トレンドやライブラリ仕様を確認します。
- **自律的リサーチ**: `tavily_research` を使用して、特定の技術トピックに対する深い調査レポートを生成します。

## セットアップ

このスキルを使用する前に、MCP サーバーを起動する必要があります。

```bash
# 事前に .env.mcp に TAVILY_API_KEY を設定してください
. .agent/skills/tavily\ /scripts/start-tavily-mcp.sh
```

## 利用可能なツール (MCP)

エージェントは以下のツールを直接呼び出すことができます。

### 1. `tavily_search`
Web検索を実行します。
- `query`: 検索クエリ
- `search_depth`: `basic` | `advanced`
- `include_answer`: 推論に基づいた直接的な回答を含むか

### 2. `tavily_map`
サイトマップ（URLのリスト）を生成します。
- `url`: 開始URL
- `max_depth`: 探索の深さ（デフォルト 1, 最大 5）
- `limit`: 取得するURLの最大数

### 3. `tavily_extract`
指定した URL 群からコンテンツを抽出します。
- `urls`: URLの配列
- `include_images`: 画像情報を含めるか

### 4. `tavily_crawl`
サイトを巡回しながらコンテンツを抽出します。

### 5. `tavily_research`
多段階の推論を伴う詳細なリサーチを実行します。

## 推奨ワークフロー

1. **Mapping**: `tavily_map` で `https://antigravity.codes/rules` などの一覧を取得。
2. **Filtering**: 取得した URL リストから、今回のタスクに関連するものを選択。
3. **Extraction**: `tavily_extract` で選択した URL から内容を取得。
4. **Scraping (fallback)**: `tavily_extract` で情報が不十分な場合のみ `agent-browser` サブエージェントを使用。

## エラーハンドリング
- `401 Unauthorized`: `.env.mcp` の API キーを確認してください。
- タイムアウト: `max_depth` や `limit` を小さく設定してください。