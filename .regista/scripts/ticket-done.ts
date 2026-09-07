// biome-ignore lint/style/noExcessiveLinesPerFile: Single-file CLI script for ticket automation
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface TicketInfo {
  id: string;
  filePath: string;
  title: string;
  changedFiles: string[];
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
  const id = rawId.replace(/\.md$/, '');
  const filePath = path.join(ticketsDir, `${id}.md`);
  if (!fs.existsSync(filePath)) {
    console.error(
      `❌ Error: Ticket file not found for ID '${id}': ${filePath}`,
    );
    process.exit(1);
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { title } = parseFrontmatter(content);
    const extracted = extractChangedFiles(content);
    const changedFiles = validateAndResolveFiles(
      extracted,
      rootDir,
      id,
      gitDeletedFiles,
    );
    return { id, filePath, title, changedFiles };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`❌ Error reading ticket '${id}': ${message}`);
    process.exit(1);
  }
}

function markTicketDone(ticket: TicketInfo): void {
  try {
    const content = fs.readFileSync(ticket.filePath, 'utf-8');
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

function validateDiffGate(tickets: TicketInfo[], rootDir: string): void {
  const gitChanges = getGitWorkingTreeChanges(rootDir);
  const targetTicketPaths = new Set(
    tickets.map((t) => path.normalize(path.relative(rootDir, t.filePath))),
  );
  const registeredFiles = new Set<string>();
  for (const ticket of tickets) {
    for (const file of ticket.changedFiles) {
      registeredFiles.add(path.normalize(file));
    }
  }
  const unrecordedFiles: string[] = [];
  for (const gitFile of gitChanges) {
    if (isIgnoredPath(gitFile)) continue;
    if (!targetTicketPaths.has(gitFile) && !registeredFiles.has(gitFile)) {
      unrecordedFiles.push(gitFile);
    }
  }
  if (unrecordedFiles.length > 0) {
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

  try {
    runValidation(validatorPath, rootDir);
  } catch (_err) {
    rollbackTickets(ticketBackups);
    process.exit(1);
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
