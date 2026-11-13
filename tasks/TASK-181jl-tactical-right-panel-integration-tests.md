# TASK-181jl: Right Panel 統合テスト群の Domain 移行

- **Status**: `DONE`
- **Priority**: HIGH
- **Created**: 2026-11-13
- **Parent**: plan-tactical-legacy-removal.md (181j)
- **Commit**: `test(tactical): migrate RightPanel formation, tab, and screen background tests to Domain stores`

---

## 🎯 目的・背景

`<RightPanel />` と全サブパネルの移行完了後に、`formation-panel-step5.test.tsx`・`right-panel-tabs.test.tsx`・`screen-background-panel.test.tsx` から旧 `useTacticalUnifiedStore` / `squad-to-tactical-bridge` 依存を除去し、`TacticalStoreProvider` を用いた結合テストへ統一する。

## 🚨 残存禁止条件 (Negative Contracts)

- 上記 3 テストファイルに `tactical-unified-store` / `useTacticalUnifiedStore` / `squad-to-tactical-bridge` / `@/lib/types/tactical-unified` の参照を残してはならない。

---

## 🏗️ Phase 構成

- **Phase 1**: `formation-panel-step5.test.tsx`・`right-panel-tabs.test.tsx`（0プロダクション＋2テスト）
- **Phase 2**: `screen-background-panel.test.tsx`（0プロダクション＋1テスト）

---

### Phase 1: `formation-panel-step5.test.tsx` & `right-panel-tabs.test.tsx`

- **担当ファイル**:
  - `src/features/tactical-unified/panels/right-panel/__tests__/formation-panel-step5.test.tsx`
  - `src/features/tactical-unified/panels/right-panel/__tests__/right-panel-tabs.test.tsx`

#### Task 1.1 `[MODIFY]` `src/features/tactical-unified/panels/right-panel/__tests__/formation-panel-step5.test.tsx`

**Before:**
```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import * as squadBridge from '@/lib/tactical/squad-to-tactical-bridge';
import { FormationCustomManager } from '../formation-custom-manager';
import { FormationPanel } from '../formation-panel';
import { QUICK_FORMATIONS } from '../formation-presets-data';
import { FormationTeamToggle } from '../formation-team-toggle';
import { RightPanel } from '../right-panel';
```
**After:**
```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  type TacticalStores,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { FormationCustomManager } from '../formation-custom-manager';
import { FormationPanel } from '../formation-panel';
import { QUICK_FORMATIONS } from '../formation-presets-data';
import { FormationTeamToggle } from '../formation-team-toggle';
import { RightPanel } from '../right-panel';

function createFormationTestStores(): {
  stores: TacticalStores;
  phaseId: string;
  slideId: string;
} {
  const project = createDefaultTacticalProject();
  const p0 = project.phases[0]!;
  const s0 = p0.slides[0]!;
  return {
    phaseId: p0.id,
    slideId: s0.id,
    stores: {
      documentStore: createDocumentStore(project),
      sessionStore: createSessionStore({
        activePhaseId: p0.id,
        activeSlideId: s0.id,
      }),
      playbackStore: createPlaybackStore(),
    },
  };
}
```

- 各 `render(<FormationPanel />)` / `render(<RightPanel />)` / `render(<FormationCustomManager ... />)` を `<TacticalStoreProvider stores={stores}>` でラップする。
- `useTacticalUnifiedStore.getState().loadProject(...)` による 20名選手セットアップは `stores.documentStore.getState().dispatch({ type: 'APPLY_SLIDE_COMMAND', phaseId, slideId, command: { type: 'REPLACE_PLAYERS', players } })` へ置換し、アサーションは `selectDomainActiveSlide(stores.documentStore.getState().project, phaseId, slideId)` で検証する。
- 旧 `vi.spyOn(squadBridge, 'injectTeamSquadToTactical')` は廃止し、クラブプリセット適用テストは `stores.documentStore.getState().project` 上の選手反映を直接検証する（`vi`・`squadBridge` を削除）。

#### Task 1.2 `[MODIFY]` `src/features/tactical-unified/panels/right-panel/__tests__/right-panel-tabs.test.tsx`

**Before:**
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { CameraControlPanel } from '../camera-control-panel';
import { FormationPanel } from '../formation-panel';
import { RightPanel } from '../right-panel';
import { SquadSubPanel } from '../squad-sub-panel';
```
**After:**
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { CameraControlPanel } from '../camera-control-panel';
import { FormationPanel } from '../formation-panel';
import { RightPanel } from '../right-panel';
import { SquadSubPanel } from '../squad-sub-panel';

function setupRightPanelStores(workspaceMode: 'board' | 'director' = 'board') {
  const project = createDefaultTacticalProject();
  const p0 = project.phases[0]!;
  const s0 = p0.slides[0]!;
  const stores = {
    documentStore: createDocumentStore(project),
    sessionStore: createSessionStore({
      workspaceMode,
      activePhaseId: p0.id,
      activeSlideId: s0.id,
    }),
    playbackStore: createPlaybackStore(),
  };
  return { stores, phaseId: p0.id, slideId: s0.id };
}
```

- `render(<RightPanel />)` / `render(<CameraControlPanel />)` 等を `<TacticalStoreProvider stores={stores}>` でラップする。
- `useTacticalUnifiedStore.getState().project.slides.find(...)` アサーションは `selectDomainActiveSlide(stores.documentStore.getState().project, phaseId, slideId)` へ置換する。

---

### Phase 2: `screen-background-panel.test.tsx`

- **担当ファイル**:
  - `src/features/tactical-unified/panels/right-panel/__tests__/screen-background-panel.test.tsx`

#### Task 2.1 `[MODIFY]` `src/features/tactical-unified/panels/right-panel/__tests__/screen-background-panel.test.tsx`

**Before:**
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { RightPanel } from '../right-panel';
import { ScreenBackgroundPanel } from '../screen-background-panel';
```
**After:**
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { selectDomainActivePhase } from '@/features/tactical-unified/stores/domain-selectors';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { RightPanel } from '../right-panel';
import { ScreenBackgroundPanel } from '../screen-background-panel';

function renderWithDomainStores(
  ui: React.ReactElement,
  options?: { isRightPanelOpen?: boolean },
) {
  const project = createDefaultTacticalProject();
  const p0 = project.phases[0]!;
  const sessionStore = createSessionStore({
    activePhaseId: p0.id,
    activeSlideId: p0.slides[0]?.id ?? '',
  });
  if (options?.isRightPanelOpen !== undefined) {
    sessionStore.getState().setRightPanelOpen(options.isRightPanelOpen);
  }
  const stores = {
    documentStore: createDocumentStore(project),
    sessionStore,
    playbackStore: createPlaybackStore(),
  };
  return {
    stores,
    phaseId: p0.id,
    ...render(
      <TacticalStoreProvider stores={stores}>{ui}</TacticalStoreProvider>,
    ),
  };
}
```

- `screenBackground` のアサーションは `stores.documentStore.getState().project.screenBackground?.type` へ変更する。
- `boundaryBox` のアサーションは Domain V3 に従い `selectDomainActivePhase(stores.documentStore.getState().project, phaseId)?.boundaryBox` で検証する（`project.slides.find(...)?.boundaryBox` を廃止）。
- 最終 `describe('RightPanel Screen Tab Integration')` は `renderWithDomainStores(<RightPanel />, { isRightPanelOpen: false / true })` で検証する。
