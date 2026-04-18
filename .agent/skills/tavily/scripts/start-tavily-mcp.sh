#!/bin/bash

# 現在のスクリプトがあるディレクトリを取得
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# .agent/skills/tavily /scripts/ から projektu ROOT までは 4階層
# 1: scripts, 2: tavily , 3: skills, 4: .agent
PROJECT_ROOT="$(dirname "$(dirname "$(dirname "$(dirname "$SCRIPT_DIR")")")")"

# .env.mcp ファイルから環境変数を読み込む
if [ -f "$PROJECT_ROOT/.env.mcp" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env.mcp" | xargs)
else
    echo "Error: .env.mcp file not found at $PROJECT_ROOT/.env.mcp"
    exit 1
fi

# APIキーがセットされているか確認
if [ -z "$TAVILY_API_KEY" ] || [ "$TAVILY_API_KEY" == "your_api_key_here" ]; then
    echo "Error: TAVILY_API_KEY is not set or still has the default value in .env.mcp"
    exit 1
fi

# Tavily MCPサーバーを起動
npx -y tavily-mcp@latest
