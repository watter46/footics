# Next.js 開発用Dockerfile (Node.js 24 LTS)
FROM node:24-slim AS development

WORKDIR /src

# 開発に便利なツールのインストール（最小限）
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# pnpmのインストール
RUN npm install -g pnpm

# 依存関係用ファイルをコピー
COPY package.json pnpm-lock.yaml ./

# 依存関係インストール
RUN pnpm install

# アプリケーションのソースをコピー
COPY . .

EXPOSE 3000

CMD ["pnpm", "dev"]
