import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  cleanDirectory,
  countFiles,
  getWindowsSyncDir,
  syncDirectory,
} from '../sync-utils';

describe('sync-utils', () => {
  let tempBaseDir: string;

  beforeEach(() => {
    tempBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'footics-sync-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempBaseDir)) {
      fs.rmSync(tempBaseDir, { recursive: true, force: true });
    }
  });

  describe('countFiles', () => {
    it('returns 0 for empty or non-existent directory', () => {
      const nonExistent = path.join(tempBaseDir, 'does-not-exist');
      expect(countFiles(nonExistent)).toBe(0);

      const emptyDir = path.join(tempBaseDir, 'empty');
      fs.mkdirSync(emptyDir);
      expect(countFiles(emptyDir)).toBe(0);
    });

    it('counts files recursively including nested directories', () => {
      const srcDir = path.join(tempBaseDir, 'count-test');
      const nestedDir = path.join(srcDir, 'sub', 'deep');
      fs.mkdirSync(nestedDir, { recursive: true });

      fs.writeFileSync(path.join(srcDir, 'a.txt'), 'a');
      fs.writeFileSync(path.join(srcDir, 'b.js'), 'b');
      fs.writeFileSync(path.join(nestedDir, 'c.json'), 'c');

      expect(countFiles(srcDir)).toBe(3);
    });
  });

  describe('cleanDirectory', () => {
    it('creates directory if it does not exist', () => {
      const target = path.join(tempBaseDir, 'new-dir');
      expect(fs.existsSync(target)).toBe(false);

      cleanDirectory(target);
      expect(fs.existsSync(target)).toBe(true);
      expect(countFiles(target)).toBe(0);
    });

    it('cleans existing directory contents leaving it empty', () => {
      const target = path.join(tempBaseDir, 'clean-target');
      fs.mkdirSync(path.join(target, 'sub'), { recursive: true });
      fs.writeFileSync(path.join(target, 'f1.txt'), '1');
      fs.writeFileSync(path.join(target, 'sub', 'f2.txt'), '2');

      cleanDirectory(target);
      expect(fs.existsSync(target)).toBe(true);
      expect(countFiles(target)).toBe(0);
    });
  });

  describe('syncDirectory', () => {
    it('copies files from src to dest recursively and returns count and duration', () => {
      const src = path.join(tempBaseDir, 'src');
      const dest = path.join(tempBaseDir, 'dest');
      fs.mkdirSync(path.join(src, 'assets'), { recursive: true });

      fs.writeFileSync(path.join(src, 'manifest.json'), '{"name":"test"}');
      fs.writeFileSync(path.join(src, 'assets', 'icon.png'), 'fake-png');

      const result = syncDirectory(src, dest);
      expect(result.fileCount).toBe(2);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);

      expect(fs.existsSync(path.join(dest, 'manifest.json'))).toBe(true);
      expect(fs.existsSync(path.join(dest, 'assets', 'icon.png'))).toBe(true);
    });
  });

  describe('getWindowsSyncDir', () => {
    it('uses FOOTICS_EXTENSION_SYNC_DIR when provided in env', () => {
      const customPath = '/mnt/c/Users/custom/extensions/footics';
      const result = getWindowsSyncDir({
        FOOTICS_EXTENSION_SYNC_DIR: customPath,
      });

      expect(result.wslPath).toBe(customPath);
      expect(result.winPath).toContain('extensions\\footics');
    });

    it('resolves actual Windows sync directory when no env override is given', () => {
      const result = getWindowsSyncDir({});
      expect(result.wslPath).toMatch(/\/extensions\/footics$/);
      expect(result.winPath).toMatch(/\\extensions\\footics$/);
      expect(result.winPath).toMatch(/^[a-zA-Z]:\\/);
      expect(result.wslPath.startsWith('/mnt/')).toBe(true);
    });

    it('handles Windows-style path in FOOTICS_EXTENSION_SYNC_DIR', () => {
      const winInput = 'C:\\custom\\extensions\\footics';
      const result = getWindowsSyncDir({
        FOOTICS_EXTENSION_SYNC_DIR: winInput,
      });
      expect(result.winPath).toBe(winInput);
      expect(result.wslPath).toBe('/mnt/c/custom/extensions/footics');
    });
  });
});
