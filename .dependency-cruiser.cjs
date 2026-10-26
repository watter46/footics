/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-src-to-extension',
      comment:
        'Web (src/) から Extension (extension/) への逆方向依存は禁止です (一方向依存: extension -> src)。',
      severity: 'error',
      from: { path: '^src/' },
      to: { path: '^extension/' },
    },
    {
      name: 'no-level1-ui-to-domain',
      comment:
        'Level 1 Primitive (src/components/ui/) から Feature 層や DB 層への依存は禁止です。',
      severity: 'error',
      from: { path: '^src/components/ui/' },
      to: { path: '^src/(features|lib/db)/' },
    },
    {
      name: 'no-level2-core-to-host-or-singleton',
      comment:
        'Level 2 共用キャンバスコア (tactical-unified/core/) から Extension, DB, またはシングルトンストアへの直接依存は禁止です。',
      severity: 'error',
      from: {
        path: '^src/features/tactical-unified/core/',
        pathNot: '\\.(test|spec)\\.[tj]sx?$',
      },
      to: {
        path: '(^extension/|^src/lib/db/|tactical-unified-store)',
      },
    },
    {
      name: 'no-component-direct-db-access',
      comment:
        'UI コンポーネントから src/lib/db への直接アクセスは禁止です。カスタムフック (useQuery / useMutation) またはサービス層を経由してください。',
      severity: 'error',
      from: {
        path: '^src/(components|features/[^/]+/(components|panels))/',
        pathNot: ['\\.(test|spec)\\.[tj]sx?$'],
      },
      to: {
        path: '^src/lib/db/',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
  },
};
