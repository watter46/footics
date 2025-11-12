// @ts-check

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import tseslint from 'typescript-eslint'; // tseslint.defineConfig をインポート
import nextPlugin from '@next/eslint-plugin-next';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import tailwind from "eslint-plugin-tailwindcss";
import prettierConfig from 'eslint-config-prettier';
import { fixupPluginRules } from '@eslint/compat';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const tailwindConfigPath = path.resolve(currentDir, 'src/app/globals.css');

export default tseslint.config(
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
      '.devcontainer/',
      'docker/',
      'cfc/',
      'docs/',
      'Makefile',
      'components.json',
      'pnpm-workspace.yaml',
      'tsconfig.tsbuildinfo',
      'README.md',
      'compose.yml',
      'next-env.d.ts',
      'pnpm-lock.yaml',
      'next.config.ts',
      'package.json',
      'postcss.config.mjs',
      'tsconfig.json',
      'eslint.config.mjs',
      'eslint-env.d.ts',
    ],
  },

  // 2. 基本設定 (ESLint + TypeScript)
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 3. React 19 + Hooks
  {
    files: ['**/*.jsx', '**/*.tsx'],
    ...reactPlugin.configs.flat.recommended,
    settings: {
      react: {
        version: '19.2.0',
      },
    },
    rules: {
      ...reactPlugin.configs.flat.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      'react/prop-types': 'off',
    },
  },
  {
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
    plugins: {
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
    },
  },

  // 4. React Fast Refresh
  {
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
    plugins: {
      'react-refresh': fixupPluginRules(reactRefreshPlugin),
    },
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },

  // 5. Next.js
  {
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
    ...nextPlugin.configs.recommended,
    ...nextPlugin.configs['core-web-vitals'],
  },

  // 6. アクセシビリティ (jsx-a11y)
  {
    files: ['**/*.jsx', '**/*.tsx'],
    plugins: {
      'jsx-a11y': jsxA11yPlugin,
    },
    rules: {
      ...jsxA11yPlugin.configs.recommended.rules,
    },
  },

  // 7. Tailwind CSS
  ...tailwind.configs["flat/recommended"],
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'tailwindcss/classnames-order': 'warn',
      'tailwindcss/no-custom-classname': 'off',
      'tailwindcss/no-contradicting-classname': 'error',
    },
    settings: {
      tailwindcss: {
        callees: ['cn', 'clsx', 'tailwind-merge'],
        config: tailwindConfigPath,
      },
    },
  },

  // 8. ユーザー定義のカスタムルール (TypeScript)
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

  // 9. ユーザー定義の一般ルール (グローバル)
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'warn',
      'no-var': 'error',
    },
  },

  // 10. Prettier (必ず最後に)
  prettierConfig,
);
