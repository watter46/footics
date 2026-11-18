import type { DrawingPreviewInput } from '@/lib/tactical/compiler/scene-graph-dto';
import {
  toScreenNormCoord,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type {
  DomainArrowAnnotation,
  DomainTextAnnotation,
  DomainZoneAnnotation,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';

export type DrawingPreview = DrawingPreviewInput;

export type PreviewShapeKind =
  | 'line'
  | 'route_line'
  | 'arrow_solid'
  | 'arrow_dash'
  | 'arrow_wavy'
  | 'zone_rect'
  | 'zone_ellipse';

export type DrawingCommitActions = {
  addArrow: (a: DomainArrowAnnotation) => void;
  addZone: (z: DomainZoneAnnotation) => void;
};

export type DrawingPointPlaceContext = {
  color?: string;
  markersCount: number;
  addText: (t: DomainTextAnnotation) => void;
  addMarker: (m: PitchPlayer) => void;
  onStartEditText?: (textId: string) => void;
};

export interface DrawingToolBehavior {
  interactionKind: 'drag-shape' | 'point-place' | 'eraser';
  previewKind?: PreviewShapeKind;
  defaultPreviewColor?: string;
  commitDrag?: (
    preview: DrawingPreview,
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
  markerType: PitchPlayer['style']['markerType'],
  x: number,
  y: number,
  color: string,
  shirtNo = '',
): PitchPlayer {
  const isC = markerType === 'circle';
  return {
    id: `${isC ? 'player' : 'marker'}-${Date.now()}`,
    area: 'pitch',
    x: toScreenNormCoord(x),
    y: toScreenNormCoord(y),
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
): PitchPlayer => createPlayerMarkerEntity('ring', x, y, c || '#034694');

export const createRingFadeMarker = (
  x: number,
  y: number,
  c = '#ffffff',
  _s = '',
): PitchPlayer => createPlayerMarkerEntity('ring-fade', x, y, c || '#ffffff');

export const create2DPlayerMarker = (
  x: number,
  y: number,
  c = '#034694',
  shirtNo = '',
): PitchPlayer => ({
  ...createPlayerMarkerEntity('circle', x, y, c || '#034694', shirtNo),
  team: 'home',
  name: `Player ${shirtNo}`,
  position: 'SUB',
});

export const createTextAnnotation = (
  x: number,
  y: number,
  color = '#ffffff',
): DomainTextAnnotation => ({
  id: `text-${Date.now()}`,
  annotationType: 'text',
  content: 'Tactics Note',
  x: toScreenNormCoord(x),
  y: toScreenNormCoord(y),
  color: color || '#ffffff',
  fontSize: 16,
  bold: false,
  italic: false,
});

type ArrowCfg = [
  kind: PreviewShapeKind,
  type: DomainArrowAnnotation['arrowType'],
  dash: number[],
  end: DomainArrowAnnotation['endMarker'],
  color?: string,
  curve?: boolean,
  start?: DomainArrowAnnotation['startMarker'],
];

const createArrowBehavior = (cfg: ArrowCfg): DrawingToolBehavior => ({
  interactionKind: 'drag-shape',
  previewKind: cfg[0],
  defaultPreviewColor: cfg[4],
  commitDrag: ({ startPoint, currentPoint }, color, strokeWidth, actions) => {
    const sx = startPoint.x;
    const sy = startPoint.y;
    const cx = currentPoint.x;
    const cy = currentPoint.y;
    if (Math.hypot(cx - sx, cy - sy) <= 1.5) return;
    const finalColor =
      (color === '#ffffff' || !color) && cfg[4] ? cfg[4] : color || '#ffffff';
    actions.addArrow({
      id: `arrow-${Date.now()}`,
      annotationType: 'arrow',
      arrowType: cfg[1],
      curveType: cfg[5] ? 'curved' : 'straight',
      points: [toScreenNormPoint(sx, sy), toScreenNormPoint(cx, cy)],
      color: finalColor,
      strokeWidth,
      dashArray: cfg[2],
      startMarker: cfg[6] ?? 'none',
      endMarker: cfg[3],
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
  commitDrag: ({ startPoint, currentPoint }, color, _sw, actions) => {
    const sx = startPoint.x;
    const sy = startPoint.y;
    const cx = currentPoint.x;
    const cy = currentPoint.y;
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
      x: toScreenNormCoord(x),
      y: toScreenNormCoord(y),
      width: w,
      height: h,
      color: color && color !== '#ffffff' ? color : '#ef4444',
      opacity: 0.25,
      strokeWidth: 2,
    });
  },
});

const ARROW_DEFAULTS: Record<string, ArrowCfg> = {
  line: ['line', 'line', [], 'none'],
  route_line: ['route_line', 'route_line', [], 'dot', '#38bdf8', false, 'dot'],
  arrow_solid: ['arrow_solid', 'pass', [], 'arrow'],
  'arrow-straight': ['arrow_solid', 'pass', [], 'arrow'],
  pass: ['arrow_solid', 'pass', [], 'arrow'],
  arrow_dash: ['arrow_dash', 'pass', [6, 4], 'arrow'],
  'arrow-curved': ['arrow_dash', 'pass', [6, 4], 'arrow', undefined, true],
  arrow_wavy: ['arrow_wavy', 'dribble', [], 'arrow', '#eab308'],
  dribble: ['arrow_wavy', 'dribble', [6, 4], 'arrow'],
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

const regMk = (
  t: string,
  fn: (x: number, y: number, no: string) => PitchPlayer,
) =>
  addPointTool(t, (p, c) => c.addMarker(fn(p.x, p.y, `${c.markersCount + 1}`)));

regMk('player', (x, y, n) => create2DPlayerMarker(x, y, '#034694', n));
regMk('player-ring', (x, y) => createRingMarker(x, y, '#034694'));
regMk('player-ring-fade', (x, y) => createRingFadeMarker(x, y, '#ffffff'));

export function commitDrawingShape(
  drawingPreview: DrawingPreview,
  color: string,
  strokeWidth: number,
  addArrow: (arrow: DomainArrowAnnotation) => void,
  addZone: (zone: DomainZoneAnnotation) => void,
): void {
  getDrawingToolBehavior(drawingPreview.tool)?.commitDrag?.(
    drawingPreview,
    color,
    strokeWidth,
    { addArrow, addZone },
  );
}
