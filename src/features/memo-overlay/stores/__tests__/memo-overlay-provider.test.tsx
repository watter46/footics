import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  MemoOverlayStoreProvider,
  useMemoOverlayContext,
  useMemoOverlayStoreContext,
} from '../memo-overlay-provider';
import {
  createMemoOverlayStore,
  useMemoOverlayStore,
} from '../memo-overlay-store';
import type { MemoOverlayInitialState } from '../memo-overlay-types';

describe('createMemoOverlayStore', () => {
  it('初期値なしでデフォルト状態が生成されること', () => {
    const store = createMemoOverlayStore();
    const state = store.getState();

    expect(state.mode).toBe('EVENT');
    expect(state.phase).toBe(0);
    expect(state.timeStr).toBe('');
    expect(state.selectedLabels).toEqual([]);
    expect(state.labelInput).toBe('');
    expect(state.memo).toBe('');
    expect(state.period).toBe(1);
    expect(state.isModalOpen).toBe(false);
  });

  it('initialState を渡したプロパティが確定注入されること', () => {
    const initialState: MemoOverlayInitialState = {
      mode: 'MATCH',
      phase: 1,
      timeStr: '15:30',
      selectedLabels: ['Shot', 'Goal'],
      labelInput: 'Pass',
      memo: 'Initial tactical note',
      period: 2,
      eventId: 'event-123',
      isModalOpen: true,
    };

    const store = createMemoOverlayStore(initialState);
    const state = store.getState();

    expect(state.mode).toBe('MATCH');
    expect(state.phase).toBe(1);
    expect(state.timeStr).toBe('15:30');
    expect(state.selectedLabels).toEqual(['Shot', 'Goal']);
    expect(state.labelInput).toBe('Pass');
    expect(state.memo).toBe('Initial tactical note');
    expect(state.period).toBe(2);
    expect(state.eventId).toBe('event-123');
    expect(state.isModalOpen).toBe(true);
  });

  it('生成された複数ストアが互いに独立していること', () => {
    const store1 = createMemoOverlayStore({ memo: 'Store 1' });
    const store2 = createMemoOverlayStore({ memo: 'Store 2' });

    store1.getState().setMemo('Store 1 Updated');

    expect(store1.getState().memo).toBe('Store 1 Updated');
    expect(store2.getState().memo).toBe('Store 2');
  });
});

describe('MemoOverlayStoreProvider & Hooks', () => {
  beforeEach(() => {
    useMemoOverlayStore.getState().reset('EVENT');
    useMemoOverlayStore.getState().setMemo('Singleton Memo');
  });

  it('Provider 配下で initialState が確定注入され useMemoOverlayStoreContext で取得できること', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoOverlayStoreProvider
        initialState={{ memo: 'Injected Memo', period: 2 }}
      >
        {children}
      </MemoOverlayStoreProvider>
    );

    const { result } = renderHook(
      () => ({
        memo: useMemoOverlayStoreContext((s) => s.memo),
        period: useMemoOverlayStoreContext((s) => s.period),
      }),
      { wrapper },
    );

    expect(result.current.memo).toBe('Injected Memo');
    expect(result.current.period).toBe(2);
  });

  it('useMemoOverlayContext で状態およびアクションが取得・更新できること', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoOverlayStoreProvider initialState={{ memo: 'Test Memo' }}>
        {children}
      </MemoOverlayStoreProvider>
    );

    const { result } = renderHook(
      () => ({
        memo: useMemoOverlayContext((s) => s.memo),
        setMemo: useMemoOverlayContext((s) => s.setMemo),
      }),
      { wrapper },
    );

    expect(result.current.memo).toBe('Test Memo');

    act(() => {
      result.current.setMemo('New Memo Text');
    });

    expect(result.current.memo).toBe('New Memo Text');
  });

  it('useMemoOverlayContext をセレクタなしで呼び出して全状態を取得できること', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoOverlayStoreProvider initialState={{ memo: 'Full State Test' }}>
        {children}
      </MemoOverlayStoreProvider>
    );

    const { result } = renderHook(() => useMemoOverlayContext(), { wrapper });

    expect(result.current.memo).toBe('Full State Test');
    expect(typeof result.current.setMemo).toBe('function');
  });

  it('Provider 外での呼び出し時はシングルトン useMemoOverlayStore にフォールバックすること', () => {
    const { result } = renderHook(() => ({
      memoContext: useMemoOverlayContext((s) => s.memo),
      memoStoreContext: useMemoOverlayStoreContext((s) => s.memo),
      setMemo: useMemoOverlayContext((s) => s.setMemo),
    }));

    expect(result.current.memoContext).toBe('Singleton Memo');
    expect(result.current.memoStoreContext).toBe('Singleton Memo');

    act(() => {
      result.current.setMemo('Updated Singleton Memo');
    });

    expect(useMemoOverlayStore.getState().memo).toBe('Updated Singleton Memo');
  });

  it('複数の Provider インスタンスが互いに干渉しないこと', () => {
    const wrapper1 = ({ children }: { children: ReactNode }) => (
      <MemoOverlayStoreProvider initialState={{ memo: 'Scope 1' }}>
        {children}
      </MemoOverlayStoreProvider>
    );
    const wrapper2 = ({ children }: { children: ReactNode }) => (
      <MemoOverlayStoreProvider initialState={{ memo: 'Scope 2' }}>
        {children}
      </MemoOverlayStoreProvider>
    );

    const { result: r1 } = renderHook(
      () => ({
        memo: useMemoOverlayContext((s) => s.memo),
        setMemo: useMemoOverlayContext((s) => s.setMemo),
      }),
      { wrapper: wrapper1 },
    );

    const { result: r2 } = renderHook(
      () => ({
        memo: useMemoOverlayContext((s) => s.memo),
        setMemo: useMemoOverlayContext((s) => s.setMemo),
      }),
      { wrapper: wrapper2 },
    );

    act(() => {
      r1.current.setMemo('Scope 1 Changed');
    });

    expect(r1.current.memo).toBe('Scope 1 Changed');
    expect(r2.current.memo).toBe('Scope 2');
  });
});
