"use client";

/**
 * useMatchEvents — 指定した試合の全メモをIndexedDBから取得
 *
 * 設計意図:
 * - TanStack Query で IndexedDB の読み取りをキャッシュ管理
 * - queryKey に matchId を含むことで、試合切替時に自動キャッシュ分離
 * - enabled: matchId > 0 で無効な ID での不要クエリを防止
 */
import { useQuery } from "@tanstack/react-query";
import { getEventMemosByMatch } from "@/lib/db";
import type { EventMemo } from "@/lib/schema";

/** IndexedDB から指定試合のイベントメモを全件取得 */
export function useMatchEvents(matchId: number) {
  return useQuery<EventMemo[]>({
    queryKey: ["match-events", matchId] as const,
    queryFn: () => getEventMemosByMatch(matchId),
    enabled: matchId > 0,
  });
}
