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

  it('project.matchId を持つプロジェクトを第2引数なしで saveActiveProjectToDb に渡した際、試合専用キーに保存され単独キーを汚染しない', async () => {
    const project = createDefaultProject('test-project-match');
    project.matchId = '10';
    project.title = 'Match 10 Project';

    await saveActiveProjectToDb(project);

    // 単独キー側は保存されていない
    const singleLoaded = await db.keyval.get(TACTICAL_PROJECT_STORAGE_KEY);
    expect(singleLoaded).toBeUndefined();

    // 試合専用キー側からロードできる
    const matchLoaded = await loadActiveProjectFromDb('10');
    expect(matchLoaded?.id).toBe('test-project-match');
    expect(matchLoaded?.matchId).toBe('10');
  });

  it('単独キーに matchId を持つデータが入っている場合、loadActiveProjectFromDb() は null を返す（汚染排除）', async () => {
    const project = createDefaultProject('test-project-polluted');
    project.matchId = '10';

    // 強制的に単独キーに書き込む
    await db.keyval.put({
      key: TACTICAL_PROJECT_STORAGE_KEY,
      value: project,
      updatedAt: Date.now(),
    });

    const loaded = await loadActiveProjectFromDb();
    expect(loaded).toBeNull();
  });
});
