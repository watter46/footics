import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  createTacticalUnifiedStore,
  defaultTacticalUnifiedStore,
  useTacticalUnifiedStore,
} from '../tactical-unified-store';
import {
  TacticalUnifiedStoreProvider,
  useTacticalUnifiedStoreApi,
  useTacticalUnifiedStoreContext,
} from '../tactical-unified-store-provider';

describe('tactical-unified-store-provider', () => {
  describe('createTacticalUnifiedStore', () => {
    it('creates an independent store instance with defaults', () => {
      const store1 = createTacticalUnifiedStore();
      const store2 = createTacticalUnifiedStore();

      expect(store1).not.toBe(store2);
      expect(store1.getState().activeSlideId).toBeDefined();
      expect(store1.getState().project.id).not.toBe(
        store2.getState().project.id,
      );

      // Mutate store1, store2 should be unaffected
      act(() => {
        store1.getState().setActiveSlide('custom-slide-1');
      });
      expect(store1.getState().activeSlideId).toBe('custom-slide-1');
      expect(store2.getState().activeSlideId).not.toBe('custom-slide-1');
    });

    it('injects initial state on creation', () => {
      const store = createTacticalUnifiedStore({
        activeSlideId: 'injected-slide-id',
      });
      expect(store.getState().activeSlideId).toBe('injected-slide-id');
    });

    it('synchronizes activePhaseId and activeSlideId when initial.project is provided', () => {
      const customProject = {
        id: 'custom-proj-id',
        title: 'Custom Proj',
        phases: [
          {
            id: 'custom-phase-1',
            name: 'Phase 1',
            slides: [
              {
                id: 'custom-slide-100',
                name: 'Slide 100',
                players: [],
                arrows: [],
                shapes: [],
                texts: [],
              },
            ],
          },
        ],
        activePhaseId: 'custom-phase-1',
        activeSlideId: 'custom-slide-100',
      };
      const store = createTacticalUnifiedStore({
        project: customProject as never,
      });
      expect(store.getState().project.id).toBe('custom-proj-id');
      expect(store.getState().activePhaseId).toBe('custom-phase-1');
      expect(store.getState().activeSlideId).toBe('custom-slide-100');
    });

    it('provides temporal undo/redo API', () => {
      const store = createTacticalUnifiedStore();
      expect(store.temporal).toBeDefined();
      expect(typeof store.temporal.getState().undo).toBe('function');
    });
  });

  describe('useTacticalUnifiedStore backwards compatibility', () => {
    it('supports store property access and getState()', () => {
      expect(useTacticalUnifiedStore.getState).toBeDefined();
      expect(useTacticalUnifiedStore.temporal).toBeDefined();
      expect(useTacticalUnifiedStore.getState()).toBe(
        defaultTacticalUnifiedStore.getState(),
      );
    });

    it('can be used as a hook', () => {
      const { result } = renderHook(() =>
        useTacticalUnifiedStore((s) => s.activeSlideId),
      );
      expect(result.current).toBe(
        defaultTacticalUnifiedStore.getState().activeSlideId,
      );
    });
  });

  describe('TacticalUnifiedStoreProvider and hooks', () => {
    it('falls back to default store when outside of Provider', () => {
      const { result: apiResult } = renderHook(() =>
        useTacticalUnifiedStoreApi(),
      );
      expect(apiResult.current).toBe(defaultTacticalUnifiedStore);

      const { result: contextResult } = renderHook(() =>
        useTacticalUnifiedStoreContext((s) => s.activeSlideId),
      );
      expect(contextResult.current).toBe(
        defaultTacticalUnifiedStore.getState().activeSlideId,
      );
    });

    it('provides injected initial state via Provider', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TacticalUnifiedStoreProvider
          initialState={{ activeSlideId: 'provider-initial-slide' }}
        >
          {children}
        </TacticalUnifiedStoreProvider>
      );

      const { result: apiResult } = renderHook(
        () => useTacticalUnifiedStoreApi(),
        {
          wrapper,
        },
      );
      expect(apiResult.current).not.toBe(defaultTacticalUnifiedStore);
      expect(apiResult.current.getState().activeSlideId).toBe(
        'provider-initial-slide',
      );

      const { result: contextResult } = renderHook(
        () => useTacticalUnifiedStoreContext((s) => s.activeSlideId),
        { wrapper },
      );
      expect(contextResult.current).toBe('provider-initial-slide');
    });

    it('isolates state across multiple Providers', () => {
      const wrapper1 = ({ children }: { children: React.ReactNode }) => (
        <TacticalUnifiedStoreProvider
          initialState={{ activeSlideId: 'store-1-slide' }}
        >
          {children}
        </TacticalUnifiedStoreProvider>
      );
      const wrapper2 = ({ children }: { children: React.ReactNode }) => (
        <TacticalUnifiedStoreProvider
          initialState={{ activeSlideId: 'store-2-slide' }}
        >
          {children}
        </TacticalUnifiedStoreProvider>
      );

      const { result: res1 } = renderHook(
        () => useTacticalUnifiedStoreContext((s) => s.activeSlideId),
        { wrapper: wrapper1 },
      );
      const { result: res2 } = renderHook(
        () => useTacticalUnifiedStoreContext((s) => s.activeSlideId),
        { wrapper: wrapper2 },
      );

      expect(res1.current).toBe('store-1-slide');
      expect(res2.current).toBe('store-2-slide');
    });

    it('makes useTacticalUnifiedStore read from Context when wrapped with Provider', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TacticalUnifiedStoreProvider
          initialState={{ activeSlideId: 'provider-context-slide' }}
        >
          {children}
        </TacticalUnifiedStoreProvider>
      );

      const { result } = renderHook(
        () => useTacticalUnifiedStore((s) => s.activeSlideId),
        { wrapper },
      );
      expect(result.current).toBe('provider-context-slide');
    });

    it('uses provided custom store instance when store prop is passed', () => {
      const customStore = createTacticalUnifiedStore({
        activeSlideId: 'direct-store-prop-slide',
      });
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TacticalUnifiedStoreProvider store={customStore}>
          {children}
        </TacticalUnifiedStoreProvider>
      );

      const { result: apiResult } = renderHook(
        () => useTacticalUnifiedStoreApi(),
        {
          wrapper,
        },
      );
      expect(apiResult.current).toBe(customStore);
      expect(apiResult.current.getState().activeSlideId).toBe(
        'direct-store-prop-slide',
      );
    });

    it('shares defaultTacticalUnifiedStore when neither initialState nor store is provided', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TacticalUnifiedStoreProvider>{children}</TacticalUnifiedStoreProvider>
      );

      const { result: apiResult } = renderHook(
        () => useTacticalUnifiedStoreApi(),
        {
          wrapper,
        },
      );
      expect(apiResult.current).toBe(defaultTacticalUnifiedStore);
    });
  });
});
