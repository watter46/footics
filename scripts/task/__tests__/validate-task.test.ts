import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { validateAllTasks, validateTaskFile } from '../validate-task';

describe('validateTaskFile', () => {
  const tmpDir = path.join(process.cwd(), 'scripts/task/__tests__/fixtures');

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

  it('should pass for a freshly scaffolded task file (TODO state)', () => {
    const validTodo = `# TASK-100: テスト機能

## 1. Metadata
- **Status**: \`TODO\`
- **Created**: 2026-10-19
- **Target Files**:
  - \`src/test.ts\` (NEW)

## 2. Requirements & Acceptance Criteria (受入要件)
- [ ] 1. 要件A
- [ ] 2. 要件B

## 3. Context Snippets (参照コード・型定義・import)
### 3.1 Import Specs
\`\`\`ts
import { foo } from '@/bar';
\`\`\`
### 3.2 Key Interfaces & Types
### 3.3 Reference Pattern

## 4. Implementation Phases (Worker 実装手順)
### Phase 1: サブシステム
- **Worker Model**: \`flash\`
- **対象ファイル**: \`src/test.ts\`
- **契約 (Interface)**:
- **Testing Strategy**:
- **Tasks**:
  - [ ] 1. TDD実装: \`bun run ai:check:red\` ➔ 実装 ➔ PASS
- **Worker Handoff Log**:

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: \`flash\`
- **Reviewed At**: 
- **Decision**: \`TODO\`
- **Audit Checklist**:
  - [ ] 要件網羅性
  - [ ] 境界と副作用
  - [ ] 設計負債防止
  - [ ] サイレント破壊防止
- **Summary**:
`;

    const filePath = path.join(tmpDir, 'TASK-100-valid-todo.md');
    fs.writeFileSync(filePath, validTodo, 'utf8');

    const result = validateTaskFile(filePath);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail when Status is DONE but unchecked items remain', () => {
    const invalidDone = `# TASK-101: テスト機能

## 1. Metadata
- **Status**: \`DONE\`
- **Created**: 2026-10-19
- **Target Files**:
  - \`src/test.ts\` (NEW)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. 要件A
- [ ] 2. 要件B (未チェック)

## 3. Context Snippets (参照コード・型定義・import)
### 3.1 Import Specs
### 3.2 Key Interfaces & Types
### 3.3 Reference Pattern

## 4. Implementation Phases (Worker 実装手順)
### Phase 1: サブシステム
- **Tasks**:
  - [x] 1. TDD実装
- **Worker Handoff Log**: Log entry

## 5. Reviewer Assessment (コード差分監査)
- **Decision**: \`LGTM\`
- **Audit Checklist**:
  - [x] 要件網羅性
  - [x] 境界と副作用
  - [x] 設計負債防止
  - [x] サイレント破壊防止
- **Summary**: LGTM
`;

    const filePath = path.join(tmpDir, 'TASK-101-invalid-done-unchecked.md');
    fs.writeFileSync(filePath, invalidDone, 'utf8');

    const result = validateTaskFile(filePath);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('unchecked item'))).toBe(true);
  });

  it('should fail when Status is DONE but Reviewer Decision is TODO', () => {
    const invalidDoneDecision = `# TASK-102: テスト機能

## 1. Metadata
- **Status**: \`DONE\`
- **Created**: 2026-10-19
- **Target Files**:
  - \`src/test.ts\` (NEW)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. 要件A

## 3. Context Snippets (参照コード・型定義・import)
### 3.1 Import Specs
### 3.2 Key Interfaces & Types
### 3.3 Reference Pattern

## 4. Implementation Phases (Worker 実装手順)
### Phase 1: サブシステム
- **Tasks**:
  - [x] 1. TDD実装
- **Worker Handoff Log**: Log entry

## 5. Reviewer Assessment (コード差分監査)
- **Decision**: \`TODO\`
- **Audit Checklist**:
  - [x] 要件網羅性
  - [x] 境界と副作用
  - [x] 設計負債防止
  - [x] サイレント破壊防止
- **Summary**:
`;

    const filePath = path.join(tmpDir, 'TASK-102-invalid-done-decision.md');
    fs.writeFileSync(filePath, invalidDoneDecision, 'utf8');

    const result = validateTaskFile(filePath);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("expected: 'LGTM'"))).toBe(
      true,
    );
  });

  it('should fail when required sections are missing (unstructured format)', () => {
    const unformatted = `# TASK-103: オレオレ書式

## Status: COMPLETED
- Assigned: worker

## 1. ゴール
適当な説明
`;

    const filePath = path.join(tmpDir, 'TASK-103-unformatted.md');
    fs.writeFileSync(filePath, unformatted, 'utf8');

    const result = validateTaskFile(filePath);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.includes('Missing required section')),
    ).toBe(true);
  });

  describe('validateAllTasks', () => {
    it('should validate all tasks in directory and filter by from number', () => {
      const batch = validateAllTasks({
        tasksDir: tmpDir,
        from: 100,
      });

      expect(batch.total).toBe(4); // 100, 101, 102, 103
      expect(batch.passed).toBe(1); // valid-todo (100)
      expect(batch.failed).toBe(3); // 101, 102, 103
      expect(batch.results).toHaveLength(4);
    });

    it('should filter tasks prior to from number', () => {
      const batch = validateAllTasks({
        tasksDir: tmpDir,
        from: 102,
      });

      expect(batch.total).toBe(2); // 102, 103
      expect(batch.failed).toBe(2);
    });
  });

  it('should enforce V2 invariants and <=6 files per phase on V2 tasks (TASK-159+)', () => {
    const overstuffedV2 = `# TASK-160: V2 Task Test

## 1. Metadata
- **Status**: \`TODO\`
- **Created**: 2026-11-05

## 2. Requirements & Acceptance Criteria (受入要件)
- [ ] 1. Req

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
- **Invariants**:
  1. Keep compatibility

## 3. Context Snippets (参照コード・型定義・import)
## 4. Implementation Phases (Worker 実装手順)
### Phase 1: Too Many Files
- **対象ファイル**: \`a.ts\`, \`b.ts\`, \`c.ts\`, \`d.ts\`, \`e.ts\`, \`f.test.ts\`, \`g.test.ts\`
- **Tasks**:
  - [ ] 1. TDD

## 5. Reviewer Assessment (コード差分監査)
- **Decision**: \`TODO\`
`;
    const filePath = path.join(tmpDir, 'TASK-160-overstuffed.md');
    fs.writeFileSync(filePath, overstuffedV2, 'utf8');

    const result = validateTaskFile(filePath);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.includes('[Phase File Limit Error]')),
    ).toBe(true);
    fs.unlinkSync(filePath);
  });
});
