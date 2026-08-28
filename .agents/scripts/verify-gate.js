const fs = require('node:fs');
const { execSync } = require('node:child_process');

try {
  const input = fs.readFileSync(0, 'utf-8');
  const data = JSON.parse(input);

  if (data.terminationReason === 'model_stop') {
    // 1. Check if any code files were modified
    let changedFiles = '';
    try {
      changedFiles = execSync('git status -s', { stdio: 'pipe' })
        .toString()
        .trim();
    } catch (_e) {
      changedFiles = '';
    }

    const hasCodeChanges = changedFiles
      .split('\n')
      .some((line) => /\.(ts|tsx|js|jsx|json|css)$/.test(line.trim()));

    // Skip verify if no code was changed (e.g. Q&A, research, markdown-only edits)
    if (!hasCodeChanges) {
      console.log(JSON.stringify({ decision: 'allow' }));
      process.exit(0);
    }

    // 2. Run fast scoped verification when code changes exist
    try {
      execSync('pnpm verify:scoped', { stdio: 'pipe' });
      console.log(JSON.stringify({ decision: 'allow' }));
    } catch (e) {
      const stdoutStr = e.stdout ? e.stdout.toString() : '';
      const stderrStr = e.stderr ? e.stderr.toString() : '';
      const rawOut = `${stdoutStr}\n${stderrStr}`;
      const trimmedLines = rawOut
        .split('\n')
        .filter((l) => l.trim().length > 0)
        .slice(0, 15) // Keep only top 15 lines of error summary to save tokens
        .join('\n');

      console.log(
        JSON.stringify({
          decision: 'continue',
          reason: `pnpm verify:scoped failed on modified code. Top error summary:\n${trimmedLines}\n\nPlease fix the errors above before completing the task.`,
        }),
      );
    }
  } else {
    console.log(JSON.stringify({ decision: 'allow' }));
  }
} catch (_e) {
  console.log(JSON.stringify({ decision: 'allow' }));
}
