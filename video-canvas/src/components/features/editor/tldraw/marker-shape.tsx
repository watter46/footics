import React from 'react';
import {
  BaseBoxShapeUtil,
  TLBaseShape,
  T,
  SVGContainer,
  DefaultColorStyle,
  Ellipse2d,
  TLHandle,
  IndexKey,
  resizeBox,
  createShapePropsMigrationIds,
  createShapePropsMigrationSequence,
  Group2d,
  Edge2d,
  Polygon2d,
  CubicBezier2d,
  Vec,
} from 'tldraw';
import { getMarkerLayout } from './marker-geometry';
import { MarkerDefs, MarkerBaseSVG } from './marker-assets';
import { resolveColor } from './zone-styles';
import {
  MARKER_SVG_SIZE,
  MARKER_MIN_SIZE,
  MARKER_RING_RX,
  MARKER_RING_RY,
  MARKER_DEFAULT_PROPS,
  MARKER_ARROW_STROKE_WIDTH,
} from './marker-styles';

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

export type TLMarkerShape = TLBaseShape<
  'marker',
  {
    w: number;
    h: number;
    color: string;
    arrows: Array<{ type: string; angle: number; length: number; bend: number }>;
    fovs: Array<{ angle: number; direction: number; length: number }>;
  }
>;

// ---------------------------------------------------------------------------
// Migrations
// ---------------------------------------------------------------------------

const versions = createShapePropsMigrationIds('marker', {
  Init: 1,
  AddBend: 2,
  RemoveLabel: 3,
});

const markerMigrations = createShapePropsMigrationSequence({
  sequence: [
    {
      id: versions.Init,
      up(props: any) {
        props.color = props.color ?? MARKER_DEFAULT_PROPS.color;
        props.arrows = props.arrows ?? [];
        props.fovs = props.fovs ?? [];
      },
    },
    {
      id: versions.AddBend,
      up(props: any) {
        if (props.arrows) {
          props.arrows.forEach((arrow: any) => {
            if (arrow.bend === undefined) arrow.bend = 0;
          });
        }
      },
    },
    {
      id: versions.RemoveLabel,
      up(props: any) {
        delete props.label;
      },
    },
  ],
});



// ---------------------------------------------------------------------------
// ShapeUtil
// ---------------------------------------------------------------------------

export class MarkerShapeUtil extends BaseBoxShapeUtil<any> {
  static override type = 'marker' as const;
  static override migrations = markerMigrations;

  static override props = {
    w: T.number,
    h: T.number,
    color: T.string,
    arrows: T.arrayOf(
      T.object({
        type: T.string,
        angle: T.number,
        length: T.number,
        bend: T.number,
      }),
    ),
    fovs: T.arrayOf(
      T.object({
        angle: T.number,
        direction: T.number,
        length: T.number,
      }),
    ),
  };

  override getDefaultProps(): TLMarkerShape['props'] {
    return { ...MARKER_DEFAULT_PROPS };
  }

  override getGeometry(shape: TLMarkerShape) {
    const layout = getMarkerLayout(shape);
    const children = [];

    // Main marker ellipse
    children.push(
      new Ellipse2d({
        width: shape.props.w,
        height: shape.props.h,
        isFilled: true,
      })
    );

    // Arrows
    layout.arrowLayouts.forEach((a) => {
      if (Math.abs(a.arrow.bend) < 0.1) {
        children.push(new Edge2d({ start: a.start, end: a.end }));
      } else {
        // Quadratic to Cubic Bezier conversion
        // P0: start, P1: end, CP: cp
        // Cubic CP1 = P0 + 2/3 * (CP - P0)
        // Cubic CP2 = P1 + 2/3 * (CP - P1)
        const cp1 = a.start.clone().lrp(a.cp, 2 / 3);
        const cp2 = a.end.clone().lrp(a.cp, 2 / 3);
        children.push(
          new CubicBezier2d({
            start: a.start,
            cp1,
            cp2,
            end: a.end,
          })
        );
      }
    });

    // FOVs
    layout.fovLayouts.forEach((f) => {
      const points = [...f.innerPoints, ...[...f.outerPoints].reverse()];
      children.push(
        new Polygon2d({
          points,
          isFilled: true,
        })
      );
    });

    return new Group2d({
      children,
    });
  }



  override canResize() {
    return true;
  }

  // -----------------------------------------------------------------------
  // Resize — enforce 1:1 aspect ratio
  // -----------------------------------------------------------------------

  override onResize(shape: TLMarkerShape, info: any) {
    const result = resizeBox(shape as any, info);
    const w = result.props?.w ?? shape.props.w;
    const h = result.props?.h ?? shape.props.h;
    const size = Math.max(MARKER_MIN_SIZE, Math.max(w, h));
    return {
      ...result,
      props: {
        ...result.props,
        w: size,
        h: size,
      },
    };
  }

  // -----------------------------------------------------------------------
  // Handles — arrow tips & FOV direction controls (Phase 3)
  // -----------------------------------------------------------------------

  override getHandles(shape: TLMarkerShape): TLHandle[] {
    const handles: TLHandle[] = [];
    const layout = getMarkerLayout(shape);

    layout.arrowLayouts.forEach((a, i) => {
      // Handle at the tip
      handles.push({
        id: `arrow_${i}`,
        type: 'vertex',
        index: `a${i}` as IndexKey,
        x: a.end.x,
        y: a.end.y,
      });

      // Handle for bending (quadratic Bezier apex)
      handles.push({
        id: `arrowBend_${i}`,
        type: 'vertex',
        index: `ab${i}` as IndexKey,
        x: a.bendPoint.x,
        y: a.bendPoint.y,
      });
    });

    layout.fovLayouts.forEach((f, i) => {
      handles.push({
        id: `fov_${i}`,
        type: 'vertex',
        index: `f${i}` as IndexKey,
        x: f.handle.x,
        y: f.handle.y,
      });
    });

    return handles;
  }

  // -----------------------------------------------------------------------
  // Handle drag — orbital rotation of arrows / FOVs (Phase 3)
  // -----------------------------------------------------------------------

  override onHandleDrag(shape: TLMarkerShape, { handle }: any): any {
    const layout = getMarkerLayout(shape);
    const { cx, cy, rrx, rry } = layout;

    if (handle.id.startsWith('arrow_')) {
      const index = parseInt(handle.id.split('_')[1], 10);
      const arrows = [...shape.props.arrows];
      const arrow = arrows[index];

      const angle = Math.atan2(handle.y - cy, handle.x - cx);
      const startX = cx + rrx * Math.cos(angle);
      const startY = cy + rry * Math.sin(angle);
      const dx = handle.x - startX;
      const dy = handle.y - startY;
      const length = Math.max(20, Math.sqrt(dx * dx + dy * dy));

      arrows[index] = { ...arrow, angle, length };
      return { ...shape, props: { ...shape.props, arrows } };
    }

    if (handle.id.startsWith('arrowBend_')) {
      const index = parseInt(handle.id.split('_')[1], 10);
      const arrows = [...shape.props.arrows];
      const arrow = arrows[index];
      const { start, end } = layout.arrowLayouts[index];

      const mx = (start.x + end.x) / 2;
      const my = (start.y + end.y) / 2;

      // Project handle position onto the normal of the chord
      const dx = handle.x - mx;
      const dy = handle.y - my;
      const nx = -(end.y - start.y) / arrow.length;
      const ny = (end.x - start.x) / arrow.length;

      // bend is the distance along normal
      const bend = dx * nx + dy * ny;

      arrows[index] = { ...arrow, bend };
      return { ...shape, props: { ...shape.props, arrows } };
    }

    if (handle.id.startsWith('fov_')) {
      const index = parseInt(handle.id.split('_')[1], 10);
      const fovs = [...shape.props.fovs];
      const direction = Math.atan2(handle.y - cy, handle.x - cx);
      const dx = handle.x - cx;
      const dy = handle.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const cosD = Math.cos(direction);
      const sinD = Math.sin(direction);
      const r_at_angle = Math.sqrt(Math.pow(rrx * cosD, 2) + Math.pow(rry * sinD, 2));
      const length = Math.max(5, dist - r_at_angle);

      fovs[index] = { ...fovs[index], direction, length };
      return { ...shape, props: { ...shape.props, fovs } };
    }

    return shape;
  }

  // -----------------------------------------------------------------------
  // Component — SVG rendering
  // -----------------------------------------------------------------------

  override component(shape: TLMarkerShape) {
    const isDarkMode = this.editor.user.getIsDarkMode();
    const color = resolveColor(shape.props.color, isDarkMode);
    const layout = getMarkerLayout(shape);
    const { w, h } = shape.props;
    const { scale, cx, cy, rrx, rry, arrowLayouts, fovLayouts } = layout;

    // Sanitise shape id so it is safe for SVG id attributes
    const fid = shape.id.replace(/[^a-zA-Z0-9]/g, '');
    const hasExtras = arrowLayouts.length > 0 || fovLayouts.length > 0;

    return (
      <SVGContainer style={hasExtras ? { overflow: 'visible' } : undefined}>
        <MarkerDefs fid={fid} color={color} hasArrows={arrowLayouts.length > 0} />
        <MarkerBaseSVG scale={scale} fid={fid} color={color} />


        {/* ---- Arrows (Phase 3) ---- */}
        {arrowLayouts.map((a, i) => {
          const { start, end, cp, arrow } = a;
          let d = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
          if (Math.abs(arrow.bend) > 0.1) {
            d = `M ${start.x} ${start.y} Q ${cp.x} ${cp.y} ${end.x} ${end.y}`;
          }

          return (
            <path
              key={`arrow_${i}`}
              d={d}
              stroke={color}
              strokeWidth={MARKER_ARROW_STROKE_WIDTH}
              strokeDasharray={arrow.type === 'dashed' ? `${MARKER_ARROW_STROKE_WIDTH * 2} ${MARKER_ARROW_STROKE_WIDTH * 2}` : undefined}
              strokeLinecap="round"
              fill="none"
              markerEnd={`url(#mah_${fid})`}
            />
          );
        })}

        {/* ---- FOV fans (Annular Sector) ---- */}
        {fovLayouts.map((f, i) => {
          const { fov, innerPoints, outerPoints } = f;
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
            <path
              key={`fov_${i}`}
              d={d}
              fill={color}
              fillOpacity={0.15}
              stroke={color}
              strokeWidth={2}
              strokeOpacity={0.6}
            />
          );
        })}
      </SVGContainer>
    );
  }

  // -----------------------------------------------------------------------
  // Indicator
  // -----------------------------------------------------------------------

  override indicator(shape: TLMarkerShape) {
    return (
      <ellipse
        cx={shape.props.w / 2}
        cy={shape.props.h / 2}
        rx={shape.props.w / 2}
        ry={shape.props.h / 2}
      />
    );
  }
}
