'use client';

import type React from 'react';
import { createContext, useEffect, useRef } from 'react';
import type { CanvasConfig, CanvasStoreApi } from '../types';
import { createCanvasStore } from './canvas-store';

export const CanvasStoreContext = createContext<CanvasStoreApi | null>(null);

export interface CanvasStoreProviderProps {
  config: CanvasConfig;
  onAutoSave?: (json: string) => void;
  children: React.ReactNode;
}

export function CanvasStoreProvider({
  config,
  onAutoSave,
  children,
}: CanvasStoreProviderProps): React.ReactNode {
  const storeRef = useRef<CanvasStoreApi | null>(null);

  if (!storeRef.current) {
    storeRef.current = createCanvasStore(config);
  }

  // 自動保存の購読
  useEffect(() => {
    if (!onAutoSave || !storeRef.current) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let prevAnnotationsJson = JSON.stringify(
      storeRef.current.getState().annotations,
    );

    const unsubscribe = storeRef.current.subscribe((state) => {
      const currentJson = JSON.stringify(state.annotations);
      if (currentJson !== prevAnnotationsJson) {
        prevAnnotationsJson = currentJson;
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          onAutoSave(currentJson);
        }, 400);
      }
    });

    return () => {
      unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [onAutoSave]);

  return (
    <CanvasStoreContext.Provider value={storeRef.current}>
      {children}
    </CanvasStoreContext.Provider>
  );
}
