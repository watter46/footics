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
  tickets.push({
    file,
    id: meta.id || path.basename(file, '.md'),
    title: meta.title || '(No title)',
    status: meta.status || 'TODO',
    depends_on: meta.depends_on || [],
    model: meta.model || 'Gemini 3.8 Flash',
    effort: meta.effort || 'low',
  });
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

if (todoTickets.length > 0) {
  console.log('--- 未完了チケット (Pending Tasks) ---');
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
}

if (doneTickets.length > 0) {
  console.log('--- 完了済みチケット (Completed Tasks) ---');
  for (const t of doneTickets) {
    console.log(`✅ ${t.id.padEnd(16)} | [DONE ] | ${t.title}`);
  }
  console.log('');
}
