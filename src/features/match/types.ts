import { z } from 'zod';
import type {
  IMatch,
  IEvent,
  IActionMaster,
  ITeam,
  IPlayer
} from '@/lib/types';

// ============================================================================
// Domain Entities (Re-export from global types for convenience)
// ============================================================================
export type Match = IMatch;
export type MatchEvent = IEvent; // 'Event' is a reserved word in DOM, so use MatchEvent
export type Action = IActionMaster;
export type Team = ITeam;
export type Player = IPlayer;

// ============================================================================
// Feature Specific Types
// ============================================================================

// 試合の基本情報（作成・編集用）
export const MatchSchema = z.object({
  date: z.string(),
  team1Id: z.number(),
  team2Id: z.number(),
  subjectTeamId: z.number().optional(),
  currentFormation: z.string().nullable().optional(),
  assignedPlayers: z.record(z.string(), z.number()).nullable().optional(),
});

// Dexieの型定義(IMatch)とZodの推論型(MatchInput)の不整合を解消するための型アサーション用
export type MatchInput = z.infer<typeof MatchSchema> & {
  assignedPlayers?: Record<number, number> | null;
};

// イベント記録用
export const EventSchema = z.object({
  matchId: z.number(),
  teamId: z.number().optional(),
  playerId: z.number().nullable(),
  actionId: z.number(),
  matchTime: z.string(),
  opponentPosition: z.string().optional(),
  positionName: z.string().optional(),
  memo: z.string().optional(),
  tempSlotId: z.string().nullable().optional(),
});

export type EventInput = z.infer<typeof EventSchema>;

// フォーメーション関連
export interface FormationAssignment {
  [positionKey: string]: number; // playerId
}

// UI State Types
export type MatchTab = 'record' | 'history' | 'setup';
