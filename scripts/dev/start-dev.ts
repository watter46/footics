import { execSync, spawn } from 'node:child_process';

const PORT = 3000;

function freePort(port: number): void {
  try {
    const pidOutput = execSync(`lsof -ti :${port}`, {
      encoding: 'utf8',
    }).trim();
    if (pidOutput) {
      const pids = pidOutput.split(/\s+/).filter(Boolean);
      console.log(
        `[dev] Port ${port} is in use by PID(s): ${pids.join(', ')}. Freeing port...`,
      );
      for (const pid of pids) {
        try {
          process.kill(Number(pid), 'SIGTERM');
        } catch {
          // Process may have already exited
        }
      }
      execSync('sleep 0.5');
    }
  } catch {
    // Port is not occupied
  }
}

// 1. Ensure port 3000 is free before starting dev server
freePort(PORT);

// 2. Launch Next.js dev server with Turbopack via bun x
const child = spawn('bun', ['x', 'next', 'dev', '--turbo'], {
  stdio: 'inherit',
});

// 3. Handle termination signals cleanly
function handleSignal(signal: NodeJS.Signals): void {
  if (child.pid) {
    try {
      child.kill(signal);
    } catch {
      // Child process may have already exited
    }
  }
  process.exit(0);
}

process.on('SIGINT', () => handleSignal('SIGINT'));
process.on('SIGTERM', () => handleSignal('SIGTERM'));

child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(1);
  } else {
    process.exit(code ?? 0);
  }
});
