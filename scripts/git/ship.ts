import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const LOG_FILE = ".agents/logs/ship-error.log";

function logErrorAndExit(stage: string, err: any) {
  const msg = `[${new Date().toISOString()}] SHIP ERROR at stage: ${stage}\n${err.message}\n${err.stdout ? err.stdout.toString() : ''}\n${err.stderr ? err.stderr.toString() : ''}\n`;
  fs.appendFileSync(LOG_FILE, msg);
  console.error(`\n❌ Ship failed at stage: ${stage}. See ${LOG_FILE} for details.`);
  process.exit(1);
}

function run(command: string, stage: string) {
  console.log(`\n⏳ [${stage}] > ${command}`);
  try {
    execSync(command, { stdio: "inherit" });
  } catch (err) {
    logErrorAndExit(stage, err);
  }
}

console.log("=== 🚀 Automating Ship Process ===");

// 1. Verify clean working directory
try {
  const status = execSync("git status --porcelain", { encoding: "utf8" });
  if (status.trim().length > 0) {
    console.error("❌ Working directory is not clean. Please commit or stash changes.");
    process.exit(1);
  }
} catch (e) {
  logErrorAndExit("Git Status", e);
}

const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
if (currentBranch === "main") {
  console.error("❌ Already on main branch. Please run ship from a feature branch.");
  process.exit(1);
}

// 2. Production build verification
run("pnpm build", "Build Verification");

// 3. Merge to main
run("git checkout main", "Checkout Main");
run("git pull origin main", "Pull Main");
run(`git merge ${currentBranch} --no-ff -m "Merge ${currentBranch} into main"`, "Merge Branch");

// 4. Push to origin
run("git push origin main", "Push Main");

// 5. Delete feature branch
run(`git branch -d ${currentBranch}`, "Delete Local Branch");
try {
  execSync(`git push origin --delete ${currentBranch}`);
} catch (e) {
  console.log(`⚠️ Could not delete remote branch ${currentBranch} (it might not exist).`);
}

// 6. Archive specification (assuming specs/active/*.md matching the feature)
const activeSpecsDir = "specs/active";
const archiveSpecsDir = "specs/archive";
if (fs.existsSync(activeSpecsDir)) {
  if (!fs.existsSync(archiveSpecsDir)) {
    fs.mkdirSync(archiveSpecsDir, { recursive: true });
  }
  const specs = fs.readdirSync(activeSpecsDir);
  // Just moving all active specs to archive for now (or could match by branch name)
  for (const spec of specs) {
    if (spec.endsWith(".md")) {
      fs.renameSync(path.join(activeSpecsDir, spec), path.join(archiveSpecsDir, spec));
      console.log(`📦 Archived spec: ${spec}`);
    }
  }
}

console.log("\n✅ Ship completed successfully!");
