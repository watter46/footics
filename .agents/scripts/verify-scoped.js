const fs = require('node:fs');
const { execSync } = require('node:child_process');

function getChangedFiles() {
  try {
    const status = execSync('git status -s', { stdio: 'pipe' }).toString();
    return status
      .split('\n')
      .map((line) => line.trim().split(/\s+/)[1])
      .filter((file) => file && fs.existsSync(file));
  } catch (_e) {
    return [];
  }
}

function run() {
  const changedFiles = getChangedFiles();
  if (changedFiles.length === 0) {
    console.log('[Fast Verify] No modified files detected. All checks passed.');
    return;
  }

  // 1. Biome Check on changed files only
  const biomeFiles = changedFiles.filter((f) =>
    /\.(js|ts|jsx|tsx|json|css)$/.test(f),
  );
  if (biomeFiles.length > 0) {
    console.log(
      `[Fast Verify] Checking lint/format for ${biomeFiles.length} modified file(s)...`,
    );
    execSync(`rtk pnpm biome check --write ${biomeFiles.join(' ')}`, {
      stdio: 'inherit',
    });
  }

  // 2. Scoped Type Check
  const tsFiles = changedFiles.filter(
    (f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('.d.ts'),
  );
  if (tsFiles.length > 0) {
    console.log(
      `[Fast Verify] Running scoped type check for ${tsFiles.length} file(s)...`,
    );
    execSync(`node .agents/scripts/type-check-scoped.js ${tsFiles.join(' ')}`, {
      stdio: 'inherit',
    });
  }

  // 3. Related Tests Check
  const testableFiles = changedFiles.filter((f) =>
    /\.(ts|tsx|js|jsx)$/.test(f),
  );
  if (testableFiles.length > 0) {
    console.log(
      `[Fast Verify] Running related tests for ${testableFiles.length} file(s)...`,
    );
    execSync(
      `rtk vitest related --run --passWithNoTests ${testableFiles.join(' ')}`,
      {
        stdio: 'inherit',
      },
    );
  }

  // 4. Rule & Skill Frontmatter Check
  const mdFiles = changedFiles.filter((f) => f.endsWith('.md'));
  if (mdFiles.length > 0) {
    const { z } = require('zod');
    const matter = require('gray-matter');

    const SkillSchema = z
      .object({
        name: z.string().optional(),
        description: z.string().optional(),
      })
      .passthrough();

    const RuleSchema = z
      .object({
        trigger: z.string({
          required_error: 'trigger is required in rule frontmatter',
        }),
      })
      .passthrough();

    let mdErrors = 0;

    for (const f of mdFiles) {
      if (
        f.includes('SKILL.md') ||
        f === 'AGENTS.md' ||
        f.includes('.agents/rules/')
      ) {
        try {
          const content = fs.readFileSync(f, 'utf-8');
          const parsed = matter(content);

          let result;
          if (f.includes('SKILL.md')) {
            result = SkillSchema.safeParse(parsed.data);
          } else {
            result = RuleSchema.safeParse(parsed.data);
          }

          if (!result.success) {
            console.error(`[Fast Verify] Invalid frontmatter in ${f}:`);
            const issues = result.error.issues || [];
            issues.forEach((e) => {
              const pathStr = Array.isArray(e.path) ? e.path.join('.') : '';
              console.error(`  - ${pathStr}: ${e.message}`);
            });
            mdErrors++;
          }
        } catch (e) {
          console.error(`[Fast Verify] Failed to parse ${f}: ${e.message}`);
          mdErrors++;
        }
      }
    }

    if (mdErrors > 0) {
      console.error(
        `[Fast Verify] Markdown Frontmatter validation failed. Please fix the errors above.`,
      );
      process.exit(1);
    }
  }

  console.log('[Fast Verify] All scoped checks passed successfully.');
}

try {
  run();
} catch (e) {
  process.exit(e.status || 1);
}
