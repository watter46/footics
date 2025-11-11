import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import tailwindPlugin from 'eslint-plugin-tailwindcss';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  // グローバルイグノア設定
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/out/**',
      '**/dist/**',
      '**/build/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/.cache/**',
      '**/public/**',
      '.pnpm-store/',

      // 環境設定
      '.devcontainer/',
      'docker/',

      // ドキュメント・その他
      'cfc/',
      'docs/',

      // ルートの設定ファイル
      'Makefile',
      'components.json',
      'next.config.ts',
      'pnpm-workspace.yaml',
      'tsconfig.tsbuildinfo',
      'README.md',
      'compose.yml',
      'eslint.config.mjs', // このファイル自体
      'package.json',
      'postcss.config.mjs',
      'next-env.d.ts',
      'pnpm-lock.yaml',
      'tsconfig.json',
    ],
  },

  // 基本設定
  js.configs.recommended,

  // TypeScript設定（typescript-eslint v8の推奨設定）
  ...tseslint.configs.recommended,

  // Next.js公式設定（互換レイヤー使用）
  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  // React 19設定
  {
    files: ['**/*.jsx', '**/*.tsx'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      'react/react-in-jsx-scope': 'off', // Next.jsでは不要
      'react/prop-types': 'off', // TypeScriptを使用
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // アクセシビリティ設定
  {
    files: ['**/*.jsx', '**/*.tsx'],
    plugins: {
      'jsx-a11y': jsxA11yPlugin,
    },
    rules: {
      ...jsxA11yPlugin.configs.recommended.rules,
    },
  },

  // Tailwind CSS設定
  {
    files: ['**/*.jsx', '**/*.tsx'],
    plugins: {
      tailwindcss: tailwindPlugin,
    },
    rules: {
      'tailwindcss/classnames-order': 'warn',
      'tailwindcss/no-custom-classname': 'off',
      'tailwindcss/no-contradicting-classname': 'error',
    },
    settings: {
      tailwindcss: {
        callees: ['cn', 'clsx', 'tailwind-merge'],
        config: 'tailwind.config.ts',
      },
    },
  },

  // TypeScriptカスタムルール
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
    },
  },

  // 一般的なルール
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'warn',
      'no-var': 'error',
    },
  },
];
