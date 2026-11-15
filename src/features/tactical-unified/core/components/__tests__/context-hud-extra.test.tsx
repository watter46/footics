import { render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it } from 'vitest';
import {
  createDocumentStore,
  type DocumentStore,
} from '@/features/tactical-unified/stores/document-store';
import {
  createSessionStore,
  type SessionStore,
} from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { toScreenNormCoord } from '@/lib/types/tactical/branded';
import type { CanvasNodesRegistry } from '../../utils/canvas-registry';
import {
  ContextHud,
  HUD_CONTENT_RENDERERS,
  registerHudContentRenderer,
} from '../ContextHud';
import {
  HUD_TARGET_RESOLVERS,
  registerHudTargetResolver,
  resolveHudTarget,
} from '../hud/hud-targets';

function createTestStores() {
  const project = createDefaultTacticalProject();
  const phase = project.phases[0];
  const slide = phase.slides[0];
  const documentStore = createDocumentStore({
    ...project,
    phases: [
      {
        ...phase,
        slides: [
          {
            ...slide,
            players: [
              {
                id: 'p1',
                team: 'home',
                area: 'pitch',
                x: toScreenNormCoord(10),
                y: toScreenNormCoord(10),
                shirtNo: '10',
                connectLines: [],
                badges: [],
                style: {
                  color: '#034694',
                  strokeColor: '#ffffff',
                  strokeWidth: 2,
                  markerType: 'circle',
                  insideContent: 'number',
                  bottomLabel: 'name',
                  sizeScale: 1.0,
                  numberSizeScale: 1.0,
                  labelSizeScale: 1.0,
                },
              },
            ],
          },
        ],
      },
    ],
  });
  const sessionStore = createSessionStore({
    activePhaseId: phase.id,
    activeSlideId: slide.id,
  });
  return { documentStore, sessionStore };
}

function renderWithStore(
  ui: React.ReactElement,
  stores?: { documentStore: DocumentStore; sessionStore: SessionStore },
) {
  const resolvedStores = stores ?? createTestStores();
  const utils = render(
    <TacticalStoreProvider stores={resolvedStores}>{ui}</TacticalStoreProvider>,
  );
  return { ...resolvedStores, ...utils };
}

describe('ContextHud Extra Plugins (renderExtraHud & resolveExtraTarget)', () => {
  it('renderExtraHud で渡したカスタムコンポーネントが描画されること', () => {
    const stores = createTestStores();
    stores.sessionStore.getState().selectObject({ id: 'ball', kind: 'ball' });

    renderWithStore(
      <ContextHud
        stageSize={{ width: 800, height: 600 }}
        resolveExtraTarget={(selected, _offset) => {
          if (selected.kind === 'ball') {
            return { x: 400, y: 300, height: 24 };
          }
          return null;
        }}
        renderExtraHud={(selected) => (
          <button type="button" data-testid="custom-ball-hud">
            Ball Locked: {selected.id}
          </button>
        )}
      />,
      stores,
    );

    const extraHud = screen.getByTestId('custom-ball-hud');
    expect(extraHud).toBeDefined();
    expect(extraHud.textContent).toBe('Ball Locked: ball');
  });

  it('resolveExtraTarget が標準のターゲット解決より優先されること', () => {
    const stores = createTestStores();
    stores.sessionStore.getState().selectObject({ id: 'p1', kind: 'player' });

    const { container } = renderWithStore(
      <ContextHud
        stageSize={{ width: 800, height: 600 }}
        resolveExtraTarget={() => {
          // 強制的に x: 500, y: 400 に配置
          return { x: 500, y: 400, height: 32 };
        }}
      />,
      stores,
    );

    const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
    expect(toolbar).not.toBeNull();
    // computeClampedHudPos: targetX 500 -> clampedX 500
    expect(toolbar.style.left).toBe('500px');
  });

  it('selected.kind === "ball" で nodesRegistryRef.current.ballNode からフォールバック解決されること', () => {
    const stores = createTestStores();
    stores.sessionStore.getState().selectObject({ id: 'ball', kind: 'ball' });

    const fakeNodesRegistryRef = {
      current: {
        ballNode: {
          getClientRect: () => ({
            x: 200,
            y: 150,
            width: 20,
            height: 20,
          }),
        },
      },
    } as unknown as React.MutableRefObject<CanvasNodesRegistry>;

    const { container } = renderWithStore(
      <ContextHud
        stageSize={{ width: 800, height: 600 }}
        nodesRegistryRef={fakeNodesRegistryRef}
        renderExtraHud={() => <span data-testid="ball-indicator">Ball</span>}
      />,
      stores,
    );

    const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
    expect(toolbar).not.toBeNull();
    expect(screen.getByTestId('ball-indicator')).toBeDefined();
    // ballNode.rect.x(200) + width/2(10) = 210
    expect(toolbar.style.left).toBe('210px');
  });

  it('isDragging === true の時は ContextHud が null (描画されない) になること', () => {
    const stores = createTestStores();
    stores.sessionStore.getState().selectObject({ id: 'p1', kind: 'player' });
    stores.sessionStore.getState().setIsDragging(true);

    const { container } = renderWithStore(
      <ContextHud stageSize={{ width: 800, height: 600 }} />,
      stores,
    );

    expect(container.firstChild).toBeNull();
  });

  describe('Plugin Registry (HUD Target & Content)', () => {
    it('registerHudTargetResolver でカスタム種別のターゲット解決を登録できること', () => {
      expect(HUD_TARGET_RESOLVERS).toBeDefined();
      registerHudTargetResolver(
        'custom-item' as any,
        ({ selected, offset }) => {
          return { x: offset.x + 50, y: offset.y + 50, height: 20 };
        },
      );

      const target = resolveHudTarget({
        selected: { id: 'c1', kind: 'custom-item' as any },
        offset: { x: 10, y: 20, width: 100, height: 100 },
        data: { players: [], arrows: [], zones: [], texts: [] },
      });

      expect(target).toEqual({ x: 60, y: 70, height: 20 });
    });

    it('registerHudContentRenderer でカスタム種別のHUD描画を登録できること', () => {
      expect(HUD_CONTENT_RENDERERS).toBeDefined();
      registerHudContentRenderer('custom-item' as any, (selected) => (
        <span data-testid="custom-item-hud">Item: {selected.id}</span>
      ));

      const stores = createTestStores();
      stores.sessionStore
        .getState()
        .selectObject({ id: 'c1', kind: 'custom-item' as any });

      renderWithStore(
        <ContextHud
          stageSize={{ width: 800, height: 600 }}
          resolveExtraTarget={() => ({ x: 400, y: 300, height: 20 })}
        />,
        stores,
      );

      const hudItem = screen.getByTestId('custom-item-hud');
      expect(hudItem).toBeDefined();
      expect(hudItem.textContent).toBe('Item: c1');
    });
  });
});
