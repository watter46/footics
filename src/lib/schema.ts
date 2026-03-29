/**
 * FootLog Event Schema
 *
 * 設計意図:
 * WhoScoredの生イベントデータと、分析官が付与するメモ・タグを
 * 型安全に管理するためのZodスキーマ。
 * IndexedDB保存時のバリデーションゲートとして機能する。
 */
import { z } from "zod";

// ──────────────────────────────────────────────
// WhoScored Raw Event Schema
// ──────────────────────────────────────────────

/** WhoScoredから取得する生イベントの最小構造 */
export const WhoScoredEventSchema = z.object({
  id: z.number().int(),
  matchId: z.number().int(),
  minute: z.number().int().min(0),
  second: z.number().int().min(0).max(59),
  type: z.string().min(1),
  playerId: z.number().int().optional(),
  playerName: z.string().optional(),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
});

export type WhoScoredEvent = z.infer<typeof WhoScoredEventSchema>;

// ──────────────────────────────────────────────
// Event Memo Schema (WhoScored + 独自フィールド)
// ──────────────────────────────────────────────

/** 分析官がイベントに付与するメモ・タグ */
export const EventMemoSchema = WhoScoredEventSchema.extend({
  memo: z.string().default(""),
  tags: z.array(z.string()).default([]),
  updatedAt: z.number().default(() => Date.now()),
});

export type EventMemo = z.infer<typeof EventMemoSchema>;

// ──────────────────────────────────────────────
// Custom Event Schema (カスタムイベント — 旧 custom-events/store)
// ──────────────────────────────────────────────

/** 分析官が手動で追加するカスタムイベント */
export const CustomEventSchema = z.object({
  id: z.string().uuid(),
  match_id: z.string(),
  minute: z.number().int().min(0),
  second: z.number().int().min(0).max(59),
  labels: z.array(z.string().min(1)).min(1),
  memo: z.string().default(""),
  created_at: z.number(),
});

export type CustomEvent = z.infer<typeof CustomEventSchema>;
