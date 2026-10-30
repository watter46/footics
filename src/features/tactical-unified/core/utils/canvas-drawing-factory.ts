import type {
  ArrowAnnotation,
  Player,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import type { DrawingPreviewState } from '../types';

export type PreviewShapeKind =
  | 'line'
  | 'route_line'
  | 'arrow_solid'
  | 'arrow_dash'
  | 'arrow_wavy'
  | 'zone_rect'
  | 'zone_ellipse';

export type DrawingCommitActions = {
  addArrow: (a: ArrowAnnotation) => void;
  addZone: (z: ZoneAnnotation) => void;
};

export type DrawingPointPlaceContext = {
  color?: string;
  markersCount: number;
  addText: (t: TextAnnotation) => void;
  addMarker: (m: Player) => void;
  onStartEditText?: (textId: string) => void;
};

export interface DrawingToolBehavior {
  interactionKind: 'drag-shape' | 'point-place' | 'eraser';
  previewKind?: PreviewShapeKind;
  defaultPreviewColor?: string;
  commitDrag?: (
    preview: DrawingPreviewState,
    color: string,
    strokeWidth: number,
    actions: DrawingCommitActions,
  ) => void;
  placePoint?: (
    normPos: { x: number; y: number },
    ctx: DrawingPointPlaceContext,
  ) => void;
}

const DRAWING_TOOL_BEHAVIORS = new Map<string, DrawingToolBehavior>();

export function registerDrawingToolBehavior(
  tool: string,
  behavior: DrawingToolBehavior,
): void {
  DRAWING_TOOL_BEHAVIORS.set(tool, behavior);
}

export function getDrawingToolBehavior(
  tool: string,
): DrawingToolBehavior | undefined {
  return DRAWING_TOOL_BEHAVIORS.get(tool);
}

export function getDragShapeToolIds(): string[] {
  return Array.from(DRAWING_TOOL_BEHAVIORS.entries())
    .filter(([_, b]) => b.interactionKind === 'drag-shape')
    .map(([t]) => t);
}

export function resolveToolPreviewColor(
  tool: string,
  userColor?: string,
): string {
  if (userColor && userColor !== '#ffffff') return userColor;
  return getDrawingToolBehavior(tool)?.defaultPreviewColor ?? '#ffffff';
}

function createPlayerMarkerEntity(
  markerType: Player['style']['markerType'],
  x: number,
  y: number,
  color: string,
  shirtNo = '',
): Player {
  const isC = markerType === 'circle';
  return {
    id: `${isC ? 'player' : 'marker'}-${Date.now()}`,
    area: 'pitch',
    x,
    y,
    team: 'neutral',
    shirtNo: isC ? shirtNo : '',
    style: {
      markerType,
      color,
      strokeColor: '#ffffff',
      strokeWidth: 2,
      sizeScale: 1,
      numberSizeScale: 1,
      labelSizeScale: 1,
      insideContent: isC ? 'number' : 'none',
      bottomLabel: isC ? 'number' : 'none',
    },
    badges: [],
    connectLines: [],
  };
}

export const createRingMarker = (
  x: number,
  y: number,
  c = '#034694',
  _s = '',
): Player => createPlayerMarkerEntity('ring', x, y, c || '#034694');

export const createRingFadeMarker = (
  x: number,
  y: number,
  c = '#ffffff',
  _s = '',
): Player => createPlayerMarkerEntity('ring-fade', x, y, c || '#ffffff');

export const create2DPlayerMarker = (
  x: number,
  y: number,
  c = '#034694',
  shirtNo = '',
): Player => ({
  ...createPlayerMarkerEntity('circle', x, y, c || '#034694', shirtNo),
  team: 'home',
  name: `Player ${shirtNo}`,
  position: 'SUB',
});

export const createTextAnnotation = (
  x: number,
  y: number,
  color = '#ffffff',
): TextAnnotation => ({
  id: `text-${Date.now()}`,
  annotationType: 'text',
  content: 'Tactics Note',
  x,
  y,
  color: color || '#ffffff',
  fontSize: 16,
  bold: false,
  italic: false,
});

type ArrowCfg = [
  kind: PreviewShapeKind,
  type: ArrowAnnotation['arrowType'],
  head: boolean,
  dash: number[],
  end: ArrowAnnotation['endMarker'],
  color?: string,
  curve?: boolean,
];

const createArrowBehavior = (cfg: ArrowCfg): DrawingToolBehavior => ({
  interactionKind: 'drag-shape',
  previewKind: cfg[0],
  defaultPreviewColor: cfg[5],
  commitDrag: (
    { startX: sx, startY: sy, currentX: cx, currentY: cy },
    color,
    strokeWidth,
    actions,
  ) => {
    if (Math.hypot(cx - sx, cy - sy) <= 1.5) return;
    const finalColor =
      (color === '#ffffff' || !color) && cfg[5] ? cfg[5] : color || '#ffffff';
    actions.addArrow({
      id: `arrow-${Date.now()}`,
      annotationType: 'arrow',
      arrowType: cfg[1],
      curveType: cfg[6] ? 'curved' : 'straight',
      points: [
        { x: sx, y: sy },
        { x: cx, y: cy },
      ],
      color: finalColor,
      strokeWidth,
      dashArray: cfg[3],
      arrowHead: cfg[2],
      endMarker: cfg[4],
    });
  },
});

const createZoneBehavior = (
  kind: PreviewShapeKind,
  shapeType: 'rect' | 'ellipse',
): DrawingToolBehavior => ({
  interactionKind: 'drag-shape',
  previewKind: kind,
  defaultPreviewColor: '#ef4444',
  commitDrag: (
    { startX: sx, startY: sy, currentX: cx, currentY: cy },
    color,
    _sw,
    actions,
  ) => {
    if (Math.hypot(cx - sx, cy - sy) <= 1.5) return;
    const x = Math.min(sx, cx);
    const y = Math.min(sy, cy);
    const w = Math.abs(cx - sx);
    const h = Math.abs(cy - sy);
    actions.addZone({
      id: `zone-${Date.now()}`,
      annotationType: 'zone',
      zoneType: 'highlight',
      shapeType,
      x,
      y,
      width: w,
      height: h,
      points: [
        { x, y },
        { x: x + w, y },
        { x: x + w, y: y + h },
        { x, y: y + h },
      ],
      color: color && color !== '#ffffff' ? color : '#ef4444',
      opacity: 0.25,
      strokeWidth: 2,
    });
  },
});

const ARROW_DEFAULTS: Record<string, ArrowCfg> = {
  line: ['line', 'line', false, [], 'none'],
  route_line: ['route_line', 'route_line', false, [], 'dot', '#38bdf8'],
  arrow_solid: ['arrow_solid', 'pass', true, [], 'arrow'],
  'arrow-straight': ['arrow_solid', 'pass', true, [], 'arrow'],
  pass: ['arrow_solid', 'pass', true, [], 'arrow'],
  arrow_dash: ['arrow_dash', 'pass', true, [6, 4], 'arrow'],
  'arrow-curved': [
    'arrow_dash',
    'pass',
    true,
    [6, 4],
    'arrow',
    undefined,
    true,
  ],
  arrow_wavy: ['arrow_wavy', 'dribble', true, [], 'arrow', '#eab308'],
  dribble: ['arrow_wavy', 'dribble', true, [6, 4], 'arrow'],
};

for (const [k, v] of Object.entries(ARROW_DEFAULTS)) {
  DRAWING_TOOL_BEHAVIORS.set(k, createArrowBehavior(v));
}

DRAWING_TOOL_BEHAVIORS.set('zone', createZoneBehavior('zone_rect', 'rect'));
DRAWING_TOOL_BEHAVIORS.set(
  'zone_circle',
  createZoneBehavior('zone_ellipse', 'ellipse'),
);
DRAWING_TOOL_BEHAVIORS.set('eraser', { interactionKind: 'eraser' });

const addPointTool = (
  t: string,
  placePoint: DrawingToolBehavior['placePoint'],
) =>
  DRAWING_TOOL_BEHAVIORS.set(t, {
    interactionKind: 'point-place',
    placePoint,
  });

addPointTool('text', (p, c) => {
  const t = createTextAnnotation(p.x, p.y, c.color);
  c.addText(t);
  c.onStartEditText?.(t.id);
});

const regMk = (t: string, fn: (x: number, y: number, no: string) => Player) =>
  addPointTool(t, (p, c) => c.addMarker(fn(p.x, p.y, `${c.markersCount + 1}`)));

regMk('player', (x, y, n) => create2DPlayerMarker(x, y, '#034694', n));
regMk('player-ring', (x, y) => createRingMarker(x, y, '#034694'));
regMk('player-ring-fade', (x, y) => createRingFadeMarker(x, y, '#ffffff'));

export function commitDrawingShape(
  preview: DrawingPreviewState,
  color: string,
  strokeWidth: number,
  addArrow: (a: ArrowAnnotation) => void,
  addZone: (z: ZoneAnnotation) => void,
): void {
  getDrawingToolBehavior(preview.tool as string)?.commitDrag?.(
    preview,
    color,
    strokeWidth,
    { addArrow, addZone },
  );
}
