import { z } from 'zod';

export const TacticalSceneSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  players: z.array(
    z.object({
      id: z.string(),
      team: z.enum(['home', 'away']),
      jerseyNumber: z.number().optional(),
      x: z.number().min(0).max(100), // Normalized coordinate (0.0 to 100.0)
      y: z.number().min(0).max(100),
      annotation: z.string().max(10).optional(),
    }),
  ),
  arrows: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(['pass', 'move', 'dribble', 'defend']),
        startX: z.number().min(0).max(100),
        startY: z.number().min(0).max(100),
        endX: z.number().min(0).max(100),
        endY: z.number().min(0).max(100),
      }),
    )
    .optional(),
  zones: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(['highlight', 'space', 'danger']),
        points: z.array(z.object({ x: z.number(), y: z.number() })),
      }),
    )
    .optional(),
});

export const SyntaxIntegrationDraftSchema = z.object({
  version: z.string().default('1.0.0'),
  tacticalScenes: z.array(TacticalSceneSchema),
});

export const TuningDatasetSchema = z.object({
  datasetId: z.string(),
  timestamp: z.string().datetime(),
  matchMetadata: z.object({
    homeTeam: z.string(),
    awayTeam: z.string(),
    actionType: z.string(),
  }),
  aiDraft: SyntaxIntegrationDraftSchema,
  humanGroundTruth: SyntaxIntegrationDraftSchema,
});

export type TacticalScene = z.infer<typeof TacticalSceneSchema>;
export type SyntaxIntegrationDraft = z.infer<
  typeof SyntaxIntegrationDraftSchema
>;
export type TuningDataset = z.infer<typeof TuningDatasetSchema>;
