import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface TicketInfo {
  id: string;
  filePath: string;
  title: string;
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

function showHelpAndExit(exitCode: number): never {
  console.log('Usage: tsx .regista/scripts/ticket-done.ts <ID...>');
  console.log(
    'Example: tsx .regista/scripts/ticket-done.ts L1-CLI-001 L1-CLI-002',
  );
  console.log('Options:');
  console.log('  --help, -h    Show help information');
  process.exit(exitCode);
}

function loadTicket(rawId: string, ticketsDir: string): TicketInfo {
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
    return { id, filePath, title };
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
    const updatedContent = content.replace(
      /^status:\s*([A-Za-z_-]+)/m,
      'status: DONE',
    );
    fs.writeFileSync(ticket.filePath, updatedContent, 'utf-8');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`❌ Error updating ticket '${ticket.id}': ${message}`);
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

function commitTickets(message: string, rootDir: string): string {
  try {
    execSync('git add .regista/tickets/*.md', { stdio: 'pipe', cwd: rootDir });
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
    process.exit(1);
  }
}

function main(): void {
  const rawArgs = process.argv.slice(2);
  const isHelp = rawArgs.includes('--help') || rawArgs.includes('-h');
  const ticketIds = rawArgs.filter((arg) => !arg.startsWith('-'));

  if (isHelp) {
    showHelpAndExit(0);
  }
  if (ticketIds.length === 0) {
    showHelpAndExit(1);
  }

  const rootDir = getRootDir();
  const ticketsDir = path.join(rootDir, '.regista', 'tickets');
  const validatorPath = path.join(
    rootDir,
    '.agents',
    'scripts',
    'validate-tickets.js',
  );

  const tickets = ticketIds.map((id) => loadTicket(id, ticketsDir));

  for (const ticket of tickets) {
    markTicketDone(ticket);
  }

  runValidation(validatorPath, rootDir);

  const commitMessage = generateCommitMessage(tickets);
  const commitHash = commitTickets(commitMessage, rootDir);

  const idsList = tickets.map((t) => t.id).join(', ');
  console.log(`✅ Done: ${idsList} committed as ${commitHash}`);
}

main();
