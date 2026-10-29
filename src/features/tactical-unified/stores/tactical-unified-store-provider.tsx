'use client';

import { createContext, type ReactNode, useContext, useRef } from 'react';
import { useStore } from 'zustand';
import {
  createTacticalUnifiedStore,
  defaultTacticalUnifiedStore,
  type TacticalUnifiedState,
  type TacticalUnifiedStoreApi,
} from './tactical-unified-store';

export const TacticalUnifiedStoreContext =
  createContext<TacticalUnifiedStoreApi | null>(null);

export interface TacticalUnifiedStoreProviderProps {
  initialState?: Partial<TacticalUnifiedState>;
  children: ReactNode;
}

export function TacticalUnifiedStoreProvider({
  children,
  initialState,
}: TacticalUnifiedStoreProviderProps): React.JSX.Element {
  const storeRef = useRef<TacticalUnifiedStoreApi | null>(null);
  if (!storeRef.current) {
    storeRef.current = createTacticalUnifiedStore(initialState);
  }

  return (
    <TacticalUnifiedStoreContext.Provider value={storeRef.current}>
      {children}
    </TacticalUnifiedStoreContext.Provider>
  );
}

export function useTacticalUnifiedStoreApi(): TacticalUnifiedStoreApi {
  const context = useContext(TacticalUnifiedStoreContext);
  return context ?? defaultTacticalUnifiedStore;
}

const identity = (state: TacticalUnifiedState) => state;

export function useTacticalUnifiedStoreContext(): TacticalUnifiedState;
export function useTacticalUnifiedStoreContext<T>(
  selector: (state: TacticalUnifiedState) => T,
): T;
export function useTacticalUnifiedStoreContext<T>(
  selector?: (state: TacticalUnifiedState) => T,
): T {
  const store = useTacticalUnifiedStoreApi();
  return useStore(
    store,
    selector ?? (identity as (state: TacticalUnifiedState) => T),
  );
}
