import {
  createShapePropsMigrationIds,
  createShapePropsMigrationSequence,
  Group2d,
  type IndexKey,
  Polygon2d,
  ShapeUtil,
  StateNode,
  SVGContainer,
  T,
  type TLBaseShape,
  type TLHandle,
  type TLShapeId,
} from 'tldraw';
import {
  MARKER_FOV_DEFAULT_ANGLE,
  MARKER_FOV_DEFAULT_LENGTH,
} from '../styles/marker-styles';
import { resolveColor } from '../styles/zone-styles';
import {
  getFovLayout,
  getMarkerLayoutDimensions,
} from '../utils/marker-geometry';

// --- Type ---

export interface TLMarkerFovShape
  extends TLBaseShape<
    'marker_fov',
    {
      targetMarkerId: TLShapeId | null;
      angle: number;
      direction: number;
      length: number;
    }
  > {}

// --- Migrations ---

const versions = createShapePropsMigrationIds('marker_fov', { Init: 1 });
const migrations = createShapePropsMigrationSequence({
  sequence: [
    {
      id: versions.Init,
      up(props: any) {
        props.targetMarkerId = props.targetMarkerId ?? null;
        props.angle = props.angle ?? MARKER_FOV_DEFAULT_ANGLE;
        props.direction = props.direction ?? -Math.PI / 2;
        props.length = props.length ?? MARKER_FOV_DEFAULT_LENGTH;
      },
    },
  ],
});

// --- ShapeUtil ---

// @ts-expect-error - Custom shape type does not satisfy the strict TLShape union constraint in older tldraw versions
export class MarkerFovShapeUtil extends ShapeUtil<TLMarkerFovShape> {
  static override type = 'marker_fov' as const;
  static override migrations = migrations;

  static override props = {
    targetMarkerId: T.any,
    angle: T.number,
    direction: T.number,
    length: T.number,
  };

  override getDefaultProps(): TLMarkerFovShape['props'] {
    return {
      targetMarkerId: null,
      angle: MARKER_FOV_DEFAULT_ANGLE,
      direction: -Math.PI / 2,
      length: MARKER_FOV_DEFAULT_LENGTH,
    };
  }

  override getGeometry(shape: TLMarkerFovShape) {
    if (!shape.props.targetMarkerId) return new Group2d({ children: [] });
    const target = this.editor.getShape(shape.props.targetMarkerId) as any;
    if (!target) return new Group2d({ children: [] });

    const { w, h } = target.props;
    const { cx, cy, rrx, rry } = getMarkerLayoutDimensions(w, h);
    const fov = shape.props;
    const layout = getFovLayout(cx, cy, rrx, rry, fov);

    const points = [
      ...layout.innerPoints,
      ...[...layout.outerPoints].reverse(),
    ];
    return new Polygon2d({ points, isFilled: true });
  }

  override getHandles(shape: TLMarkerFovShape): TLHandle[] {
    if (!shape.props.targetMarkerId) return [];
    const target = this.editor.getShape(shape.props.targetMarkerId) as any;
    if (!target) return [];

    const { w, h } = target.props;
    const { cx, cy, rrx, rry } = getMarkerLayoutDimensions(w, h);
    const layout = getFovLayout(cx, cy, rrx, rry, shape.props);

    return [
      {
        id: 'fovHandle',
        type: 'vertex',
        index: 'f1' as IndexKey,
        x: layout.handle.x,
        y: layout.handle.y,
      },
    ];
  }

  override onHandleDrag(shape: TLMarkerFovShape, { handle }: any): any {
    if (!shape.props.targetMarkerId) return shape;
    const target = this.editor.getShape(shape.props.targetMarkerId) as any;
    if (!target) return shape;

    const { w, h } = target.props;
    const { cx, cy, rrx, rry } = getMarkerLayoutDimensions(w, h);

    if (handle.id === 'fovHandle') {
      const direction = Math.atan2(handle.y - cy, handle.x - cx);
      const dx = handle.x - cx;
      const dy = handle.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const cosD = Math.cos(direction);
      const sinD = Math.sin(direction);
      const r_at_angle = Math.sqrt((rrx * cosD) ** 2 + (rry * sinD) ** 2);
      const length = Math.max(5, dist - r_at_angle);

      return { ...shape, props: { ...shape.props, direction, length } };
    }

    return shape;
  }

  override component(shape: TLMarkerFovShape) {
    if (!shape.props.targetMarkerId) return null;
    const target = this.editor.getShape(shape.props.targetMarkerId) as any;
    if (!target) return null;

    const isDarkMode = this.editor.user.getIsDarkMode();
    const color = resolveColor(target.props.color, isDarkMode);

    const { w, h } = target.props;
    const { cx, cy, rrx, rry } = getMarkerLayoutDimensions(w, h);
    const layout = getFovLayout(cx, cy, rrx, rry, shape.props);

    const { fov } = { fov: shape.props };
    const { innerPoints, outerPoints } = layout;
    const p1i = innerPoints[0];
    const p2i = innerPoints[innerPoints.length - 1];
    const p1o = outerPoints[0];
    const p2o = outerPoints[outerPoints.length - 1];

    const largeArc = fov.angle > Math.PI ? 1 : 0;
    const orx = rrx + fov.length;
    const ory = rry + fov.length;

    // Path: Inner arc (CW) -> Jump to Outer -> Outer arc (CCW) -> Close
    const d = `M ${p1i.x} ${p1i.y} A ${rrx} ${rry} 0 ${largeArc} 1 ${p2i.x} ${p2i.y} L ${p2o.x} ${p2o.y} A ${orx} ${ory} 0 ${largeArc} 0 ${p1o.x} ${p1o.y} Z`;

    return (
      <SVGContainer style={{ overflow: 'visible' }}>
        <path
          d={d}
          fill={color}
          fillOpacity={0.15}
          stroke={color}
          strokeWidth={2}
          strokeOpacity={0.6}
          pointerEvents="all"
        />
      </SVGContainer>
    );
  }

  override indicator(shape: TLMarkerFovShape) {
    if (!shape.props.targetMarkerId) return null;
    const target = this.editor.getShape(shape.props.targetMarkerId) as any;
    if (!target) return null;

    const { w, h } = target.props;
    const { cx, cy, rrx, rry } = getMarkerLayoutDimensions(w, h);
    const layout = getFovLayout(cx, cy, rrx, rry, shape.props);

    // Simplistic polygon for indicator
    const points = [
      ...layout.innerPoints,
      ...[...layout.outerPoints].reverse(),
    ];
    const pd = `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')} Z`;

    return <path d={pd} fill="none" />;
  }
}

// --- Tool ---

export class MarkerFovTool extends StateNode {
  static override id = 'marker_fov';
}
