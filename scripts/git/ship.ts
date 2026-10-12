import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const LOG_FILE = '.agents/logs/ship-error.log';

function logErrorAndExit(stage: string, err: any) {
  const msg = `[${new Date().toISOString()}] SHIP ERROR at stage: ${stage}\n${err.message}\n${err.stdout ? err.stdout.toString() : ''}\n${err.stderr ? err.stderr.toString() : ''}\n`;
  fs.appendFileSync(LOG_FILE, msg);
  console.error(
    `\n❌ Ship failed at stage: ${stage}. See ${LOG_FILE} for details.`,
  );
  process.exit(1);
}

function run(command: string, stage: string) {
  console.log(`\n⏳ [${stage}] > ${command}`);
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (err) {
    logErrorAndExit(stage, err);
  }
}

console.log('=== 🚀 Automating Ship Process ===');

// 1. Verify clean working directory
try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  if (status.trim().length > 0) {
    console.error(
      '❌ Working directory is not clean. Please commit or stash changes.',
    );
    process.exit(1);
  }
} catch (e) {
  logErrorAndExit('Git Status', e);
}

const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
  encoding: 'utf8',
}).trim();
const isMain = currentBranch === 'main';

console.log(
  `📌 Current branch: ${currentBranch} (${isMain ? 'Direct main workflow' : 'Feature branch workflow'})`,
);

// 2. Production build verification
run('bun run build', 'Build Verification');

// 3. Archive specification if any exists
const activeSpecsDir = 'specs/active';
const archiveSpecsDir = 'specs/archive';
let archivedCount = 0;
if (fs.existsSync(activeSpecsDir)) {
  if (!fs.existsSync(archiveSpecsDir)) {
    fs.mkdirSync(archiveSpecsDir, { recursive: true });
  }
  const specs = fs.readdirSync(activeSpecsDir);
  for (const spec of specs) {
    if (spec.endsWith('.md')) {
      fs.renameSync(
        path.join(activeSpecsDir, spec),
        path.join(archiveSpecsDir, spec),
      );
      console.log(`📦 Archived spec: ${spec}`);
      archivedCount++;
    }
  }
}

if (archivedCount > 0) {
  try {
    execSync('git add specs/', { stdio: 'inherit' });
    execSync(`git commit -m "docs: archive completed active specs"`, {
      stdio: 'inherit',
    });
  } catch (e) {
    // nothing to commit or failed
  }
}

// 4. Merge & Push process
if (isMain) {
  console.log('\n🚀 Direct main ship: pulling latest and pushing...');
  run('git pull --rebase origin main', 'Pull Latest Main');
  run('git push origin main', 'Push Main');
} else {
  console.log(`\n🚀 Merging feature branch '${currentBranch}' into main...`);
  run('git checkout main', 'Checkout Main');
  run('git pull origin main', 'Pull Main');
  run(
    `git merge ${currentBranch} --no-ff -m "Merge ${currentBranch} into main"`,
    'Merge Branch',
  );
  run('git push origin main', 'Push Main');

  // Delete local & remote feature branch
  run(`git branch -d ${currentBranch}`, 'Delete Local Branch');
  try {
    execSync(`git push origin --delete ${currentBranch}`);
  } catch (e) {
    console.log(
      `⚠️ Could not delete remote branch ${currentBranch} (it might not exist on remote).`,
    );
  }
}

console.log('\n✅ Ship completed successfully!');
