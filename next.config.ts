import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // DuckDB-WASM: Node.js 固有モジュールのブラウザ向けフォールバック
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    // wasm ファイルを asset/resource として扱う
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    });

    return config;
  },
  // Turbopack 向けの設定（開発モードで使用）
  turbopack: {
    resolveAlias: {
      fs: { browser: "./src/lib/empty.mock.ts" },
      path: { browser: "./src/lib/empty.mock.ts" },
      crypto: { browser: "./src/lib/empty.mock.ts" },
    },
    rules: {
      ".wasm": {
        loaders: [],
        as: "url",
      },
    },
  },
  // DuckDB-WASM の ESM 対応
  transpilePackages: ["@duckdb/duckdb-wasm"],
};

export default nextConfig;
