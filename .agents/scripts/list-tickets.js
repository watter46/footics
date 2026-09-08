const fs = require('node:fs');
const path = require('node:path');
const matter = require('gray-matter');
const { z } = require('zod');

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

const TicketSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().optional(),
    status: z
      .enum(['TODO', 'IN_PROGRESS', 'REVIEW_QA', 'DONE', 'BLOCKED'])
      .default('TODO'),
    depends_on: z.array(z.string()).default([]),
    model: z.string().default('Gemini 3.8 Flash'),
    effort: z.enum(['low', 'medium', 'high']).default('low'),
  })
  .passthrough();

const LAYER_EMOJIS = {
  1: '🔴',
  2: '🟡',
  3: '🟢',
  4: '🔵',
  5: '🟣',
  6: '🟠',
  7: '🟤',
  8: '⚫',
  9: '⚪',
};

function getLayerEmoji(ticketId) {
  const match = ticketId.match(/^L(\d+)/i);
  if (match) {
    const layerNum = parseInt(match[1], 10);
    return LAYER_EMOJIS[layerNum] || '⚪';
  }
  return '📋';
}

function extractUxImpact(body) {
  if (!body) return 'なし';
  const lines = body.split('\n');
  let inUxImpact = false;
  const impactLines = [];

  for (const line of lines) {
    if (line.trim().startsWith('## UX Impact')) {
      inUxImpact = true;
      continue;
    }
    if (inUxImpact && line.trim().startsWith('## ')) {
      break;
    }
    if (inUxImpact) {
      const trimmed = line.trim();
      // HTMLコメント行を除外
      if (trimmed.startsWith('<!--') && trimmed.endsWith('-->')) {
        continue;
      }
      if (trimmed.startsWith('<!--')) {
        continue;
      }
      if (trimmed.endsWith('-->')) {
        continue;
      }
      if (trimmed) {
        impactLines.push(trimmed);
      }
    }
  }

  const result = impactLines.join(' ').replace(/<!--[\s\S]*?-->/g, '').trim();
  return result || 'なし';
}

const tickets = [];

for (const file of files) {
  const filePath = path.join(TICKETS_DIR, file);
  const content = fs.readFileSync(filePath, 'utf-8');

  let meta = {};
  let body = '';
  try {
    const parsed = matter(content);
    meta = parsed.data;
    body = parsed.content;
  } catch (err) {
    console.warn(
      `[WARN] Failed to parse frontmatter in ${file}: ${err.message}`,
    );
  }

  // バリデーション
  const parsedMeta = TicketSchema.safeParse(meta);
  if (!parsedMeta.success) {
    console.warn(`[WARN] Invalid frontmatter in ${file}:`);
    const issues = parsedMeta.error.issues || parsedMeta.error.errors || [];
    issues.forEach((e) => {
      const pathStr = Array.isArray(e.path) ? e.path.join('.') : '';
      console.warn(`  - ${pathStr}: ${e.message}`);
    });
  }

  const validMeta = parsedMeta.success ? parsedMeta.data : meta;
  const stat = fs.statSync(filePath);

  tickets.push({
    file,
    id: validMeta.id || path.basename(file, '.md'),
    title: validMeta.title || '(No title)',
    status: validMeta.status || 'TODO',
    depends_on: Array.isArray(validMeta.depends_on) ? validMeta.depends_on : [],
    model: validMeta.model || 'Gemini 3.8 Flash',
    effort: validMeta.effort || 'low',
    uxImpact: extractUxImpact(body),
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
      doneLimit = Number.isNaN(parsed) ? 5 : parsed;
    }
  } else if (arg === '--done' && args[i + 1] !== undefined) {
    const val = args[++i];
    if (val === 'all') {
      doneLimit = Infinity;
    } else {
      const parsed = parseInt(val, 10);
      doneLimit = Number.isNaN(parsed) ? 5 : parsed;
    }
  }
}

// レイヤー順・ID順でソート
tickets.sort((a, b) => a.id.localeCompare(b.id));

console.log('\n📋 [Regista Tickets Dashboard]\n');

const todoTickets = tickets.filter((t) => t.status !== 'DONE');
const doneTickets = tickets.filter((t) => t.status === 'DONE');

if (showTodo) {
  if (todoTickets.length > 0) {
    console.log(
      `--- 未完了チケット (Pending Tasks: ${todoTickets.length}件) ---\n`,
    );
    for (const t of todoTickets) {
      const emoji = getLayerEmoji(t.id);
      console.log(`[${emoji} ${t.id}]`);
      console.log(`- **タスク名**: ${t.title}`);
      console.log(`- **推奨モデル / Effort**: \`${t.model}\` / \`${t.effort}\``);
      console.log(`- **実装後**: ${t.uxImpact}\n`);
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
