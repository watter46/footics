import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  getWindowsSyncDir,
  type SyncDirResult,
  type SyncResult,
  syncDirectory,
} from './sync-utils';

function printGuide(winPath: string, wslPath: string, stats: SyncResult): void {
  console.log('\n[Footics Extension Sync]');
  console.log(`✔ Synced ${stats.fileCount} files in ${stats.durationMs}ms`);
  console.log(`  WSL target:     ${wslPath}`);
  console.log(`  Windows target: ${winPath}\n`);
  console.log('--- Microsoft Edge / Google Chrome Setup Guide ---');
  console.log('1. Open Edge and navigate to: edge://extensions');
  console.log(
    '2. Turn on "Developer mode" (開発者モード) in the left sidebar.',
  );
  console.log('3. Click "Load unpacked" (展開して読み込み).');
  console.log(`4. Select the directory:\n   ${winPath}`);
  console.log('--------------------------------------------------\n');
}

function runExtensionBuild(extensionDir: string): boolean {
  console.log(
    '[Footics Sync] Building extension (bun --cwd extension build)...',
  );
  const res = spawnSync('bun', ['--cwd', extensionDir, 'build'], {
    stdio: 'inherit',
  });
  return res.status === 0;
}

function executeSync(
  sourceDir: string,
  syncDir: SyncDirResult,
): SyncResult | null {
  if (!fs.existsSync(sourceDir)) {
    console.error(
      `[Footics Sync] Error: Output directory does not exist: ${sourceDir}`,
    );
    return null;
  }
  return syncDirectory(sourceDir, syncDir.wslPath);
}

function startWatchMode(
  sourceDir: string,
  extensionDir: string,
  syncDir: SyncDirResult,
): void {
  const buildSuccess = runExtensionBuild(extensionDir);
  if (!buildSuccess) {
    console.error('[Footics Sync] Initial build failed.');
    process.exit(1);
  }

  const initialStats = executeSync(sourceDir, syncDir);
  if (initialStats) {
    printGuide(syncDir.winPath, syncDir.wslPath, initialStats);
  }

  console.log(
    `[Footics Sync] Watching ${sourceDir} for changes (500ms debounce)...`,
  );
  console.log('[Footics Sync] Press Ctrl+C to exit.\n');

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let isSyncing = false;

  const onOutputChanged = () => {
    if (isSyncing) return;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      isSyncing = true;
      try {
        const stats = executeSync(sourceDir, syncDir);
        if (stats) {
          const timestamp = new Date().toLocaleTimeString();
          console.log(
            `[${timestamp}] Auto-synced ${stats.fileCount} files in ${stats.durationMs}ms -> ${syncDir.winPath}`,
          );
        }
      } catch (err) {
        console.error('[Footics Sync] Sync error:', err);
      } finally {
        isSyncing = false;
      }
    }, 500);
  };

  try {
    const watcher = fs.watch(sourceDir, { recursive: true }, onOutputChanged);
    process.on('SIGINT', () => {
      watcher.close();
      console.log('\n[Footics Sync] Stopped watching.');
      process.exit(0);
    });
  } catch (err) {
    console.error('[Footics Sync] Failed to watch output directory:', err);
    process.exit(1);
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const isWatch = args.includes('--watch') || args.includes('-w');

  const rootDir = path.resolve(import.meta.dirname, '../..');
  const extensionDir = path.join(rootDir, 'extension');
  const sourceDir = path.join(extensionDir, '.output/chrome-mv3');
  const syncDir = getWindowsSyncDir();

  if (isWatch) {
    startWatchMode(sourceDir, extensionDir, syncDir);
    return;
  }

  const buildSuccess = runExtensionBuild(extensionDir);
  if (!buildSuccess) {
    console.error('[Footics Sync] Build failed. Sync aborted.');
    process.exit(1);
  }

  const stats = executeSync(sourceDir, syncDir);
  if (!stats) {
    process.exit(1);
  }

  printGuide(syncDir.winPath, syncDir.wslPath, stats);
}

if (import.meta.main) {
  main();
}
