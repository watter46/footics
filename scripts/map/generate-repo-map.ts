import { execSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

// 除外ディレクトリ・ファイル名の正規表現
const IGNORE_PATTERNS = [
  /^\.git\b/,
  /^\.cache\b/,
  /\.agents\/\.cache/,
  /^node_modules\b/,
  /^dist\b/,
  /^build\b/,
  /\.next\b/,
  /\.test\.[tj]sx?$/,
  /\.spec\.[tj]sx?$/,
  /__tests__/,
  /\.lockb?$/,
  /-lock\.json$/,
  /\.(png|jpe?g|gif|ico|svg|webp|mp4|webm|avif|woff2?|ttf|eot)$/i,
  /\.(jsonl|log|map)$/i,
  /\.backup/i,
];

function shouldIgnore(relPath: string): boolean {
  return IGNORE_PATTERNS.some((pattern) => pattern.test(relPath));
}

function getGitFiles(targetDir: string): string[] | null {
  try {
    const raw = execSync('git ls-files -c -o --exclude-standard', {
      cwd: targetDir,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return raw
      .trim()
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !shouldIgnore(line));
  } catch (_e) {
    return null;
  }
}

async function extractSummary(fullPath: string): Promise<string | null> {
  try {
    const content = await readFile(fullPath, 'utf-8');
    const lines = content.split('\n');

    // 1. Frontmatter
    let inFrontmatter = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '---') {
        inFrontmatter = !inFrontmatter;
        continue;
      }
      if (inFrontmatter && trimmed.startsWith('description:')) {
        return trimmed.replace('description:', '').trim();
      }
      if (!inFrontmatter && trimmed !== '') break;
    }

    // 2. 先頭コメント
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '' || trimmed === '---') continue;
      if (trimmed.startsWith('//')) return trimmed.replace(/^\/\/\s*/, '');
      if (trimmed.startsWith('#') && !trimmed.startsWith('#!')) {
        return trimmed.replace(/^#\s*/, '');
      }
      if (trimmed.startsWith('/*')) {
        const match = trimmed.match(/\/\*\s*(.*?)\s*(\*\/)?$/);
        if (match && match[1]) return match[1];
      }
      break;
    }

    // 3. export シンボル
    const ext = extname(fullPath);
    if (['.ts', '.js', '.tsx', '.jsx'].includes(ext)) {
      const exports: string[] = [];
      const exportRegex =
        /^export\s+(?:const|let|var|function|class|interface|type)\s+([a-zA-Z0-9_]+)/;
      for (const line of lines) {
        const match = line.match(exportRegex);
        if (match && match[1]) {
          exports.push(match[1]);
        } else if (line.match(/^export\s+default\s+([^;\s]+)/)) {
          const m = line.match(/^export\s+default\s+([^;\s]+)/);
          if (m && m[1]) exports.push(`default(${m[1]})`);
        } else if (line.match(/^export\s*\{/)) {
          const m = line.match(/export\s*\{([^}]+)\}/);
          if (m && m[1]) {
            exports.push(
              ...m[1]
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            );
          }
        }
      }
      if (exports.length > 0) {
        const unique = Array.from(new Set(exports));
        return `exports: ${unique.slice(0, 8).join(', ')}${unique.length > 8 ? '...' : ''}`;
      }
    }

    return null;
  } catch (_e) {
    return null;
  }
}

function buildSummaryText(relFiles: string[]): string {
  // ディレクトリごとのファイル集計
  const featureDirs = new Set<string>();
  const libDirs = new Set<string>();

  for (const f of relFiles) {
    if (f.startsWith('src/features/')) {
      const parts = f.split('/');
      if (parts[2]) featureDirs.add(parts[2]);
    } else if (f.startsWith('src/lib/')) {
      const parts = f.split('/');
      if (parts[2]) libDirs.add(parts[2]);
    }
  }

  return `# Footics Architecture & High-Level Summary
Total Tracked Files: ${relFiles.length}

## Core Tech Stack
- Next.js (App Router), React 19, Tailwind CSS v4, Biome v2
- State & Data: Dexie v4 (IndexedDB Local-first), Zustand v5, TanStack Query
- Canvas: Konva 10 + react-konva (Tactical Board)
- Runtime & Tools: Bun, Vitest, Playwright, rtk, ast-grep

## Directory Structure & Responsibilities
- src/features/: Domain feature modules
  Modules: ${Array.from(featureDirs).sort().join(', ')}
- src/lib/: Core infrastructure & domain libraries
  Subsystems: ${Array.from(libDirs).sort().join(', ')}
  - src/lib/db/: Dexie schema & IndexedDB repositories (schema.ts)
  - src/lib/tactical/: Pitch geometry, easing, bezier trajectory, video export
- src/stores/: Zustand global state slices (pilotStore, ui-store, syntax-studio-store)
- extension/: Chrome extension (WXT framework, overlay & background scripts)
- scripts/: Developer verification, linting, map generation, AST tooling
- .agents/: Agent framework (rules, hooks, guards, worker/reviewer validators)
- tests/: Benchmark fixtures and E2E specs

## Verification & Execution Protocol
1. Exploration: Read this file first. Use 'rtk grep <term> .agents/.cache/repo_map.txt' for symbol lookup.
2. Scoped Check: 'bun run lint [path]', 'bun run typecheck [path]', 'bun run check [path]'.
3. Worker Loop: 'bun run agent:check-worker <files>'.
4. Preflight: 'bun run agent:preflight' (strictly before git commit).
5. Full Check: 'bun run check:all' (ONLY when explicitly instructed by user).
`;
}

async function main() {
  const inputDir = process.argv[2] ? resolve(process.argv[2]) : process.cwd();
  let targetDir = inputDir;

  try {
    const gitRoot = execSync('git rev-parse --show-toplevel', {
      cwd: inputDir,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (gitRoot) targetDir = gitRoot;
  } catch (_e) {}

  console.log(`[RepoMap] Target directory: ${targetDir}`);

  const relFiles = getGitFiles(targetDir);
  if (!relFiles) {
    console.error('[RepoMap] Failed to list git files.');
    process.exit(1);
  }

  // 1. 詳細マップ (repo_map.txt) の生成
  const mapLines: string[] = [];
  for (const relPath of relFiles) {
    const fullPath = join(targetDir, relPath);
    const summary = await extractSummary(fullPath);
    if (summary) {
      mapLines.push(`${relPath}: ${summary}`);
    } else {
      mapLines.push(relPath);
    }
  }
  mapLines.sort();

  const cacheDir = join(targetDir, '.agents', '.cache');
  await mkdir(cacheDir, { recursive: true });

  const outMapPath = join(cacheDir, 'repo_map.txt');
  await writeFile(outMapPath, `${mapLines.join('\n')}\n`);
  console.log(
    `[RepoMap] Generated detailed map: ${outMapPath} (${mapLines.length} files)`,
  );

  // 2. 高レベルサマリ (repo_summary.txt) の生成
  const summaryText = buildSummaryText(relFiles);
  const outSummaryPath = join(cacheDir, 'repo_summary.txt');
  await writeFile(outSummaryPath, summaryText);
  const lineCount = summaryText.split('\n').length;
  console.log(
    `[RepoMap] Generated high-level summary: ${outSummaryPath} (${lineCount} lines)`,
  );
}

main().catch(console.error);
