/**
 * tactical-projects-db.test.ts
 *
 * Tests for Dexie multi-project persistence layer.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/db/schema';
import {
  clearActiveProjectFromDb,
  loadActiveProjectFromDb,
} from '@/lib/tactical/tactical-storage';
import { createDefaultProject } from '@/lib/types/tactical-unified';
import {
  createNewTacticalProject,
  deleteTacticalProject,
  duplicateTacticalProject,
  getTacticalProjectById,
  listTacticalProjects,
  renameTacticalProject,
  saveTacticalProject,
} from '../tactical-projects-db';

describe('tactical-projects-db', () => {
  beforeEach(async () => {
    await db.tactical_projects.clear();
    await clearActiveProjectFromDb();
  });

  it('新規プロジェクトを作成して一覧取得・ID取得ができる', async () => {
    const project = await createNewTacticalProject(
      'アーセナル vs マンチェスターC',
      true,
    );

    expect(project.id).toBeDefined();
    expect(project.title).toBe('アーセナル vs マンチェスターC');

    const list = await listTacticalProjects();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(project.id);
    expect(list[0].title).toBe('アーセナル vs マンチェスターC');
    expect(list[0].slideCount).toBe(1);

    const fetched = await getTacticalProjectById(project.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(project.id);

    // Active project is also synced
    const active = await loadActiveProjectFromDb();
    expect(active?.id).toBe(project.id);
  });

  it('プロジェクトをリネームできる（アクティブプロジェクトも同期される）', async () => {
    const project = await createNewTacticalProject('Old Title', true);
    await renameTacticalProject(project.id, 'New Tactical Title');

    const updated = await getTacticalProjectById(project.id);
    expect(updated?.title).toBe('New Tactical Title');

    const active = await loadActiveProjectFromDb();
    expect(active?.title).toBe('New Tactical Title');
  });

  it('プロジェクトを複製できる', async () => {
    const original = await createNewTacticalProject('Pressing Analysis', false);
    const duplicated = await duplicateTacticalProject(original.id);

    expect(duplicated.id).not.toBe(original.id);
    expect(duplicated.title).toBe('Pressing Analysis (Copy)');
    expect(duplicated.slides).toHaveLength(original.slides.length);

    const list = await listTacticalProjects();
    expect(list).toHaveLength(2);
  });

  it('プロジェクトを削除するとテーブルから消去され、アクティブの場合はアクティブキーもクリアされる', async () => {
    const project = await createNewTacticalProject('To Be Deleted', true);

    const beforeDelete = await listTacticalProjects();
    expect(beforeDelete).toHaveLength(1);

    await deleteTacticalProject(project.id);

    const afterDelete = await listTacticalProjects();
    expect(afterDelete).toHaveLength(0);

    const active = await loadActiveProjectFromDb();
    expect(active).toBeNull();
  });

  it('複数プロジェクトが更新日時の降順でリストされる', async () => {
    const p1 = createDefaultProject('proj-1');
    p1.title = 'Project 1';
    p1.updatedAt = new Date('2026-09-01T10:00:00Z').toISOString();

    const p2 = createDefaultProject('proj-2');
    p2.title = 'Project 2';
    p2.updatedAt = new Date('2026-09-03T10:00:00Z').toISOString();

    await saveTacticalProject(p1, false);
    await saveTacticalProject(p2, false);

    const list = await listTacticalProjects();
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe('proj-2'); // latest first
    expect(list[1].id).toBe('proj-1');
  });

  it('複数プロジェクトを一括削除（deleteTacticalProjects）できる', async () => {
    const p1 = await createNewTacticalProject('P1', true);
    const p2 = await createNewTacticalProject('P2', false);
    const p3 = await createNewTacticalProject('P3', false);

    const listBefore = await listTacticalProjects();
    expect(listBefore).toHaveLength(3);

    // Delete p1 (active) and p2
    const { deleteTacticalProjects } = await import('../tactical-projects-db');
    await deleteTacticalProjects([p1.id, p2.id]);

    const listAfter = await listTacticalProjects();
    expect(listAfter).toHaveLength(1);
    expect(listAfter[0].id).toBe(p3.id);

    const active = await loadActiveProjectFromDb();
    expect(active).toBeNull();
  });

  it('複数JSONファイルを一括インポート（importMultipleTacticalProjects）できる', async () => {
    const p1 = createDefaultProject('bulk-1');
    p1.title = 'Bulk Proj 1';
    const p2 = createDefaultProject('bulk-2');
    p2.title = 'Bulk Proj 2';

    const file1 = new File([JSON.stringify(p1)], 'p1.json', {
      type: 'application/json',
    });
    const file2 = new File([JSON.stringify(p2)], 'p2.json', {
      type: 'application/json',
    });

    const { importMultipleTacticalProjects } = await import(
      '../tactical-projects-db'
    );
    const result = await importMultipleTacticalProjects([file1, file2]);

    expect(result.errors).toHaveLength(0);
    expect(result.imported).toHaveLength(2);

    const list = await listTacticalProjects();
    expect(list).toHaveLength(2);
  });
});
