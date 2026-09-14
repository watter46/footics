import { execSync } from "child_process";

function run(command: string) {
  console.log(`\n> ${command}`);
  try {
    execSync(command, { stdio: "inherit" });
  } catch (err) {
    console.error(`\n[ERROR] Command failed: ${command}`);
    process.exit(1);
  }
}

console.log("=== Scoped Verification ===");

// 1. Get changed files (staged and unstaged)
let changedFiles: string[] = [];
try {
  const output = execSync("git diff --name-only HEAD", { encoding: "utf8" });
  changedFiles = output.split("\n").filter((f) => f.trim().length > 0);
} catch (e) {
  // If not a git repo or no HEAD, just continue or exit
}

if (changedFiles.length === 0) {
  console.log("No changed files found. Skipping scoped check.");
  process.exit(0);
}

const jsTsFiles = changedFiles.filter(f => f.match(/\.(js|jsx|ts|tsx)$/));

if (jsTsFiles.length > 0) {
  console.log("Changed files:", jsTsFiles);
  
  // 2. Biome check
  const biomeFiles = jsTsFiles.join(" ");
  run(`npx @biomejs/biome check ${biomeFiles}`);
  
  // 3. Size check
  run(`npx tsx scripts/lint/check-file-size.ts ${biomeFiles}`);
  
  // 4. Vitest related
  run(`npx vitest run related ${biomeFiles} --passWithNoTests`);
}

// Scoped Type check (existing script in .agents/scripts/dev/type-check-scoped.js can be used)
run(`pnpm type-check:scoped`);

console.log("\n✅ All scoped checks passed.");
