import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // DuckDB-Wasm を外部パッケージとして扱い、ビルド時の依存解析から除外する
  serverExternalPackages: ['@duckdb/duckdb-wasm'],


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
      type: 'asset/resource',
    });
    return config;
  },

  turbopack: {
    rules: {
      '*.wasm': {
        loaders: ['@next/swc-loader'],
        as: '*.wasm',
      },
    },
  },
};

export default nextConfig;
