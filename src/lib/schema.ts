/**
 * footics Event Schema
 *
 * 設計意図:
 * WhoScoredの生イベントデータと、分析官が付与するメモ・タグを
 * 型安全に管理するためのZodスキーマ。
 * IndexedDB保存時のバリデーションゲートとして機能する。
 * (Note: Dexie .upgrade() migration check guard anchor)
 */
import { z } from 'zod';

// ──────────────────────────────────────────────
// WhoScored Raw Event Schema
// ──────────────────────────────────────────────

/** WhoScoredから取得する生イベントの最小構造 */
export const WhoScoredEventSchema = z.object({
  id: z.number().int(),
  matchId: z.number().int(),
  period: z.number().int().min(1).max(16).default(1),
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
  memo: z.string().default(''),
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
  period: z.number().int().min(1).max(5).default(1),
  minute: z.number().int().min(0),
  second: z.number().int().min(0).max(59),
  labels: z.array(z.string().min(1)).min(1),
  memo: z.string().default(''),
  created_at: z.number(),
});

export type CustomEvent = z.infer<typeof CustomEventSchema>;

/** 試合全体の自由記述メモ */
export const MatchMemoSchema = z.object({
  matchId: z.string(),
  memo: z.string().default(''),
  updatedAt: z.number().default(() => Date.now()),
});

export type MatchMemo = z.infer<typeof MatchMemoSchema>;

// ──────────────────────────────────────────────
// Tactical Board Snapshots Schema
// ──────────────────────────────────────────────

/**
 * 戦術ボードのスナップショット (JSON構造化版)
 */
export const TacticalSnapshotSchema = z.object({
  matchId: z.string(),
  updatedAt: z.number(),
  isInverted: z.boolean().default(false),
  tactics: z.array(
    z.object({
      time: z.number(),
      players: z.array(
        z.object({
          playerId: z.number().int(),
          shirtNo: z.string().optional(),
          team: z.enum(['home', 'away']),
          area: z.enum(['pitch', 'bench']).optional(),
          x: z.number(),
          y: z.number(),
        }),
      ),
      assets: z.object({
        ball: z.object({
          x: z.number(),
          y: z.number(),
        }),
      }),
    }),
  ),
});

export type TacticalSnapshot = z.infer<typeof TacticalSnapshotSchema>;

// ──────────────────────────────────────────────
// Player Master & Photo & KeyVal Schema
// ──────────────────────────────────────────────

export const PlayerMasterSchema = z.object({
  id: z.string(), // '${season}_${playerId}'
  playerId: z.number(),
  name: z.string(),
  season: z.string(),
  defaultShirtNo: z.number().optional(),
  position: z.string().optional(),
  photoBlob: z.instanceof(Blob).optional(), // クエリJOIN用（物理playersテーブルには保存しない）
  photoUrl: z.string().optional(),
  teamName: z.string().optional(),
  isExcluded: z.boolean().optional(),
  updatedAt: z.number(),
});
export type PlayerMaster = z.infer<typeof PlayerMasterSchema>;

export const PlayerPhotoSchema = z.object({
  playerId: z.number(),
  photoBlob: z.instanceof(Blob),
  mimeType: z.string().default('image/webp'),
  updatedAt: z.number(),
});
export type PlayerPhoto = z.infer<typeof PlayerPhotoSchema>;

export const KeyValEntrySchema = z.object({
  key: z.string(),
  value: z.any(),
  updatedAt: z.number(),
});
export type KeyValEntry<T = any> = {
  key: string;
  value: T;
  updatedAt: number;
};
