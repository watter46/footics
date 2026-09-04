import { toast } from 'sonner';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import {
  createNewTacticalProject,
  deleteTacticalProject,
  deleteTacticalProjects,
  duplicateTacticalProject,
  exportTacticalProjectsAsZip,
  exportTacticalProjectToJson,
  getTacticalProjectById,
  listTacticalProjects,
  renameTacticalProject,
  type TacticalProjectSummary,
} from '@/lib/db/tactical-projects-db';
import { saveActiveProjectToDb } from '@/lib/tactical/tactical-storage';
import type { TacticalProject } from '@/lib/types/tactical-unified';

/** Format ISO date string to localized Japanese format. */
export function formatProjectDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/** Fallback to an existing or fresh project if the active project was deleted. */
export async function fallbackActiveProjectAfterDelete(
  deletedIds: string[],
  currentProjectId: string,
  loadProject: (p: TacticalProject) => void,
): Promise<void> {
  if (!deletedIds.includes(currentProjectId)) return;

  const remaining = await listTacticalProjects();
  if (remaining.length > 0) {
    const next = await getTacticalProjectById(remaining[0].id);
    if (next) {
      await saveActiveProjectToDb(next);
      loadProject(next);
      return;
    }
  }

  const newProj = await createNewTacticalProject('新規戦術プロジェクト', true);
  loadProject(newProj);
}

/** Export a single project to JSON file. */
export async function exportSingleProjectJson(id: string): Promise<void> {
  try {
    const full = await getTacticalProjectById(id);
    if (!full) {
      toast.error('プロジェクトデータが見つかりません');
      return;
    }
    exportTacticalProjectToJson(full);
    toast.success('JSONファイルを書き出しました');
  } catch (err) {
    console.error('Failed to export project JSON:', err);
    toast.error('JSON書き出しに失敗しました');
  }
}

/** Export multiple projects to ZIP archive. */
export async function exportProjectsZip(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    await exportTacticalProjectsAsZip(ids);
    toast.success(`${ids.length} 件のプロジェクトをZIPで書き出しました`);
  } catch (err: unknown) {
    console.error('Failed to bulk export projects:', err);
    toast.error(
      err instanceof Error ? err.message : '一括エクスポートに失敗しました',
    );
  }
}

/** Duplicate a project by ID and refresh list. */
export async function duplicateProjectHelper(
  id: string,
  onRefresh: () => Promise<void>,
): Promise<void> {
  try {
    const cloned = await duplicateTacticalProject(id);
    await onRefresh();
    toast.success(`「${cloned.title}」を作成しました`);
  } catch (err) {
    console.error('Failed to duplicate project:', err);
    toast.error('プロジェクトの複製に失敗しました');
  }
}

/** Rename project and update active store if needed. */
export async function renameProjectHelper(
  editingId: string,
  title: string,
  currentProjectId: string,
  onDone: () => void,
  onRefresh: () => Promise<void>,
): Promise<void> {
  const trimmed = title.trim() || 'Untitled Project';
  try {
    await renameTacticalProject(editingId, trimmed);
    if (currentProjectId === editingId) {
      useTacticalUnifiedStore.getState().setTitle(trimmed);
    }
    onDone();
    await onRefresh();
    toast.success('プロジェクト名を変更しました');
  } catch (err) {
    console.error('Failed to rename project:', err);
    toast.error('名前の変更に失敗しました');
  }
}

/** Delete a single project with user confirmation. */
export async function deleteProjectHelper(
  project: TacticalProjectSummary,
  currentProjectId: string,
  loadProject: (p: TacticalProject) => void,
  onDeselect: (id: string) => void,
  onRefresh: () => Promise<void>,
): Promise<void> {
  if (!window.confirm(`プロジェクト「${project.title}」を削除しますか？`))
    return;
  try {
    await deleteTacticalProject(project.id);
    onDeselect(project.id);
    toast.success('プロジェクトを削除しました');
    await fallbackActiveProjectAfterDelete(
      [project.id],
      currentProjectId,
      loadProject,
    );
    await onRefresh();
  } catch (err) {
    console.error('Failed to delete project:', err);
    toast.error('プロジェクトの削除に失敗しました');
  }
}

/** Delete multiple projects with user confirmation. */
export async function bulkDeleteProjectsHelper(
  ids: Set<string>,
  currentProjectId: string,
  loadProject: (p: TacticalProject) => void,
  onClear: () => void,
  onRefresh: () => Promise<void>,
): Promise<void> {
  const count = ids.size;
  if (
    count === 0 ||
    !window.confirm(`選択した ${count} 件のプロジェクトを削除しますか？`)
  )
    return;
  const idsArray = Array.from(ids);
  try {
    await deleteTacticalProjects(idsArray);
    onClear();
    toast.success(`${count} 件のプロジェクトを削除しました`);
    await fallbackActiveProjectAfterDelete(
      idsArray,
      currentProjectId,
      loadProject,
    );
    await onRefresh();
  } catch (err) {
    console.error('Failed to bulk delete projects:', err);
    toast.error('一括削除に失敗しました');
  }
}
