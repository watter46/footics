// biome-ignore lint/style/noExcessiveLinesPerFile: Single-file CLI script for ticket automation
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface TicketInfo {
  id: string;
  filePath: string;
  title: string;
  changedFiles: string[];
  type: 'ticket' | 'handover';
}

function getRootDir(): string {
  try {
    return execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
    }).trim();
  } catch {
    return process.cwd();
  }
}

function parseFrontmatter(content: string): { title: string; status: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    throw new Error('Frontmatter not found in ticket file');
  }
  const fm = match[1];
  const titleMatch = fm.match(/^title:\s*(.+)$/m);
  const statusMatch = fm.match(/^status:\s*([A-Za-z_-]+)/m);
  const rawTitle = titleMatch ? titleMatch[1] : '';
  const title = rawTitle
    .replace(/#.*$/, '')
    .trim()
    .replace(/^["']|["']$/g, '');
  const status = statusMatch ? statusMatch[1].trim() : '';
  return { title, status };
}

function extractChangedFiles(content: string): string[] {
  const sectionMatch = content.match(
    /###\s*2\.\s*変更ファイル一覧[^\n]*\r?\n([\s\S]*?)(?=(?:\r?\n###|\r?\n---|(?:\r?\n){2,}##|$))/i,
  );
  if (!sectionMatch) return [];
  const lines = sectionBody(sectionMatch[1]);
  const files: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('-') && !trimmed.startsWith('*')) continue;
    const item = trimmed.replace(/^[-*]\s*/, '').trim();
    if (!item) continue;
    const backtickMatch = item.match(/^`([^`]+)`/);
    let filePath = (backtickMatch ? backtickMatch[1] : item).trim();
    filePath = filePath.replace(/^["']|["']$/g, '').trim();
    if (!filePath.startsWith('<!--') && filePath !== '') {
      files.push(filePath);
    }
  }
  return files;
}

function sectionBody(body: string): string[] {
  return body.split(/\r?\n/);
}

function sanitizeFilePath(raw: string): string {
  const cleaned = raw.trim().replace(/^["']|["']$/g, '');
  if (cleaned.startsWith('<!--') || cleaned.includes('{{') || !cleaned) {
    return '';
  }
  return cleaned;
}

function extractIdFromFrontmatter(content: string): string {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return '';
  const idMatch = match[1].match(/^id:\s*(.+)$/m);
  return idMatch
    ? idMatch[1]
        .replace(/#.*$/, '')
        .trim()
        .replace(/^["']|["']$/g, '')
    : '';
}

function extractTitleFromFrontmatter(content: string): string {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return '';
  const titleMatch = match[1].match(/^title:\s*(.+)$/m);
  return titleMatch
    ? titleMatch[1]
        .replace(/#.*$/, '')
        .trim()
        .replace(/^["']|["']$/g, '')
    : '';
}

function extractTitleFromBody(content: string): string {
  const taskNameMatch = content.match(/^-\s*\*\*タスク名\*\*:\s*(.+)$/m);
  if (taskNameMatch?.[1]?.trim() && !taskNameMatch[1].includes('{{TITLE}}')) {
    return taskNameMatch[1]
      .replace(/#.*$/, '')
      .trim()
      .replace(/^["']|["']$/g, '');
  }

  const summaryMatch = content.match(/^#\s*引継ぎサマリー:\s*(.+)$/m);
  if (summaryMatch) {
    const t = summaryMatch[1].trim();
    const parenMatch = t.match(/\(([^)]+)\)$/);
    if (parenMatch && !parenMatch[1].includes('{{TITLE}}')) {
      return parenMatch[1].trim();
    }
    if (!t.includes('{{TITLE}}')) {
      return t;
    }
  }

  const headingMatch = content.match(/^#\s+(.+)$/m);
  return headingMatch ? headingMatch[1].trim() : '';
}

function parseHandoverMetadata(
  content: string,
  fallbackId: string,
): { id: string; title: string } {
  const fmId = extractIdFromFrontmatter(content);
  const bodyIdMatch = content.match(
    /^-\s*\*\*チケットID\*\*:\s*`?([^`\r\n]+)`?/m,
  );
  const bodyId =
    bodyIdMatch && !bodyIdMatch[1].includes('{{TICKET_ID}}')
      ? bodyIdMatch[1].trim()
      : '';

  const id = fmId || bodyId || fallbackId;
  const title =
    extractTitleFromFrontmatter(content) ||
    extractTitleFromBody(content) ||
    'Handover';

  return { id, title };
}

function fileExistsOrDeleted(
  relPath: string,
  rootDir: string,
  gitDeletedFiles: Set<string>,
): boolean {
  const fullPath = path.isAbsolute(relPath)
    ? relPath
    : path.resolve(rootDir, relPath);
  const gitRelPath = path.normalize(path.relative(rootDir, fullPath));
  return fs.existsSync(fullPath) || gitDeletedFiles.has(gitRelPath);
}

function extractFilesFromSection4(
  content: string,
  rootDir: string,
  gitDeletedFiles: Set<string>,
): string[] {
  const section4Match = content.match(
    /##\s*4\.\s*現時点の実装状況[^\r\n]*\r?\n([\s\S]*?)(?=(?:\r?\n###\s*品質検証結果|\r?\n##|\r?\n---|$))/i,
  );
  if (!section4Match) return [];

  const files: string[] = [];
  for (const line of section4Match[1].split(/\r?\n/)) {
    const numberMatch = line.trim().match(/^\d+\.\s*(.+)$/);
    if (!numberMatch) continue;
    const body = numberMatch[1];
    const backtickMatch = body.match(/`([^`]+)`/);
    const boldMatch = body.match(/\*\*([^*]+)\*\*/);
    const rawPath = backtickMatch
      ? backtickMatch[1]
      : boldMatch
        ? boldMatch[1]
        : body.replace(/:.*$/, '');
    const cleanPath = sanitizeFilePath(rawPath);
    if (cleanPath && fileExistsOrDeleted(cleanPath, rootDir, gitDeletedFiles)) {
      files.push(cleanPath);
    }
  }
  return files;
}

function getRelatedFilesBlock(section1Body: string): string[] {
  const lines = section1Body.split(/\r?\n/);
  const relLines: string[] = [];
  let capturing = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes('関連ファイル')) {
      capturing = true;
      relLines.push(trimmed);
      continue;
    }
    if (!capturing) continue;
    if (trimmed.startsWith('- **') || trimmed.startsWith('* **')) break;
    relLines.push(trimmed);
  }
  return relLines;
}

function extractFilesFromSection1(
  content: string,
  rootDir: string,
  gitDeletedFiles: Set<string>,
): string[] {
  const section1Match = content.match(
    /##\s*1\.\s*タスク概要[^\r\n]*\r?\n([\s\S]*?)(?=(?:\r?\n##|\r?\n---|$))/i,
  );
  if (!section1Match) return [];

  const files: string[] = [];
  for (const line of getRelatedFilesBlock(section1Match[1])) {
    const backtickMatch = line.match(/`([^`]+)`/);
    if (!backtickMatch) continue;
    const cleanPath = sanitizeFilePath(backtickMatch[1]);
    if (cleanPath && fileExistsOrDeleted(cleanPath, rootDir, gitDeletedFiles)) {
      files.push(cleanPath);
    }
  }
  return files;
}

function extractHandoverChangedFiles(
  content: string,
  rootDir: string,
  gitDeletedFiles: Set<string>,
): string[] {
  const section4Files = extractFilesFromSection4(
    content,
    rootDir,
    gitDeletedFiles,
  );
  if (section4Files.length > 0) {
    return section4Files;
  }
  return extractFilesFromSection1(content, rootDir, gitDeletedFiles);
}

function getGitDeletedFiles(rootDir: string): Set<string> {
  const deletedFiles = new Set<string>();
  try {
    const rawDeleted = execSync('git ls-files --deleted', {
      encoding: 'utf-8',
      cwd: rootDir,
    });
    for (const line of rawDeleted.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed) deletedFiles.add(path.normalize(trimmed));
    }
  } catch {
    // ignore
  }
  return deletedFiles;
}

function getGitWorkingTreeChanges(rootDir: string): Set<string> {
  const changes = new Set<string>();
  try {
    const output = execSync('git status --porcelain -uall', {
      encoding: 'utf-8',
      cwd: rootDir,
    });
    for (const line of output.split(/\r?\n/)) {
      if (!line.trim()) continue;
      let filePathPart = line.slice(3).trim();
      if (filePathPart.includes(' -> ')) {
        const parts = filePathPart.split(' -> ');
        filePathPart = parts[parts.length - 1];
      }
      filePathPart = filePathPart.replace(/^["']|["']$/g, '');
      changes.add(path.normalize(filePathPart));
    }
  } catch {
    // ignore
  }
  return changes;
}

function validateAndResolveFiles(
  filePaths: string[],
  rootDir: string,
  ticketId: string,
  gitDeletedFiles: Set<string>,
): string[] {
  const resolvedFiles: string[] = [];
  for (const relPath of filePaths) {
    const fullPath = path.isAbsolute(relPath)
      ? relPath
      : path.resolve(rootDir, relPath);
    const gitRelativePath = path.normalize(path.relative(rootDir, fullPath));
    if (!fs.existsSync(fullPath) && !gitDeletedFiles.has(gitRelativePath)) {
      console.error(
        `❌ Error: Changed file specified in ticket '${ticketId}' does not exist: ${relPath}`,
      );
      process.exit(1);
    }
    resolvedFiles.push(gitRelativePath);
  }
  return resolvedFiles;
}

function showHelpAndExit(exitCode: number): never {
  console.log('Usage: tsx .regista/scripts/ticket-done.ts <ID...>');
  console.log(
    'Example: tsx .regista/scripts/ticket-done.ts L1-CLI-001 L1-CLI-002',
  );
  console.log('Options:');
  console.log('  --help, -h    Show help information');
  process.exit(exitCode);
}

function loadTicket(
  rawId: string,
  ticketsDir: string,
  rootDir: string,
  gitDeletedFiles: Set<string>,
): TicketInfo {
  const cleanInputId = rawId.replace(/\.md$/, '');
  const ticketPath = path.join(ticketsDir, `${cleanInputId}.md`);

  if (fs.existsSync(ticketPath)) {
    try {
      const content = fs.readFileSync(ticketPath, 'utf-8');
      const { title } = parseFrontmatter(content);
      const extracted = extractChangedFiles(content);
      const changedFiles = validateAndResolveFiles(
        extracted,
        rootDir,
        cleanInputId,
        gitDeletedFiles,
      );
      return {
        id: cleanInputId,
        filePath: ticketPath,
        title,
        changedFiles,
        type: 'ticket',
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`❌ Error reading ticket '${cleanInputId}': ${message}`);
      process.exit(1);
    }
  }

  const handoverDir = path.join(rootDir, '.regista', 'handover');
  const cleanId = cleanInputId.replace(/-handover$/, '');
  const candidatePaths: string[] = [
    path.join(handoverDir, `${cleanInputId}.md`),
    path.join(handoverDir, `${cleanInputId}-handover.md`),
    path.join(handoverDir, `${cleanId}.md`),
  ];

  let handoverFilePath: string | null = null;
  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      handoverFilePath = candidate;
      break;
    }
  }

  if (!handoverFilePath) {
    console.error(
      `❌ Error: Ticket or handover file not found for ID '${cleanInputId}': neither '${ticketPath}' nor candidates in '${handoverDir}' exist`,
    );
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(handoverFilePath, 'utf-8');
    const { id, title } = parseHandoverMetadata(content, cleanId);
    const extracted = extractHandoverChangedFiles(
      content,
      rootDir,
      gitDeletedFiles,
    );
    const changedFiles = validateAndResolveFiles(
      extracted,
      rootDir,
      id,
      gitDeletedFiles,
    );
    return {
      id,
      filePath: handoverFilePath,
      title,
      changedFiles,
      type: 'handover',
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`❌ Error reading handover '${cleanInputId}': ${message}`);
    process.exit(1);
  }
}

function markTicketDone(ticket: TicketInfo): void {
  try {
    const content = fs.readFileSync(ticket.filePath, 'utf-8');
    if (ticket.type === 'ticket') {
      if (!/^status:\s*[A-Za-z_-]+/m.test(content)) {
        console.error(
          `❌ Error: 'status' field not found in frontmatter for ticket '${ticket.id}'`,
        );
        process.exit(1);
      }
      const updated = content.replace(
        /^status:\s*([A-Za-z_-]+)/m,
        'status: DONE',
      );
      fs.writeFileSync(ticket.filePath, updated, 'utf-8');
    } else {
      let updated = content;
      if (/^status:\s*[A-Za-z_-]+/m.test(content)) {
        updated = content.replace(/^status:\s*([A-Za-z_-]+)/m, 'status: DONE');
      } else if (/^-\s*\*\*ステータス\*\*:[^\r\n]*/m.test(content)) {
        updated = content.replace(
          /^-\s*\*\*ステータス\*\*:[^\r\n]*/m,
          '- **ステータス**: DONE',
        );
      } else {
        updated = content.replace(
          /^(#\s+[^\r\n]+)/m,
          '$1\n\n- **ステータス**: DONE',
        );
      }
      fs.writeFileSync(ticket.filePath, updated, 'utf-8');
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`❌ Error updating ticket '${ticket.id}': ${message}`);
    process.exit(1);
  }
}

function rollbackTickets(backups: Map<string, string>): void {
  for (const [filePath, content] of backups.entries()) {
    try {
      fs.writeFileSync(filePath, content, 'utf-8');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`⚠️ Failed to rollback ticket file '${filePath}': ${msg}`);
    }
  }
}

const IGNORED_DIFF_PATTERNS = [
  /^\.regista\/scout-cache\//,
  /^\.regista\/metrics\//,
  /^\.regista\/handover\//,
  /^\.regista\/tickets\//,
];

function isIgnoredPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return IGNORED_DIFF_PATTERNS.some((pattern) => pattern.test(normalized));
}

function getRegisteredFiles(tickets: TicketInfo[]): Set<string> {
  const registered = new Set<string>();
  for (const ticket of tickets) {
    for (const file of ticket.changedFiles) {
      registered.add(path.normalize(file));
    }
  }
  return registered;
}

function findUnrecordedFiles(
  gitChanges: Set<string>,
  targetTicketPaths: Set<string>,
  registeredFiles: Set<string>,
): string[] {
  const unrecorded: string[] = [];
  for (const gitFile of gitChanges) {
    if (isIgnoredPath(gitFile)) continue;
    if (!targetTicketPaths.has(gitFile) && !registeredFiles.has(gitFile)) {
      unrecorded.push(gitFile);
    }
  }
  return unrecorded;
}

function validateDiffGate(tickets: TicketInfo[], rootDir: string): void {
  const gitChanges = getGitWorkingTreeChanges(rootDir);
  const targetTicketPaths = new Set(
    tickets.map((t) => path.normalize(path.relative(rootDir, t.filePath))),
  );
  const registeredFiles = getRegisteredFiles(tickets);
  const unrecordedFiles = findUnrecordedFiles(
    gitChanges,
    targetTicketPaths,
    registeredFiles,
  );

  if (unrecordedFiles.length === 0) return;

  const hasHandover = tickets.some((t) => t.type === 'handover');
  if (hasHandover) {
    console.warn(
      '⚠️ Warning: Handover対象のため、未記載の変更ファイルが存在しますがコミットを継続します。',
    );
    console.warn('未記載の変更ファイル (ステージングから除外):');
    for (const f of unrecordedFiles) {
      console.warn(`  - ${f}`);
    }
    return;
  }

  console.error(
    '❌ Error: Write-back の変更ファイル一覧と Git の実際の変更に乖離があります。',
  );
  console.error('未記載の変更ファイル:');
  for (const f of unrecordedFiles) {
    console.error(`  - ${f}`);
  }
  console.error(
    'Workerに Write-back を追記させるか、チケットを更新してください。',
  );
  process.exit(1);
}

function runValidation(validatorPath: string, rootDir: string): void {
  console.log('Validating tickets...');
  try {
    execSync(`node "${validatorPath}"`, { stdio: 'inherit', cwd: rootDir });
  } catch {
    console.error(
      '❌ Ticket validation failed. Please check validation output and fix tickets.',
    );
    process.exit(1);
  }
}

function generateCommitMessage(tickets: TicketInfo[]): string {
  const allHandover = tickets.every((t) => t.type === 'handover');
  if (allHandover) {
    if (tickets.length === 1) {
      return `docs(handover): done ${tickets[0].id} - ${tickets[0].title}`;
    }
    const idsList = tickets.map((t) => t.id).join(', ');
    return `docs(handover): done ${idsList} (${tickets.length} handovers)`;
  }
  if (tickets.length === 1) {
    return `feat(tickets): done ${tickets[0].id} - ${tickets[0].title}`;
  }
  const idsList = tickets.map((t) => t.id).join(', ');
  return `feat(tickets): done ${idsList} (${tickets.length} tickets)`;
}

function commitTickets(
  message: string,
  filesToStage: string[],
  rootDir: string,
): string {
  try {
    if (filesToStage.length > 0) {
      const quotedFiles = filesToStage.map((f) => JSON.stringify(f)).join(' ');
      execSync(`git add ${quotedFiles}`, { stdio: 'pipe', cwd: rootDir });
    }
    execSync(`git commit -m ${JSON.stringify(message)}`, {
      stdio: 'pipe',
      cwd: rootDir,
    });
    return execSync('git rev-parse --short HEAD', {
      encoding: 'utf-8',
      cwd: rootDir,
    }).trim();
  } catch (err: unknown) {
    const messageText = err instanceof Error ? err.message : String(err);
    console.error(`❌ Git commit failed: ${messageText}`);
    throw err;
  }
}

function main(): void {
  const rawArgs = process.argv.slice(2);
  const isHelp = rawArgs.includes('--help') || rawArgs.includes('-h');
  const ticketIds = rawArgs.filter((arg) => !arg.startsWith('-'));

  if (isHelp) showHelpAndExit(0);
  if (ticketIds.length === 0) showHelpAndExit(1);

  const rootDir = getRootDir();
  const ticketsDir = path.join(rootDir, '.regista', 'tickets');
  const validatorPath = path.join(
    rootDir,
    '.agents',
    'scripts',
    'validate-tickets.js',
  );

  const gitDeletedFiles = getGitDeletedFiles(rootDir);
  const tickets = ticketIds.map((id) =>
    loadTicket(id, ticketsDir, rootDir, gitDeletedFiles),
  );

  validateDiffGate(tickets, rootDir);

  const ticketBackups = new Map<string, string>();
  for (const ticket of tickets) {
    ticketBackups.set(
      ticket.filePath,
      fs.readFileSync(ticket.filePath, 'utf-8'),
    );
  }

  for (const ticket of tickets) {
    markTicketDone(ticket);
  }

  const allHandover = tickets.every((t) => t.type === 'handover');
  if (!allHandover) {
    try {
      runValidation(validatorPath, rootDir);
    } catch (_err) {
      rollbackTickets(ticketBackups);
      process.exit(1);
    }
  } else {
    console.log('Skipping ticket validation for handover files.');
  }

  const filesToStage = new Set<string>();
  for (const ticket of tickets) {
    filesToStage.add(path.relative(rootDir, ticket.filePath));
    for (const changedFile of ticket.changedFiles) {
      filesToStage.add(changedFile);
    }
  }

  const commitMessage = generateCommitMessage(tickets);
  let commitHash: string;
  try {
    commitHash = commitTickets(
      commitMessage,
      Array.from(filesToStage),
      rootDir,
    );
  } catch (_err) {
    rollbackTickets(ticketBackups);
    process.exit(1);
  }

  const idsList = tickets.map((t) => t.id).join(', ');
  console.log(`✅ Done: ${idsList} committed as ${commitHash}`);
}

main();
