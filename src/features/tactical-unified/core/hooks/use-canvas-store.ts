import { useContext } from 'react';
import { useStore } from 'zustand';
import { CanvasStoreContext } from '../store/canvas-store-provider';
import type { CanvasStore, CanvasStoreApi } from '../types';

export function useCanvasStoreApi(): CanvasStoreApi {
  const store = useContext(CanvasStoreContext);
  if (!store) {
    throw new Error('useCanvasStore must be used within a CanvasStoreProvider');
  }
  return store;
}

export function useCanvasStore<T>(selector: (state: CanvasStore) => T): T {
  const store = useCanvasStoreApi();
  return useStore(store, selector);
}
