import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  basePath: import.meta.dirname,
});

const eslintConfig = [
  // core-web-vitals と typescript の設定を互換レイヤー経由で読み込む
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // 追加の無視設定
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", ".open-next/**"],
  },
];

export default eslintConfig;
