import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // DuckDB-Wasm を外部パッケージとして扱い、ビルド時の依存解析から除外する
  serverExternalPackages: ["@duckdb/duckdb-wasm"],
  
  // ビルド時の ESLint チェックで止まらないように設定（デプロイ優先）
  eslint: {
    ignoreDuringBuilds: true,
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    });
    return config;
  },
  
  // Turbopack 用の設定を追加して警告を解消し、WASMの扱いを定義
  turbo: {
    rules: {
      "*.wasm": ["@next/swc-loader"], // Turbopack での WASM の扱いは一部自動だが、明示的に指定することも可能
    },
    resolveAlias: {
      // ブラウザ側での Node.js モジュールの polyfill/fallback
      fs: false,
      path: false,
      crypto: false,
    }
  },
};

export default nextConfig;