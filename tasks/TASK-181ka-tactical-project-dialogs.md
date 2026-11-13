# TASK-181ka: Project Dialogs UI の 3ストア・Domain 型移行

- **Status**: TODO
- **Priority**: HIGH
- **Created**: 2026-11-13
- **Parent**: plan-tactical-legacy-removal.md (181k)
- **Commit**: `refactor(tactical): migrate project manager dialogs and utilities to 3-store architecture`

---

## 🎯 目的・背景

`panels/dialogs/**` 配下 6 ファイルから旧 `tactical-unified-store` / `defaultTacticalUnifiedStore` / `tactical-unified-store-provider` / `@/lib/types/tactical-unified` 依存を排除し、`DocumentStore` / `SessionStore` および `normalizeTacticalProject` ACL + `@/lib/types/tactical/*` へ移行する。

## 🚨 残存禁止条件 (Negative Contracts)

- `useTacticalUnifiedStoreContext` / `defaultTacticalUnifiedStore` / `@/lib/types/tactical-unified` を `panels/dialogs/**` に残してはならない。
- `renameProjectHelper` に旧ストアフォールバックを残してはならない。
- `...existing code...` 等の省略記法を残してはならない。

---

## 🏗️ Phase 構成

- **Phase 1**: Dialog ユーティリティ・アクション・新規作成フォーム移行（3プロダクションファイル）
- **Phase 2**: Import/Export・一覧・モーダル本体移行（3プロダクションファイル）

---

### Phase 1: Dialog ユーティリティ・アクション・新規作成フォーム移行

- **担当ファイル**:
  - `src/features/tactical-unified/panels/dialogs/project-dialog-utils.ts`
  - `src/features/tactical-unified/panels/dialogs/use-project-actions.ts`
  - `src/features/tactical-unified/panels/dialogs/project-create-form.tsx`

#### Task 1.1 `[MODIFY]` `src/features/tactical-unified/panels/dialogs/project-dialog-utils.ts`

**Before:**
```ts
import { toast } from 'sonner';
import { defaultTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
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
```
**After:**
```ts
import { toast } from 'sonner';
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
import type { TacticalProject } from '@/lib/types/tactical/project';
```

**Before:**
```ts
    if (currentProjectId === editingId) {
      (setTitle ?? defaultTacticalUnifiedStore.getState().setTitle)(trimmed);
    }
```
**After:**
```ts
    if (currentProjectId === editingId) {
      setTitle?.(trimmed);
    }
```

#### Task 1.2 `[MODIFY]` `src/features/tactical-unified/panels/dialogs/use-project-actions.ts`

**Before:**
```ts
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import {
  getTacticalProjectById,
  type TacticalProjectSummary,
} from '@/lib/db/tactical-projects-db';
import { saveActiveProjectToDb } from '@/lib/tactical/tactical-storage';
```
**After:**
```ts
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import {
  getTacticalProjectById,
  type TacticalProjectSummary,
} from '@/lib/db/tactical-projects-db';
import { normalizeTacticalProject } from '@/lib/tactical/acl/legacy-project-translator';
import { saveActiveProjectToDb } from '@/lib/tactical/tactical-storage';
```

**Before:**
```ts
export function useProjectActions({
  onRefresh,
  onClose,
}: UseProjectActionsOptions) {
  const currentProject = useTacticalUnifiedStoreContext((s) => s.project);
  const isDirty = useTacticalUnifiedStoreContext((s) => s.isDirty);
  const loadProject = useTacticalUnifiedStoreContext((s) => s.loadProject);
  const setSaveStatus = useTacticalUnifiedStoreContext((s) => s.setSaveStatus);
  const setTitle = useTacticalUnifiedStoreContext((s) => s.setTitle);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  const switchActiveProject = async (id: string) => {
    if (id === currentProject.id) return onClose();
    try {
      if (isDirty) await saveActiveProjectToDb(currentProject);
      const full = await getTacticalProjectById(id);
      if (!full) return toast.error('プロジェクトが見つかりませんでした');
      await saveActiveProjectToDb(full);
      loadProject(full);
      setSaveStatus('saved');
      toast.success(`「${full.title || 'Untitled Project'}」を読み込みました`);
      onClose();
    } catch (err) {
      console.error('Failed to switch project:', err);
      toast.error('プロジェクトの切り替えに失敗しました');
    }
  };

  const handleBulkDelete = async (ids: Set<string>, onClear: () => void) => {
    setIsProcessingBulk(true);
    try {
      await bulkDeleteProjectsHelper(
        ids,
        currentProject.id,
        loadProject,
        onClear,
        onRefresh,
      );
    } finally {
      setIsProcessingBulk(false);
    }
  };
```
**After:**
```ts
export function useProjectActions({
  onRefresh,
  onClose,
}: UseProjectActionsOptions) {
  const currentProject = useDocumentStore((s) => s.project);
  const isDirty = useDocumentStore((s) => s.isDirty);
  const loadProject = useDocumentStore((s) => s.loadProject);
  const dispatch = useDocumentStore((s) => s.dispatch);
  const setActivePhaseId = useSessionStore((s) => s.setActivePhaseId);
  const setActiveSlideId = useSessionStore((s) => s.setActiveSlideId);
  const setSaveStatus = useSessionStore((s) => s.setSaveStatus);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  const applyLoadedProject = (rawProject: unknown) => {
    const bundle = normalizeTacticalProject(rawProject);
    loadProject(bundle.project);
    setActivePhaseId(bundle.activePhaseId);
    setActiveSlideId(bundle.activeSlideId);
    return bundle.project;
  };

  const setTitle = (title: string) => {
    dispatch({ type: 'UPDATE_PROJECT_META', patch: { title } });
  };

  const switchActiveProject = async (id: string) => {
    if (id === currentProject.id) return onClose();
    try {
      if (isDirty) await saveActiveProjectToDb(currentProject);
      const full = await getTacticalProjectById(id);
      if (!full) return toast.error('プロジェクトが見つかりませんでした');
      const domainProj = applyLoadedProject(full);
      await saveActiveProjectToDb(domainProj);
      setSaveStatus('saved');
      toast.success(
        `「${domainProj.title || 'Untitled Project'}」を読み込みました`,
      );
      onClose();
    } catch (err) {
      console.error('Failed to switch project:', err);
      toast.error('プロジェクトの切り替えに失敗しました');
    }
  };

  const handleBulkDelete = async (ids: Set<string>, onClear: () => void) => {
    setIsProcessingBulk(true);
    try {
      await bulkDeleteProjectsHelper(
        ids,
        currentProject.id,
        applyLoadedProject,
        onClear,
        onRefresh,
      );
    } finally {
      setIsProcessingBulk(false);
    }
  };
```

**Before:**
```ts
    handleDelete: (
      e: React.MouseEvent,
      p: TacticalProjectSummary,
      onDeselect: (id: string) => void,
    ) => {
      e.stopPropagation();
      deleteProjectHelper(
        p,
        currentProject.id,
        loadProject,
        onDeselect,
        onRefresh,
      );
    },
```
**After:**
```ts
    handleDelete: (
      e: React.MouseEvent,
      p: TacticalProjectSummary,
      onDeselect: (id: string) => void,
    ) => {
      e.stopPropagation();
      deleteProjectHelper(
        p,
        currentProject.id,
        applyLoadedProject,
        onDeselect,
        onRefresh,
      );
    },
```

#### Task 1.3 `[MODIFY]` `src/features/tactical-unified/panels/dialogs/project-create-form.tsx`

**Before:**
```tsx
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { saveTacticalProject } from '@/lib/db/tactical-projects-db';
import {
  type AspectRatio,
  createDefaultProject,
  getDefaultBoundaryBoxForAspect,
} from '@/lib/types/tactical-unified';
```
**After:**
```tsx
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { saveTacticalProject } from '@/lib/db/tactical-projects-db';
import { normalizeTacticalProject } from '@/lib/tactical/acl/legacy-project-translator';
import { createDefaultProject } from '@/lib/types/tactical/factory';
import type { AspectRatio } from '@/lib/types/tactical/primitives';
import { getDefaultBoundaryBoxForAspect } from '@/lib/types/tactical/slide';
```

**Before:**
```tsx
export function ProjectCreateForm({
  onCancel,
  onCreated,
}: ProjectCreateFormProps) {
  const loadProject = useTacticalUnifiedStoreContext((s) => s.loadProject);
  const setSaveStatus = useTacticalUnifiedStoreContext((s) => s.setSaveStatus);
```
**After:**
```tsx
export function ProjectCreateForm({
  onCancel,
  onCreated,
}: ProjectCreateFormProps) {
  const loadProject = useDocumentStore((s) => s.loadProject);
  const setActivePhaseId = useSessionStore((s) => s.setActivePhaseId);
  const setActiveSlideId = useSessionStore((s) => s.setActiveSlideId);
  const setSaveStatus = useSessionStore((s) => s.setSaveStatus);
```

**Before:**
```tsx
      await saveTacticalProject(proj, true);
      loadProject(proj);
      setSaveStatus('saved');
      toast.success(`「${proj.title}」を作成しました`);
```
**After:**
```tsx
      await saveTacticalProject(proj, true);
      const bundle = normalizeTacticalProject(proj);
      loadProject(bundle.project);
      setActivePhaseId(bundle.activePhaseId);
      setActiveSlideId(bundle.activeSlideId);
      setSaveStatus('saved');
      toast.success(`「${bundle.project.title ?? '新規戦術プロジェクト'}」を作成しました`);
```

- **検証 (Phase 1)**:
  ```bash
  bun run ai:check src/features/tactical-unified/panels/dialogs/project-dialog-utils.ts src/features/tactical-unified/panels/dialogs/use-project-actions.ts src/features/tactical-unified/panels/dialogs/project-create-form.tsx
  ```

---

### Phase 2: Import/Export・一覧・モーダル本体移行

- **担当ファイル**:
  - `src/features/tactical-unified/panels/dialogs/project-import-export.tsx`
  - `src/features/tactical-unified/panels/dialogs/project-list-view.tsx`
  - `src/features/tactical-unified/panels/dialogs/project-manager-modal.tsx`

#### Task 2.1 `[MODIFY]` `src/features/tactical-unified/panels/dialogs/project-import-export.tsx`

**Before:**
```tsx
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
```
**After:**
```tsx
import { useDocumentStore } from '@/features/tactical-unified/stores/tactical-store-provider';
```

**Before:**
```tsx
  const currentProjectId = useTacticalUnifiedStoreContext((s) => s.project.id);
```
**After:**
```tsx
  const currentProjectId = useDocumentStore((s) => s.project.id);
```

#### Task 2.2 `[MODIFY]` `src/features/tactical-unified/panels/dialogs/project-list-view.tsx`

**Before:**
```tsx
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
```
**After:**
```tsx
import { useDocumentStore } from '@/features/tactical-unified/stores/tactical-store-provider';
```

**Before:**
```tsx
  const currentProjectId = useTacticalUnifiedStoreContext((s) => s.project.id);
```
**After:**
```tsx
  const currentProjectId = useDocumentStore((s) => s.project.id);
```

#### Task 2.3 `[MODIFY]` `src/features/tactical-unified/panels/dialogs/project-manager-modal.tsx`

**Before:**
```tsx
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
```
**After:**
```tsx
import { useDocumentStore } from '@/features/tactical-unified/stores/tactical-store-provider';
```

**Before:**
```tsx
  const currentProject = useTacticalUnifiedStoreContext((s) => s.project);
```
**After:**
```tsx
  const currentProject = useDocumentStore((s) => s.project);
```

- **検証 (Phase 2)**:
  ```bash
  bun run ai:check src/features/tactical-unified/panels/dialogs/project-import-export.tsx src/features/tactical-unified/panels/dialogs/project-list-view.tsx src/features/tactical-unified/panels/dialogs/project-manager-modal.tsx
  ```
