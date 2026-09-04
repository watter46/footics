#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { positionals, values } = parseArgs({
  options: {
    type: { type: 'string', short: 't', default: 'component' },
  },
  allowPositionals: true,
});

const type = values.type; // 'component', 'hook', 'feature'
const targetPath = positionals[0];

if (!targetPath) {
  console.error(
    'Usage: node gen-skeleton.mjs [--type|-t component|hook|feature] <path/to/name>',
  );
  process.exit(1);
}

const resolvePath = (p) => path.resolve(process.cwd(), p);
const kebabToPascal = (str) =>
  str
    .split(/[/-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
const kebabToCamel = (str) =>
  str.replace(/-([a-z0-9])/g, (g) => g[1].toUpperCase());

const generateComponent = async (target) => {
  const fullPath = resolvePath(target);
  const dir = path.dirname(fullPath);
  const name = path.basename(target, '.tsx');
  const pascalName = kebabToPascal(name);

  await fs.mkdir(dir, { recursive: true });

  const content = `import React from 'react';

// TODO: Define props
export interface ${pascalName}Props {
  className?: string;
}

/**
 * Skeleton-First Driven Development
 * 
 * ${pascalName} Component
 * Max limit: 200 lines. If this exceeds the limit, split it.
 */
export const ${pascalName} = ({ className }: ${pascalName}Props) => {
  return (
    <div className={className}>
      {/* TODO: Implement ${pascalName} UI */}
    </div>
  );
};
`;

  const filePath = path.join(dir, `${name}.tsx`);
  await fs.writeFile(filePath, content, 'utf-8');
  console.log(`✅ Component skeleton created at: ${filePath}`);
};

const generateHook = async (target) => {
  const fullPath = resolvePath(target);
  const dir = path.dirname(fullPath);
  let name = path.basename(target, '.ts');
  if (!name.startsWith('use-') && !name.startsWith('use')) {
    name = `use-${name}`;
  }
  const camelName = kebabToCamel(name);

  await fs.mkdir(dir, { recursive: true });

  const content = `// TODO: Define options/params
export interface ${camelName.charAt(0).toUpperCase() + camelName.slice(1)}Options {
  // params here
}

/**
 * Skeleton-First Driven Development
 * 
 * ${camelName} Hook
 * Max limit: 150 lines. If this exceeds the limit, split it.
 */
export const ${camelName} = (options?: ${camelName.charAt(0).toUpperCase() + camelName.slice(1)}Options) => {
  // TODO: Implement hook logic

  return {};
};
`;

  const filePath = path.join(dir, `${name}.ts`);
  await fs.writeFile(filePath, content, 'utf-8');
  console.log(`✅ Hook skeleton created at: ${filePath}`);
};

const generateFeature = async (target) => {
  const fullPath = resolvePath(`src/features/${target}`);
  await fs.mkdir(fullPath, { recursive: true });
  await fs.mkdir(path.join(fullPath, 'components'), { recursive: true });
  await fs.mkdir(path.join(fullPath, 'hooks'), { recursive: true });
  await fs.mkdir(path.join(fullPath, 'stores'), { recursive: true });
  await fs.mkdir(path.join(fullPath, 'types'), { recursive: true });

  const indexContent = `// Public API for ${target} feature\nexport * from './components';\nexport * from './hooks';\nexport * from './stores';\nexport * from './types';\n`;

  await fs.writeFile(path.join(fullPath, 'index.ts'), indexContent, 'utf-8');
  await fs.writeFile(
    path.join(fullPath, 'components', 'index.ts'),
    '// Export feature components\n',
    'utf-8',
  );
  await fs.writeFile(
    path.join(fullPath, 'hooks', 'index.ts'),
    '// Export feature hooks\n',
    'utf-8',
  );
  await fs.writeFile(
    path.join(fullPath, 'stores', 'index.ts'),
    '// Export feature stores\n',
    'utf-8',
  );
  await fs.writeFile(
    path.join(fullPath, 'types', 'index.ts'),
    '// Export feature types\n',
    'utf-8',
  );

  console.log(`✅ Feature slice structure created at: ${fullPath}`);
};

async function main() {
  if (type === 'component') await generateComponent(targetPath);
  else if (type === 'hook') await generateHook(targetPath);
  else if (type === 'feature') await generateFeature(targetPath);
  else {
    console.error('Unknown type');
    process.exit(1);
  }
}

main().catch(console.error);
