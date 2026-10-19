'use client';

import { createContext, type ReactNode, useContext, useRef } from 'react';
import { useStore } from 'zustand';
import {
  createMemoOverlayStore,
  defaultMemoOverlayStore,
  type MemoOverlayStore,
} from './memo-overlay-store';
import type { MemoOverlayState } from './memo-overlay-types';

export const MemoOverlayStoreContext = createContext<MemoOverlayStore | null>(
  null,
);

export interface MemoOverlayStoreProviderProps {
  children: ReactNode;
  initialState?: Partial<MemoOverlayState>;
}

export function MemoOverlayStoreProvider({
  children,
  initialState,
}: MemoOverlayStoreProviderProps) {
  const storeRef = useRef<MemoOverlayStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createMemoOverlayStore(initialState);
  }
  return (
    <MemoOverlayStoreContext.Provider value={storeRef.current}>
      {children}
    </MemoOverlayStoreContext.Provider>
  );
}

export function useMemoOverlayStoreContext<T>(
  selector: (state: MemoOverlayState) => T,
): T {
  const store = useContext(MemoOverlayStoreContext);
  return useStore(store ?? defaultMemoOverlayStore, selector);
}

export function useMemoOverlayContext<T = MemoOverlayState>(
  selector?: (state: MemoOverlayState) => T,
): T {
  const store = useContext(MemoOverlayStoreContext);
  const sel = selector ?? ((state) => state as unknown as T);
  return useStore(store ?? defaultMemoOverlayStore, sel);
}
