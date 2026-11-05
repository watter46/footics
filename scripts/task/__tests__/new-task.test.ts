import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { generateTaskScaffold } from '../new-task';
import { validateTaskFile } from '../validate-task';

describe('generateTaskScaffold', () => {
  const tmpDir = path.join(
    process.cwd(),
    'scripts/task/__tests__/fixtures-new',
  );

  beforeAll(() => {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should generate a valid task scaffold file with correct format', () => {
    const fixedDate = new Date(2026, 9, 19); // 2026-10-19
    const result = generateTaskScaffold({
      id: '099',
      slug: 'sample-task',
      title: 'サンプル機能実装',
      tasksDir: tmpDir,
      now: fixedDate,
    });

    expect(result.fileName).toBe('TASK-099-sample-task.md');
    expect(fs.existsSync(result.filePath)).toBe(true);

    const content = fs.readFileSync(result.filePath, 'utf8');
    expect(content).toContain('# TASK-099: サンプル機能実装');
    expect(content).toContain('- **Status**: `TODO`');
    expect(content).toContain('- **Created**: 2026-10-19');
    expect(content).toContain('## 1. Metadata');
    expect(content).toContain(
      '## 2. Requirements & Acceptance Criteria (受入要件)',
    );
    expect(content).toContain(
      '## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)',
    );
    expect(content).toContain(
      '## 3. Context Snippets (参照コード・型定義・import)',
    );
    expect(content).toContain('## 4. Implementation Phases (Worker 実装手順)');
    expect(content).toContain('## 5. Reviewer Assessment (コード差分監査)');
  });

  it('should immediately pass validateTaskFile without errors', () => {
    const result = generateTaskScaffold({
      id: '098',
      slug: 'fresh-scaffold',
      tasksDir: tmpDir,
    });

    const validation = validateTaskFile(result.filePath);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should throw an error when target task file already exists', () => {
    expect(() => {
      generateTaskScaffold({
        id: '098',
        slug: 'fresh-scaffold',
        tasksDir: tmpDir,
      });
    }).toThrow('Task file already exists');
  });

  it('should pad single or double digit id to 3 digits', () => {
    const result = generateTaskScaffold({
      id: '7',
      slug: 'single-digit',
      tasksDir: tmpDir,
    });

    expect(result.fileName).toBe('TASK-007-single-digit.md');
  });
});
