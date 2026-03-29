"use client";

/**
 * Providers — TanStack Query のグローバル設定
 *
 * 設計意図:
 * - QueryClient を useState で初期化し、SSR時の再生成を防止
 * - staleTime: 5分 — IndexedDBデータは頻繁に変わらないため
 * - gcTime: 30分 — メモリ圧迫を防ぎつつ再フェッチを抑制
 * - DevTools は開発時のみ表示
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 30,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
