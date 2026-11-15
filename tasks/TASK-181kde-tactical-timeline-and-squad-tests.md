# TASK-181kde: AnimationCanvas・useTeamSquadClient テストの Domain/実DB 移行

- **Status**: `DONE`
- **Priority**: HIGH
- **Created**: 2026-11-13
- **Parent**: plan-tactical-legacy-removal.md (181k)
- **DependsOn**: TASK-181kb, TASK-181kcb
- **Commit**: `test(tactical): migrate animation-canvas and squad-client tests away from legacy slide and bridge mocks`

---

## 🎯 目的・背景

`tactical-animation-canvas.test.ts` の `createDefaultSlide`（`@/lib/types/tactical-unified`）および `use-team-squad-client.test.tsx` の `squad-to-tactical-bridge` モックを廃止し、`DomainSlide` ヘルパー・実 Dexie ストレージ検証へ移行する。

## 🚨 残存禁止条件 (Negative Contracts)

- 両テストファイルに `@/lib/types/tactical-unified`・`squad-to-tactical-bridge` の参照やモックを残してはならない。
- `...existing code...` 等の省略記法を残してはならない。

---

## 🏗️ Phase 構成

- **Phase 1**: `tactical-animation-canvas.test.ts`・`use-team-squad-client.test.tsx` 移行（2テストファイル）

---

### Phase 1: `tactical-animation-canvas.test.ts`・`use-team-squad-client.test.tsx`

- **担当ファイル**:
  - `src/features/tactical-unified/hooks/__tests__/tactical-animation-canvas.test.ts`
  - `src/features/teams/hooks/__tests__/use-team-squad-client.test.tsx`

#### Task 1.1 `[MODIFY]` `src/features/tactical-unified/hooks/__tests__/tactical-animation-canvas.test.ts`

**Before:**
```ts
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core';
import { createDefaultSlide } from '@/lib/types/tactical-unified';
import {
  calculatePitchDimensions,
```
**After:**
```ts
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import {
  calculatePitchDimensions,
```

**Before:**
```ts
describe('createTacticalTimeline (GSAP integration)', () => {
  const slide1 = createDefaultSlide(0, 'slide-1');
  slide1.transitionDurationMs = 1000;
  slide1.pauseMs = 500;
  const slide2 = createDefaultSlide(1, 'slide-2');
  slide2.transitionDurationMs = 1000;
  slide2.pauseMs = 500;
  const slides = [slide1, slide2];
```
**After:**
```ts
function createTestSlide(
  index: number,
  id: string,
  transitionDurationMs = 1000,
  pauseMs = 500,
): DomainSlide {
  return {
    id,
    index,
    label: `Scene ${index + 1}`,
    players: [],
    arrows: [],
    zones: [],
    texts: [],
    ball: { x: clampToScreenNorm(50), y: clampToScreenNorm(50), visible: true },
    transitionDurationMs,
    pauseMs,
    easing: 'ease-in-out',
  };
}

describe('createTacticalTimeline (GSAP integration)', () => {
  const slide1 = createTestSlide(0, 'slide-1', 1000, 500);
  const slide2 = createTestSlide(1, 'slide-2', 1000, 500);
  const slides = [slide1, slide2];
```

**Before:**
```ts
    const slide1 = createDefaultSlide(0, 'slide-1');
    slide1.transitionDurationMs = 1000;
    slide1.pauseMs = 500;
    const slide2 = createDefaultSlide(1, 'slide-2');
    const slides = [slide1, slide2];
```
**After:**
```ts
    const slide1 = createTestSlide(0, 'slide-1', 1000, 500);
    const slide2 = createTestSlide(1, 'slide-2');
    const slides = [slide1, slide2];
```

**Before:**
```ts
    stopPlayback({
      slides: [createDefaultSlide(0, 'slide-1')],
      refs,
```
**After:**
```ts
    stopPlayback({
      slides: [createTestSlide(0, 'slide-1')],
      refs,
```

#### Task 1.2 `[MODIFY]` `src/features/teams/hooks/__tests__/use-team-squad-client.test.tsx`

**Before:**
```tsx
import { injectTeamSquadToTactical } from '@/lib/tactical/squad-to-tactical-bridge';
import type { MergedSquadPlayer } from '../../components/squad-player-card';
import { useTeamSquadClient } from '../use-team-squad-client';

// mock router
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

// mock tactical bridge
vi.mock('@/lib/tactical/squad-to-tactical-bridge', () => ({
  injectTeamSquadToTactical: vi.fn(),
}));
```
**After:**
```tsx
import { db } from '@/lib/db/schema';
import { normalizeTacticalProject } from '@/lib/tactical/acl/legacy-project-translator';
import {
  getTacticalProjectStorageKey,
  loadActiveProjectFromDb,
} from '@/lib/tactical/tactical-storage';
import type { MergedSquadPlayer } from '../../components/squad-player-card';
import { useTeamSquadClient } from '../use-team-squad-client';

// mock router
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));
```

**Before:**
```tsx
  it('opens tactical canvas and navigates to /tactical', () => {
    const { result } = renderHook(
      () => useTeamSquadClient({ teamId: 'chelsea' }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.handleOpenTacticalCanvas();
    });

    expect(injectTeamSquadToTactical).toHaveBeenCalledWith(
      expect.objectContaining({
        teamName: result.current.teamConfig.name,
        team: 'home',
        formation: '4-2-3-1',
        mode: 'half',
      }),
    );
    expect(pushMock).toHaveBeenCalledWith('/tactical');
  });
});
```
**After:**
```tsx
  it('opens tactical canvas and navigates to /tactical', async () => {
    await db.keyval.delete(getTacticalProjectStorageKey());
    const { result } = renderHook(
      () => useTeamSquadClient({ teamId: 'chelsea' }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      await result.current.handleOpenTacticalCanvas();
    });

    const saved = await loadActiveProjectFromDb();
    expect(saved).not.toBeNull();
    if (saved) {
      const bundle = normalizeTacticalProject(saved);
      const players = bundle.project.phases[0]?.slides[0]?.players ?? [];
      const homePlayers = players.filter((p) => p.team === 'home');
      expect(homePlayers.length).toBeGreaterThan(0);
    }
    expect(pushMock).toHaveBeenCalledWith('/tactical');
  });
});
```

---

## ✅ 完了検証コマンド

```bash
bun run ai:check src/features/tactical-unified/hooks/__tests__/tactical-animation-canvas.test.ts src/features/teams/hooks/__tests__/use-team-squad-client.test.tsx
```
