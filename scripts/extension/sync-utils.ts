import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export interface SyncDirResult {
  winPath: string;
  wslPath: string;
}

export interface SyncResult {
  fileCount: number;
  durationMs: number;
}

export function toWslPath(winPath: string): string {
  try {
    const res = spawnSync('wslpath', ['-u', winPath], {
      encoding: 'utf-8',
    });
    if (res.status === 0 && res.stdout.trim()) {
      return res.stdout.trim();
    }
  } catch {
    // Fallback to manual path conversion
  }

  const normalized = winPath.replace(/\\/g, '/');
  const driveMatch = normalized.match(/^([a-zA-Z]):\/(.*)$/);
  if (driveMatch) {
    return `/mnt/${driveMatch[1].toLowerCase()}/${driveMatch[2]}`;
  }
  return winPath;
}

export function toWindowsPath(wslPath: string): string {
  try {
    const res = spawnSync('wslpath', ['-w', wslPath], {
      encoding: 'utf-8',
    });
    if (res.status === 0 && res.stdout.trim()) {
      return res.stdout.trim();
    }
  } catch {
    // Fallback to manual path conversion
  }

  const mountMatch = wslPath.match(/^\/mnt\/([a-zA-Z])\/(.*)$/);
  if (mountMatch) {
    const drive = mountMatch[1].toUpperCase();
    const rest = mountMatch[2].replace(/\//g, '\\');
    return `${drive}:\\${rest}`;
  }
  return wslPath.replace(/\//g, '\\');
}

export function detectWindowsUserProfile(): {
  winProfile: string;
  wslProfile: string;
} {
  try {
    const res = spawnSync('cmd.exe', ['/c', 'echo %USERPROFILE%'], {
      cwd: '/mnt/c',
      encoding: 'utf-8',
      timeout: 3000,
    });
    if (res.status === 0 && res.stdout.trim()) {
      const winProfile = res.stdout.trim();
      const wslProfile = toWslPath(winProfile);
      if (fs.existsSync(wslProfile)) {
        return { winProfile, wslProfile };
      }
    }
  } catch {
    // Fallback on timeout or error
  }

  const usersDir = '/mnt/c/Users';
  if (fs.existsSync(usersDir)) {
    const entries = fs.readdirSync(usersDir, { withFileTypes: true });
    const ignore = new Set(['Public', 'Default', 'Default User', 'All Users']);
    for (const entry of entries) {
      if (
        entry.isDirectory() &&
        !ignore.has(entry.name) &&
        !entry.name.startsWith('.')
      ) {
        const wslProfile = path.join(usersDir, entry.name);
        const winProfile = `C:\\Users\\${entry.name}`;
        return { winProfile, wslProfile };
      }
    }
  }

  const fallbackUser = process.env.USER || 'default';
  return {
    winProfile: `C:\\Users\\${fallbackUser}`,
    wslProfile: `/mnt/c/Users/${fallbackUser}`,
  };
}

export function cleanDirectory(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

export function countFiles(dir: string): number {
  if (!fs.existsSync(dir)) {
    return 0;
  }
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += countFiles(fullPath);
    } else if (entry.isFile()) {
      count += 1;
    }
  }
  return count;
}

export function getWindowsSyncDir(
  env: NodeJS.ProcessEnv = process.env,
): SyncDirResult {
  const override = env.FOOTICS_EXTENSION_SYNC_DIR?.trim();
  if (override) {
    if (
      override.startsWith('/') ||
      override.startsWith('./') ||
      override.startsWith('../')
    ) {
      const resolvedWsl = path.resolve(override);
      const winPath = toWindowsPath(resolvedWsl);
      return { winPath, wslPath: resolvedWsl };
    }
    const wslPath = toWslPath(override);
    return { winPath: override, wslPath };
  }

  const { winProfile, wslProfile } = detectWindowsUserProfile();
  return {
    winPath: `${winProfile.replace(/\\+$/, '')}\\extensions\\footics`,
    wslPath: path.join(wslProfile, 'extensions', 'footics'),
  };
}

export function syncDirectory(src: string, dest: string): SyncResult {
  const startTime = performance.now();
  cleanDirectory(dest);
  fs.cpSync(src, dest, { recursive: true, force: true });
  const endTime = performance.now();
  const fileCount = countFiles(dest);
  const durationMs = Math.round(endTime - startTime);
  return { fileCount, durationMs };
}
