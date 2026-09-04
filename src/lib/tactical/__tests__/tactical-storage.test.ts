/**
 * tactical-storage.test.ts
 * Tests for Dexie project storage utilities.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/db/schema';
import { createDefaultProject } from '@/lib/types/tactical-unified';
import {
  clearActiveProjectFromDb,
  loadActiveProjectFromDb,
  saveActiveProjectToDb,
  TACTICAL_PROJECT_STORAGE_KEY,
} from '../tactical-storage';

describe('tactical-storage', () => {
  beforeEach(async () => {
    try {
      await db.keyval.delete(TACTICAL_PROJECT_STORAGE_KEY);
    } catch {}
  });

  it('saveActiveProjectToDb と loadActiveProjectFromDb でプロジェクトが永続化・復元できる', async () => {
    const project = createDefaultProject('test-project-1');
    project.title = 'Saved Tactical Scene';

    await saveActiveProjectToDb(project);
    const loaded = await loadActiveProjectFromDb();

    expect(loaded).toBeDefined();
    expect(loaded?.id).toBe('test-project-1');
    expect(loaded?.title).toBe('Saved Tactical Scene');
    expect(loaded?.slides).toHaveLength(1);
  });

  it('clearActiveProjectFromDb で保存されたプロジェクトが削除され null になる', async () => {
    const project = createDefaultProject('test-project-2');
    await saveActiveProjectToDb(project);

    let loaded = await loadActiveProjectFromDb();
    expect(loaded).toBeDefined();

    await clearActiveProjectFromDb();
    loaded = await loadActiveProjectFromDb();
    expect(loaded).toBeNull();
  });

  it('不正なデータまたは空の時は loadActiveProjectFromDb が null を返す', async () => {
    await db.keyval.put({
      key: TACTICAL_PROJECT_STORAGE_KEY,
      value: { invalid: true } as any,
      updatedAt: Date.now(),
    });

    const loaded = await loadActiveProjectFromDb();
    expect(loaded).toBeNull();
  });
});
