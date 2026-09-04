const fs = require('node:fs');
const path = require('node:path');

const TICKETS_DIR = path.join(__dirname, '../../.regista/tickets');

if (!fs.existsSync(TICKETS_DIR)) {
  console.log('No tickets directory found at .regista/tickets');
  process.exit(0);
}

const files = fs.readdirSync(TICKETS_DIR).filter((f) => f.endsWith('.md'));

if (files.length === 0) {
  console.log('No tickets found in .regista/tickets');
  process.exit(0);
}

function parseYamlFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const yamlText = match[1];
  const data = {};

  for (const line of yamlText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;
    const key = trimmed.slice(0, colonIndex).trim();
    let val = trimmed.slice(colonIndex + 1).trim();
    // remove quotes
    val = val.replace(/^["'](.*)["']$/, '$1');
    if (val.startsWith('[') && val.endsWith(']')) {
      const arrayItems = val
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["'](.*)["']$/, '$1'))
        .filter(Boolean);
      data[key] = arrayItems;
    } else {
      data[key] = val;
    }
  }
  return data;
}

const tickets = [];

for (const file of files) {
  const filePath = path.join(TICKETS_DIR, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const meta = parseYamlFrontmatter(content);
  const stat = fs.statSync(filePath);
  tickets.push({
    file,
    id: meta.id || path.basename(file, '.md'),
    title: meta.title || '(No title)',
    status: meta.status || 'TODO',
    depends_on: meta.depends_on || [],
    model: meta.model || 'Gemini 3.8 Flash',
    effort: meta.effort || 'low',
    mtime: stat.mtimeMs,
  });
}

// CLI引数のパース
let showTodo = true;
let showDone = true;
let doneLimit = 5;
const args = process.argv.slice(2);

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--all' || arg === '-a') {
    doneLimit = Infinity;
  } else if (arg === '--todo' || arg === '--pending' || arg === '-t') {
    showDone = false;
  } else if (arg === '--done-only' || arg === '-d') {
    showTodo = false;
  } else if (arg.startsWith('--done=')) {
    const val = arg.split('=')[1];
    if (val === 'all') {
      doneLimit = Infinity;
    } else {
      const parsed = parseInt(val, 10);
      doneLimit = isNaN(parsed) ? 5 : parsed;
    }
  } else if (arg === '--done' && args[i + 1] !== undefined) {
    const val = args[++i];
    if (val === 'all') {
      doneLimit = Infinity;
    } else {
      const parsed = parseInt(val, 10);
      doneLimit = isNaN(parsed) ? 5 : parsed;
    }
  }
}

// 完了チケットのID一覧
const completedIds = new Set(
  tickets.filter((t) => t.status === 'DONE').map((t) => t.id),
);

// レイヤー順・ID順でソート
tickets.sort((a, b) => a.id.localeCompare(b.id));

console.log('\n📋 [Regista Tickets Dashboard]\n');

const todoTickets = tickets.filter((t) => t.status !== 'DONE');
const doneTickets = tickets.filter((t) => t.status === 'DONE');

if (showTodo) {
  if (todoTickets.length > 0) {
    console.log(`--- 未完了チケット (Pending Tasks: ${todoTickets.length}件) ---`);
    for (const t of todoTickets) {
      const isL1 = t.id.startsWith('L1');
      const blocked =
        Array.isArray(t.depends_on) &&
        t.depends_on.some((dep) => !completedIds.has(dep));

      let badge = '🟢';
      let readyText = '即時着手可能';
      if (
        blocked ||
        (!isL1 &&
          t.depends_on.length > 0 &&
          t.depends_on.some((dep) => !completedIds.has(dep)))
      ) {
        badge = '🟡';
        readyText = `待機中 (依存: ${t.depends_on.join(', ')})`;
      } else if (!isL1 && t.depends_on.length === 0) {
        badge = '🟢';
        readyText = '着手可能';
      }

      console.log(
        `${badge} ${t.id.padEnd(16)} | [${t.status.padEnd(5)}] | ${t.title}`,
      );
      console.log(`   └─ 状態: ${readyText} | 推奨: ${t.model} (${t.effort})`);
      console.log(`   └─ パス: .regista/tickets/${t.file}\n`);
    }
  } else {
    console.log('--- 未完了チケット (Pending Tasks) ---');
    console.log('✨ 未完了のチケットはありません（すべて完了）\n');
  }
}

if (showDone && doneLimit > 0 && doneTickets.length > 0) {
  // mtime 降順で最新N件を取得し、表示用にID昇順へ戻す
  const sortedDoneByMtime = [...doneTickets].sort((a, b) => b.mtime - a.mtime);
  const recentDone = sortedDoneByMtime.slice(0, doneLimit);
  recentDone.sort((a, b) => a.id.localeCompare(b.id));

  const hiddenCount = doneTickets.length - recentDone.length;
  const countLabel =
    hiddenCount > 0
      ? ` (${doneTickets.length}件中 最新${recentDone.length}件表示)`
      : ` (${doneTickets.length}件)`;

  console.log(`--- 完了済みチケット (Completed Tasks${countLabel}) ---`);
  for (const t of recentDone) {
    console.log(`✅ ${t.id.padEnd(16)} | [DONE ] | ${t.title}`);
  }
  if (hiddenCount > 0) {
    console.log(
      `   ... 他 ${hiddenCount} 件の完了済みチケット (全表示: pnpm tickets --all または pnpm tickets --done 10)`,
    );
  }
  console.log('');
}
