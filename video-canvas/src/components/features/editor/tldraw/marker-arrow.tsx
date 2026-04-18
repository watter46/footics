import React from 'react';
import {
  CubicBezier2d,
  createShapePropsMigrationIds,
  createShapePropsMigrationSequence,
  Edge2d,
  Group2d,
  type IndexKey,
  ShapeUtil,
  StateNode,
  SVGContainer,
  T,
  type TLBaseShape,
  type TLHandle,
  type TLShapeId,
} from 'tldraw';
import { getArrowLayout, getMarkerLayoutDimensions } from './marker-geometry';
import {
  MARKER_ARROW_DEFAULT_LENGTH,
  MARKER_ARROW_STROKE_WIDTH,
  MARKER_ARROWHEAD_HEIGHT,
  MARKER_ARROWHEAD_WIDTH,
  MARKER_MAN_MARK_DOT_RADIUS,
  MARKER_MAN_MARK_STROKE_WIDTH,
} from './marker-styles';
import { resolveColor } from './zone-styles';

// =============================================================================
// 共通 Props 型
// =============================================================================

interface MarkerArrowBaseProps {
  targetMarkerId: TLShapeId | null;
  angle: number;
  length: number;
  bend: number;
}

// =============================================================================
// Shape 型定義 (Type-level separation)
// =============================================================================

export interface TLMarkerArrowSolidShape
  extends TLBaseShape<'marker_arrow_solid', MarkerArrowBaseProps> {}
export interface TLMarkerArrowDashShape
  extends TLBaseShape<'marker_arrow_dash', MarkerArrowBaseProps> {}
export interface TLMarkerManMarkShape
  extends TLBaseShape<'marker_man_mark', MarkerArrowBaseProps> {}

// =============================================================================
// 共通ロジック: ジオメトリ・ハンドル・ドラッグ
// =============================================================================

/**
 * 親マーカーの props.x/y は「shape.x, shape.y に完全一致」するため、
 * targetMarkerId への参照でマーカーの w/h を取得すれば OK。
 */
function resolveTarget(editor: any, targetMarkerId: TLShapeId | null) {
  if (!targetMarkerId) return null;
  const target = editor.getShape(targetMarkerId) as any;
  if (!target) return null;
  return target;
}

function buildGeometry(editor: any, shape: { props: MarkerArrowBaseProps }) {
  const target = resolveTarget(editor, shape.props.targetMarkerId);
  if (!target) return new Group2d({ children: [] });

  const { w, h } = target.props;
  const { cx, cy, rrx, rry } = getMarkerLayoutDimensions(w, h);
  const layout = getArrowLayout(cx, cy, rrx, rry, shape.props);

  if (Math.abs(shape.props.bend) < 0.1) {
    return new Edge2d({ start: layout.start, end: layout.end });
  }
  const cp1 = layout.start.clone().lrp(layout.cp, 2 / 3);
  const cp2 = layout.end.clone().lrp(layout.cp, 2 / 3);
  return new CubicBezier2d({ start: layout.start, cp1, cp2, end: layout.end });
}

function buildHandles(
  editor: any,
  shape: { props: MarkerArrowBaseProps },
): TLHandle[] {
  const target = resolveTarget(editor, shape.props.targetMarkerId);
  if (!target) return [];

  const { w, h } = target.props;
  const { cx, cy, rrx, rry } = getMarkerLayoutDimensions(w, h);
  const layout = getArrowLayout(cx, cy, rrx, rry, shape.props);

  return [
    {
      id: 'arrowTip',
      type: 'vertex',
      index: 'a1' as IndexKey,
      x: layout.end.x,
      y: layout.end.y,
    },
    {
      id: 'arrowBend',
      type: 'vertex',
      index: 'a2' as IndexKey,
      x: layout.bendPoint.x,
      y: layout.bendPoint.y,
    },
  ];
}

function handleDrag(editor: any, shape: any, handle: any): any {
  const target = resolveTarget(editor, shape.props.targetMarkerId);
  if (!target) return shape;

  const { w, h } = target.props;
  const { cx, cy, rrx, rry } = getMarkerLayoutDimensions(w, h);
  const arrow = { ...shape.props };
  const layout = getArrowLayout(cx, cy, rrx, rry, arrow);

  if (handle.id === 'arrowTip') {
    const angle = Math.atan2(handle.y - cy, handle.x - cx);
    const startX = cx + rrx * Math.cos(angle);
    const startY = cy + rry * Math.sin(angle);
    const dx = handle.x - startX;
    const dy = handle.y - startY;
    const length = Math.max(20, Math.sqrt(dx * dx + dy * dy));
    return { ...shape, props: { ...shape.props, angle, length } };
  }

  if (handle.id === 'arrowBend') {
    const { start, end } = layout;
    const mx = (start.x + end.x) / 2;
    const my = (start.y + end.y) / 2;
    const nx = -(end.y - start.y) / arrow.length;
    const ny = (end.x - start.x) / arrow.length;
    const bend = (handle.x - mx) * nx + (handle.y - my) * ny;
    return { ...shape, props: { ...shape.props, bend } };
  }

  return shape;
}

/** 共通 indicator SVG */
function buildIndicator(editor: any, shape: { props: MarkerArrowBaseProps }) {
  const target = resolveTarget(editor, shape.props.targetMarkerId);
  if (!target) return null;

  const { w, h } = target.props;
  const { cx, cy, rrx, rry } = getMarkerLayoutDimensions(w, h);
  const layout = getArrowLayout(cx, cy, rrx, rry, shape.props);

  if (Math.abs(shape.props.bend) < 0.1) {
    return (
      <line
        x1={layout.start.x}
        y1={layout.start.y}
        x2={layout.end.x}
        y2={layout.end.y}
      />
    );
  }
  return (
    <path
      d={`M ${layout.start.x} ${layout.start.y} Q ${layout.cp.x} ${layout.cp.y} ${layout.end.x} ${layout.end.y}`}
      fill="none"
    />
  );
}

// =============================================================================
// 共通 Props schema & migrations factory
// =============================================================================

const arrowBaseProps = {
  targetMarkerId: T.any,
  angle: T.number,
  length: T.number,
  bend: T.number,
};

const arrowDefaultProps = (): MarkerArrowBaseProps => ({
  targetMarkerId: null,
  angle: -Math.PI / 2,
  length: MARKER_ARROW_DEFAULT_LENGTH,
  bend: 0,
});

function makeMigrations(type: string) {
  const versions = createShapePropsMigrationIds(type, { Init: 1 });
  return createShapePropsMigrationSequence({
    sequence: [
      {
        id: versions.Init,
        up(props: any) {
          props.targetMarkerId = props.targetMarkerId ?? null;
          props.angle = props.angle ?? -Math.PI / 2;
          props.length = props.length ?? MARKER_ARROW_DEFAULT_LENGTH;
          props.bend = props.bend ?? 0;
        },
      },
    ],
  });
}

// =============================================================================
// MarkerArrowSolidShapeUtil
// =============================================================================

// @ts-expect-error - Custom shape type does not satisfy the strict TLShape union constraint
export class MarkerArrowSolidShapeUtil extends ShapeUtil<TLMarkerArrowSolidShape> {
  static override type = 'marker_arrow_solid' as const;
  static override migrations = makeMigrations('marker_arrow_solid');
  static override props = arrowBaseProps;

  override getDefaultProps(): TLMarkerArrowSolidShape['props'] {
    return arrowDefaultProps();
  }

  override getGeometry(shape: TLMarkerArrowSolidShape) {
    return buildGeometry(this.editor, shape);
  }

  override getHandles(shape: TLMarkerArrowSolidShape): TLHandle[] {
    return buildHandles(this.editor, shape);
  }

  override onHandleDrag(shape: TLMarkerArrowSolidShape, { handle }: any): any {
    return handleDrag(this.editor, shape, handle);
  }

  override component(shape: TLMarkerArrowSolidShape) {
    const target = resolveTarget(this.editor, shape.props.targetMarkerId);
    if (!target) return null;

    const isDarkMode = this.editor.user.getIsDarkMode();
    const color = resolveColor(target.props.color, isDarkMode);
    const { w, h } = target.props;
    const { cx, cy, rrx, rry } = getMarkerLayoutDimensions(w, h);
    const layout = getArrowLayout(cx, cy, rrx, rry, shape.props);
    const { start, end, cp } = layout;

    let d = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    if (Math.abs(shape.props.bend) > 0.1) {
      d = `M ${start.x} ${start.y} Q ${cp.x} ${cp.y} ${end.x} ${end.y}`;
    }

    // arrowhead marker id はターゲットIDから生成（同一SVG内で一意）
    const fid = target.id.replace(/[^a-zA-Z0-9]/g, '');

    const ahW = MARKER_ARROWHEAD_WIDTH;
    const ahH = MARKER_ARROWHEAD_HEIGHT;
    const refX = ahW - 1;
    const refY = ahH / 2;

    return (
      <SVGContainer style={{ overflow: 'visible' }}>
        <defs>
          <marker
            id={`mah_solid_${fid}`}
            markerWidth={ahW}
            markerHeight={ahH}
            refX={refX}
            refY={refY}
            orient="auto"
          >
            <polygon points={`0 0, ${ahW} ${refY}, 0 ${ahH}`} fill={color} />
          </marker>
        </defs>
        <path
          d={d}
          stroke={color}
          strokeWidth={MARKER_ARROW_STROKE_WIDTH}
          strokeLinecap="round"
          fill="none"
          pointerEvents="stroke"
          markerEnd={`url(#mah_solid_${fid})`}
        />
      </SVGContainer>
    );
  }

  override indicator(shape: TLMarkerArrowSolidShape) {
    return buildIndicator(this.editor, shape);
  }
}

// =============================================================================
// MarkerArrowDashShapeUtil
// =============================================================================

// @ts-expect-error - Custom shape type does not satisfy the strict TLShape union constraint
export class MarkerArrowDashShapeUtil extends ShapeUtil<TLMarkerArrowDashShape> {
  static override type = 'marker_arrow_dash' as const;
  static override migrations = makeMigrations('marker_arrow_dash');
  static override props = arrowBaseProps;

  override getDefaultProps(): TLMarkerArrowDashShape['props'] {
    return arrowDefaultProps();
  }

  override getGeometry(shape: TLMarkerArrowDashShape) {
    return buildGeometry(this.editor, shape);
  }

  override getHandles(shape: TLMarkerArrowDashShape): TLHandle[] {
    return buildHandles(this.editor, shape);
  }

  override onHandleDrag(shape: TLMarkerArrowDashShape, { handle }: any): any {
    return handleDrag(this.editor, shape, handle);
  }

  override component(shape: TLMarkerArrowDashShape) {
    const target = resolveTarget(this.editor, shape.props.targetMarkerId);
    if (!target) return null;

    const isDarkMode = this.editor.user.getIsDarkMode();
    const color = resolveColor(target.props.color, isDarkMode);
    const { w, h } = target.props;
    const { cx, cy, rrx, rry } = getMarkerLayoutDimensions(w, h);
    const layout = getArrowLayout(cx, cy, rrx, rry, shape.props);
    const { start, end, cp } = layout;

    let d = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    if (Math.abs(shape.props.bend) > 0.1) {
      d = `M ${start.x} ${start.y} Q ${cp.x} ${cp.y} ${end.x} ${end.y}`;
    }

    const fid = target.id.replace(/[^a-zA-Z0-9]/g, '');
    const dash = MARKER_ARROW_STROKE_WIDTH * 2;

    const ahW = MARKER_ARROWHEAD_WIDTH;
    const ahH = MARKER_ARROWHEAD_HEIGHT;
    const refX = ahW - 1;
    const refY = ahH / 2;

    return (
      <SVGContainer style={{ overflow: 'visible' }}>
        <defs>
          <marker
            id={`mah_dash_${fid}`}
            markerWidth={ahW}
            markerHeight={ahH}
            refX={refX}
            refY={refY}
            orient="auto"
          >
            <polygon points={`0 0, ${ahW} ${refY}, 0 ${ahH}`} fill={color} />
          </marker>
        </defs>
        <path
          d={d}
          stroke={color}
          strokeWidth={MARKER_ARROW_STROKE_WIDTH}
          strokeDasharray={`${dash} ${dash}`}
          strokeLinecap="round"
          fill="none"
          pointerEvents="stroke"
          markerEnd={`url(#mah_dash_${fid})`}
        />
      </SVGContainer>
    );
  }

  override indicator(shape: TLMarkerArrowDashShape) {
    return buildIndicator(this.editor, shape);
  }
}

// =============================================================================
// MarkerManMarkShapeUtil  ── 両端に●がある実線
// =============================================================================

// @ts-expect-error - Custom shape type does not satisfy the strict TLShape union constraint
export class MarkerManMarkShapeUtil extends ShapeUtil<TLMarkerManMarkShape> {
  static override type = 'marker_man_mark' as const;
  static override migrations = makeMigrations('marker_man_mark');
  static override props = arrowBaseProps;

  override getDefaultProps(): TLMarkerManMarkShape['props'] {
    return arrowDefaultProps();
  }

  override getGeometry(shape: TLMarkerManMarkShape) {
    return buildGeometry(this.editor, shape);
  }

  override getHandles(shape: TLMarkerManMarkShape): TLHandle[] {
    return buildHandles(this.editor, shape);
  }

  override onHandleDrag(shape: TLMarkerManMarkShape, { handle }: any): any {
    return handleDrag(this.editor, shape, handle);
  }

  override component(shape: TLMarkerManMarkShape) {
    const target = resolveTarget(this.editor, shape.props.targetMarkerId);
    if (!target) return null;

    const isDarkMode = this.editor.user.getIsDarkMode();
    const color = resolveColor(target.props.color, isDarkMode);
    const { w, h } = target.props;
    const { cx, cy, rrx, rry } = getMarkerLayoutDimensions(w, h);
    const layout = getArrowLayout(cx, cy, rrx, rry, shape.props);
    const { start, end, cp } = layout;

    let d = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    if (Math.abs(shape.props.bend) > 0.1) {
      d = `M ${start.x} ${start.y} Q ${cp.x} ${cp.y} ${end.x} ${end.y}`;
    }

    // スケール考慮: マーカーの scale に合わせてドット半径と線の太さを比率で求める
    const { scale } = getMarkerLayoutDimensions(w, h);
    const s = scale > 0 ? scale : 1;
    const dotR = MARKER_MAN_MARK_DOT_RADIUS * s;
    const strokeWidth = MARKER_MAN_MARK_STROKE_WIDTH * s;

    return (
      <SVGContainer style={{ overflow: 'visible' }}>
        {/* 線 */}
        <path
          d={d}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          pointerEvents="stroke"
        />
        {/* 始端 ● */}
        <circle
          cx={start.x}
          cy={start.y}
          r={dotR}
          fill={color}
          pointerEvents="none"
        />
        {/* 終端 ● */}
        <circle
          cx={end.x}
          cy={end.y}
          r={dotR}
          fill={color}
          pointerEvents="none"
        />
      </SVGContainer>
    );
  }

  override indicator(shape: TLMarkerManMarkShape) {
    return buildIndicator(this.editor, shape);
  }
}

// =============================================================================
// ダミー Tools (Floating Toolbar から直接 createShape するため StateNode は最小限)
// =============================================================================

export class MarkerArrowSolidTool extends StateNode {
  static override id = 'marker_arrow_solid';
}

export class MarkerArrowDashTool extends StateNode {
  static override id = 'marker_arrow_dash';
}

export class MarkerManMarkTool extends StateNode {
  static override id = 'marker_man_mark';
}
