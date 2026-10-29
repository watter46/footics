'use client';

import { type ReactNode, useContext, useRef } from 'react';
import { useStore } from 'zustand';
import {
  createTacticalUnifiedStore,
  defaultTacticalUnifiedStore,
  type TacticalUnifiedState,
  type TacticalUnifiedStoreApi,
  TacticalUnifiedStoreContext,
} from './tactical-unified-store';

export { TacticalUnifiedStoreContext };

export interface TacticalUnifiedStoreProviderProps {
  initialState?: Partial<TacticalUnifiedState>;
  store?: TacticalUnifiedStoreApi;
  children: ReactNode;
}

export function TacticalUnifiedStoreProvider({
  children,
  initialState,
  store,
}: TacticalUnifiedStoreProviderProps): React.JSX.Element {
  const storeRef = useRef<TacticalUnifiedStoreApi | null>(null);
  if (!storeRef.current) {
    if (store) {
      storeRef.current = store;
    } else if (initialState !== undefined) {
      storeRef.current = createTacticalUnifiedStore(initialState);
    } else {
      storeRef.current = defaultTacticalUnifiedStore;
    }
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
