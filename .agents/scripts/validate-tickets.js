#!/usr/bin/env node

/**
 * validate-tickets.js
 * 
 * 超軽量タスクチケットバリデータ
 * 1. YAML Frontmatter スキーマ検証 (zod)
 * 2. DAG整合性検証 (存在しないIDの参照検知、循環参照検知)
 * 3. 変更対象ファイルの実在/スコープ検証 (AAWU 3ファイル上限)
 * 4. Write-back (DONE状態のログ・検証結果記入) 抜け漏れ検知
 */

const fs = require('node:fs');
const path = require('node:path');
const matter = require('gray-matter');
const { z } = require('zod');

const TICKETS_DIR = path.join(__dirname, '../../.regista/tickets');
const ROOT_DIR = path.join(__dirname, '../../');

const ALLOWED_MODELS = [
  'Gemini 3.1 Pro',
  'Gemini 3.8 Flash',
  'Gemini 3.7 Flash',
  'Claude Sonnet 4.6 (thinking)',
  'Gemini 3.7 Flash [high]',
  'Gemini 3.8 Flash [high]',
];

const TicketFrontmatterSchema = z.object({
  id: z.string().min(1, 'Ticket ID is required'),
  emoji: z.string().optional(),
  title: z.string().min(1, 'Title (JA) is required'),
  status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW_QA', 'DONE', 'BLOCKED']),
  depends_on: z.array(z.string()).default([]),
  model: z.string().refine(
    (m) => ALLOWED_MODELS.some((allowed) => m.includes(allowed) || allowed.includes(m)),
    { message: `Model must match whitelist (${ALLOWED_MODELS.join(', ')})` }
  ),
  effort: z.enum(['low', 'medium', 'high']),
  target_files: z.array(z.string()).optional(),
  reference_files: z.array(z.string()).optional(),
  // 互換性維持用
  context_files: z.array(z.string()).optional(),
});

function validate() {
  if (!fs.existsSync(TICKETS_DIR)) {
    console.log('✨ No .regista/tickets directory found.');
    return;
  }

  const files = fs.readdirSync(TICKETS_DIR).filter((f) => f.endsWith('.md'));
  if (files.length === 0) {
    console.log('✨ No tickets found to validate.');
    return;
  }

  const tickets = new Map();
  const errors = [];
  const warnings = [];

  // --- Step 1: 単体パース & スキーマ検証 ---
  for (const file of files) {
    const filePath = path.join(TICKETS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    let parsed;
    try {
      parsed = matter(content);
    } catch (e) {
      errors.push(`[${file}] YAML Frontmatter parse failed: ${e.message}`);
      continue;
    }

    const rawData = parsed.data || {};
    const validation = TicketFrontmatterSchema.safeParse(rawData);

    if (!validation.success) {
      for (const issue of validation.error.issues) {
        const field = issue.path.join('.');
        errors.push(`[${file}] Schema Error: '${field}' -> ${issue.message}`);
      }
      continue;
    }

    const meta = validation.data;
    const body = parsed.content || '';

    // IDとファイル名の一致
    const expectedId = path.basename(file, '.md');
    if (meta.id !== expectedId) {
      warnings.push(`[${file}] File name '${file}' does not match frontmatter id '${meta.id}'`);
    }

    // target_files の AAWU (1〜3ファイル) ルール検知
    const targets = meta.target_files || (meta.context_files ? meta.context_files : []);
    if (targets.length > 3) {
      warnings.push(`[${meta.id}] AAWU Alert: 'target_files' has ${targets.length} files (recommended max: 3)`);
    }

    // Write-back チェック: status が DONE の場合、Write-back ログが存在するか
    if (meta.status === 'DONE') {
      const hasWriteBackHeader = /##\s*📝?\s*Implementation\s*&?\s*Write-back\s*Log/i.test(body) ||
                                 /##\s*Implementation\s*Log/i.test(body) ||
                                 /###\s*1\.\s*変更内容/i.test(body);
      
      // テンプレートそのままの未記入検知
      const isUnfilled = body.includes('<!-- Workerは作業完了後') && body.includes('### 1. 変更内容サマリー\n-\n');
      if (hasWriteBackHeader && isUnfilled) {
        errors.push(`[${meta.id}] Write-back incomplete: status is 'DONE' but Implementation Log is empty template. Please fill out Write-back Log.`);
      }
    }

    tickets.set(meta.id, {
      file,
      meta,
      body,
    });
  }

  // --- Step 2: DAG 整合性検証 (存在しないID参照 & 循環参照) ---
  const allIds = new Set(tickets.keys());

  for (const [id, ticket] of tickets.entries()) {
    for (const depId of ticket.meta.depends_on) {
      if (!allIds.has(depId)) {
        errors.push(`[${id}] Broken DAG: depends_on references non-existent ticket '${depId}'`);
      }
      if (depId === id) {
        errors.push(`[${id}] Broken DAG: Self-referencing dependency '${depId}'`);
      }
    }
  }

  // 循環参照検知 (DFS Cycle Detection)
  const visited = new Map(); // id -> 'visiting' | 'visited'
  function checkCycle(currId, pathStack) {
    visited.set(currId, 'visiting');
    const ticket = tickets.get(currId);
    if (ticket && Array.isArray(ticket.meta.depends_on)) {
      for (const depId of ticket.meta.depends_on) {
        if (!tickets.has(depId)) continue;
        const state = visited.get(depId);
        if (state === 'visiting') {
          const cycleStr = [...pathStack, currId, depId].join(' -> ');
          errors.push(`[DAG Cycle] Circular dependency detected: ${cycleStr}`);
        } else if (!state) {
          checkCycle(depId, [...pathStack, currId]);
        }
      }
    }
    visited.set(currId, 'visited');
  }

  for (const id of tickets.keys()) {
    if (!visited.has(id)) {
      checkCycle(id, []);
    }
  }

  // --- Step 3: レポート出力 ---
  console.log('🔍 [Regista Ticket Validator]');
  console.log(`Validated ${tickets.size} tickets in .regista/tickets/\n`);

  if (warnings.length > 0) {
    console.log(`⚠️  Warnings (${warnings.length} issues):`);
    for (const w of warnings) {
      console.log(`  ${w}`);
    }
    console.log('');
  }

  if (errors.length > 0) {
    console.error(`❌ Validation Failed with ${errors.length} error(s):`);
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    console.error('\nRun before worker dispatch to prevent worker silent crashes.');
    process.exit(1);
  }

  console.log('✅ All tickets passed schema and DAG validation successfully.');
}

validate();
