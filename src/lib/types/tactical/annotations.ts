import { z } from 'zod';

// ─────────────────────────────────────────
// § 6. フリーアノテーション群
// ─────────────────────────────────────────

export const ArrowAnnotationSchema = z.object({
  id: z.string(),
  annotationType: z.literal('arrow'),
  arrowType: z
    .enum([
      'pass',
      'move',
      'dribble',
      'defend',
      'run',
      'line',
      'route_line',
      'generic',
    ])
    .default('pass'),
  curveType: z.enum(['straight', 'curved', 'arc']).default('straight'),
  points: z.array(z.object({ x: z.number(), y: z.number() })).min(2),
  controlPoint: z.object({ x: z.number(), y: z.number() }).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#ffffff'),
  strokeWidth: z.number().min(1).max(10).default(3),
  dashArray: z.array(z.number()).default([]),
  arrowHead: z.boolean().default(true),
  endMarker: z.enum(['none', 'arrow', 'dot']).optional(),
  startMarker: z.enum(['none', 'arrow', 'dot']).optional(),
  label: z.string().max(50).optional(),
  sourcePlayerId: z.string().optional(),
  targetPlayerId: z.string().optional(),
  locked: z.boolean().optional(),
});
export type ArrowAnnotation = z.infer<typeof ArrowAnnotationSchema>;
export type Arrow = ArrowAnnotation;

export const ZoneAnnotationSchema = z.object({
  id: z.string(),
  annotationType: z.literal('zone'),
  zoneType: z.enum([
    'highlight',
    'space',
    'danger',
    'pressing',
    'buildup',
    'generic',
  ]),
  shapeType: z.enum(['rect', 'ellipse', 'polygon']).optional(),
  // 幾何プロパティ (自由正規化座標)
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  rotation: z.number().optional(),
  // 多角形頂点 (polygon 用) または四角形頂点
  points: z.array(z.object({ x: z.number(), y: z.number() })).default([]),
  isComplete: z.boolean().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#f59e0b'),
  opacity: z.number().min(0).max(1).default(0.25),
  strokeColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  strokeOpacity: z.number().min(0).max(1).default(1).optional(),
  strokeWidth: z.number().min(0).max(8).default(3),
  label: z.string().max(50).optional(),
  locked: z.boolean().optional(),
});
export type ZoneAnnotation = z.infer<typeof ZoneAnnotationSchema>;
export type Zone = ZoneAnnotation;

export const TextAnnotationSchema = z.object({
  id: z.string(),
  annotationType: z.literal('text'),
  x: z.number(),
  y: z.number(),
  content: z.string().max(200),
  fontSize: z.number().min(8).max(72).default(16),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#ffffff'),
  bold: z.boolean().default(false),
  italic: z.boolean().default(false),
  locked: z.boolean().optional(),
});
export type TextAnnotation = z.infer<typeof TextAnnotationSchema>;
