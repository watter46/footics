import { z } from 'zod';

/**
 * ObjectType
 * Represents the different types of drawing objects supported.
 */
export type ObjectType = 
    | 'rect' 
    | 'circle' 
    | 'ellipse' 
    | 'arrow' 
    | 'line' 
    | 'highlight' 
    | 'spotlight' 
    | 'connector' 
    | 'path'
    | 'image';

/**
 * DrawingObjectSchema
 * The Single Source of Truth for our reactive drawing model.
 * All coordinates (x, y, width, height, etc.) are in 0-100 normalized units.
 */
export const DrawingObjectSchema = z.object({
  id: z.string(),
  type: z.enum([
    'rect', 
    'circle', 
    'ellipse', 
    'arrow', 
    'line', 
    'highlight', 
    'spotlight', 
    'connector', 
    'path',
    'image'
  ]),
  
  // Normalized 0-100 Space
  x: z.number(),
  y: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  
  // Ellipse specific
  rx: z.number().optional(),
  ry: z.number().optional(),
  
  // Line / Arrow specific
  x1: z.number().optional(),
  y1: z.number().optional(),
  x2: z.number().optional(),
  y2: z.number().optional(),
  
  // Path specific
  pathData: z.string().optional(),
  
  // Transformation
  angle: z.number().default(0),
  scaleX: z.number().default(1),
  scaleY: z.number().default(1),
  
  // Styling
  fill: z.string().default('#ff000033'),
  stroke: z.string().default('#ff0000'),
  strokeWidth: z.number().default(2),
  strokeDashArray: z.array(z.number()).nullable().optional(),
  opacity: z.number().default(1),
  
  // Metadata
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
  name: z.string().optional(),
  
  // Image properties
  url: z.string().optional(),
  
  // Relationship
  fromId: z.string().optional(), // Used by Connector
  toId: z.string().optional(),
});

export type DrawingObject = z.infer<typeof DrawingObjectSchema>;

/**
 * ObjectProperties
 * Subset of DrawingObject representing stylable properties.
 */
export type ObjectProperties = Pick<DrawingObject, 
  'fill' | 'stroke' | 'strokeWidth' | 'strokeDashArray' | 'opacity' | 'visible' | 'locked'
>;

/**
 * HistorySnapshot
 * Represents a point-in-time state of all objects on the canvas.
 */
export interface HistorySnapshot {
  objects: DrawingObject[];
  timestamp: number;
}
