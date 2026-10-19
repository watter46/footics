import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export function findSymbolsInMap(
  mapContent: string,
  query: string,
  maxResults = 30,
): string[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const lowerQuery = trimmedQuery.toLowerCase();
  const lines = mapContent.split('\n');

  interface MatchItem {
    line: string;
    score: number;
  }

  const matches: MatchItem[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const lowerLine = line.toLowerCase();
    if (!lowerLine.includes(lowerQuery)) continue;

    let score = 1;

    // exports 部分の解析
    const exportsIndex = line.indexOf('exports:');
    if (exportsIndex !== -1) {
      const exportsPart = line.slice(exportsIndex + 8);
      const symbols = exportsPart
        .split(',')
        .map((s) => s.trim().replace(/\.\.\.$/, ''));

      // 完全一致するシンボルがあれば最優先
      const exactMatch = symbols.some(
        (s) => s.toLowerCase() === lowerQuery || s === trimmedQuery,
      );
      if (exactMatch) {
        score = 3;
      } else if (exportsPart.toLowerCase().includes(lowerQuery)) {
        score = 2;
      }
    }

    matches.push({ line, score });
  }

  // スコア降順、同スコアは行の辞書順
  matches.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.line.localeCompare(b.line);
  });

  return matches.slice(0, maxResults).map((m) => m.line);
}

function runCli() {
  const query = process.argv[2]?.trim();
  if (!query || query.startsWith('-')) {
    console.error('Usage: bun run ai:find <symbol-or-keyword>');
    console.error('Example: bun run ai:find useChelseaSquad');
    process.exit(1);
  }

  const repoRoot = process.cwd();
  const mapPath = join(repoRoot, '.agents', '.cache', 'repo_map.txt');

  if (!existsSync(mapPath)) {
    console.log('[ai:find] repo_map.txt not found. Generating index first...');
    try {
      execSync('bun scripts/map/generate-repo-map.ts', {
        cwd: repoRoot,
        stdio: 'inherit',
      });
    } catch (e) {
      console.error('[ai:find] Failed to generate repo_map.txt:', e);
      process.exit(1);
    }
  }

  const content = readFileSync(mapPath, 'utf-8');
  const results = findSymbolsInMap(content, query);

  if (results.length === 0) {
    console.log(`[ai:find] No matches found for '${query}' in repo_map.txt`);
    console.log(
      'Hint: Check spelling, try a broader keyword, or run "bun run map" if files were recently added.',
    );
    process.exit(0);
  }

  console.log(
    `[ai:find] Found ${results.length} match${results.length === 1 ? '' : 'es'} for '${query}':\n`,
  );
  for (const line of results) {
    console.log(`  ${line}`);
  }

  // 1件〜3件程度の場合、次のアクション（outline）をガイド
  const rawFile = results[0]?.split(':')[0]?.trim();
  const firstFile = rawFile?.replace(/\s*\[\d+L\]$/, '').trim();
  if (firstFile) {
    console.log('\nSuggested Next Step:');
    console.log(`  bun run ai:outline ${firstFile}`);
  }
}

if (import.meta.main) {
  runCli();
}
