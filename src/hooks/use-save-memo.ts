"use client";

/**
 * useSaveMemo — メモ・タグをIndexedDBに保存し、キャッシュを自動更新
 *
 * 設計意図:
 * - Zod による入力バリデーションで不正データの書き込みを防止
 * - onSuccess で関連クエリを invalidate し、UI を自動同期
 * - mutationFn が unknown を受け入れることで、フォーム入力との疎結合を実現
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { putEventMemo } from "@/lib/db";
import { EventMemoSchema, type EventMemo } from "@/lib/schema";

interface SaveMemoInput {
  data: unknown;
  matchId: number;
}

/** メモ・タグを保存し、成功時に関連キャッシュを自動更新 */
export function useSaveMemo() {
  const queryClient = useQueryClient();

  return useMutation<EventMemo, Error, SaveMemoInput>({
    mutationFn: async ({ data }: SaveMemoInput) => {
      // Zod で入力を厳密にバリデーション
      const validated = EventMemoSchema.parse(data);
      await putEventMemo(validated);
      return validated;
    },
    onSuccess: (_result, variables) => {
      // 該当試合のメモキャッシュを無効化 → 自動再フェッチ
      queryClient.invalidateQueries({
        queryKey: ["match-events", variables.matchId],
      });
    },
  });
}
