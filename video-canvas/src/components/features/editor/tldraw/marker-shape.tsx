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
// SVG path data (inlined from assets/svg/marker.svg)
// ---------------------------------------------------------------------------

const MARKER_PATHS = [
  // Right arc
  'M58.641 34.7484C59.1516 34.8106 59.3236 35.4345 58.8904 35.7119C56.9266 36.9692 54.1023 38.0766 50.6102 38.9512C46.5029 39.9799 41.6187 40.6497 36.4444 40.8952C36.2016 40.9067 35.9774 40.7657 35.8816 40.5424L35.8362 40.4367C35.6747 40.0606 35.9397 39.639 36.3484 39.617C40.6482 39.3861 44.7004 38.8159 48.1282 37.9574C51.6414 37.0775 54.3747 35.9257 56.0669 34.6145C56.1934 34.5164 56.3524 34.4693 56.5113 34.4887L58.641 34.7484Z',
  // Upper-right arc
  'M48.8509 23.7561C48.9621 23.705 49.0874 23.6915 49.2069 23.718C53.5444 24.6797 57.002 25.9881 59.2266 27.5106C61.2924 28.9243 62.2257 30.4752 61.954 32.0261C61.9088 32.2837 61.6677 32.4493 61.4063 32.4409L59.6372 32.3843C59.2491 32.3719 58.984 31.9873 58.9982 31.5993C59.0448 30.3291 58.1969 29.0682 56.504 27.9096C54.7607 26.7165 52.1761 25.6695 48.9601 24.8473C48.4359 24.7133 48.3593 23.982 48.8509 23.7561V23.7561Z',
  // Top arc
  'M15.7789 24.5673C15.2595 24.3453 15.3274 23.5995 15.8812 23.4877C19.8008 22.697 24.2559 22.2038 28.8975 22.0509C33.708 21.8926 38.56 22.105 43.0423 22.6669C43.5699 22.7331 43.7298 23.4109 43.2921 23.7127L43.0383 23.8877C42.9168 23.9715 42.7684 24.0062 42.6223 23.9855C38.451 23.3942 33.8598 23.1614 29.3113 23.3111C24.7569 23.4611 20.4098 23.9892 16.7088 24.8415C16.5872 24.8695 16.4603 24.8585 16.3455 24.8095L15.7789 24.5673Z',
  // Left arc
  'M3.52222 34.1725C3.34201 34.1894 3.16236 34.1227 3.04466 33.9851C1.70258 32.4171 1.65181 30.765 2.90289 29.1868C4.19057 27.5626 6.81084 26.0754 10.4963 24.8757C10.611 24.8384 10.735 24.838 10.8501 24.874L11.0432 24.9345C11.5882 25.1053 11.596 25.8941 11.0637 26.1011C8.57431 27.0692 6.77764 28.2009 5.8126 29.4182C4.88782 30.5847 4.7534 31.7962 5.4041 32.9737C5.63924 33.3993 5.40955 33.9954 4.9255 34.0408L3.52222 34.1725Z',
  // Bottom-left arc
  'M32 40.415C32 40.7381 31.738 41.0002 31.415 40.9982C26.245 40.9663 21.1853 40.5116 16.7288 39.6771C12.8953 38.9591 9.6249 37.9819 7.1439 36.8194C6.6485 36.5873 6.76315 35.8935 7.30213 35.7996L9.00823 35.5026C9.1431 35.4791 9.28148 35.504 9.40109 35.5705C11.6388 36.8163 14.866 37.8562 18.7655 38.5865C22.6052 39.3056 26.9617 39.6992 31.4149 39.7309C31.738 39.7332 32 39.9949 32 40.318L32 40.415Z',
] as const;

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
    const layout = this.getMarkerLayout(shape);
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

  private getMarkerLayout(shape: TLMarkerShape) {
    const { w, h, arrows, fovs } = shape.props;
    const cx = w / 2;
    const cy = h / 2;
    const scale = w / MARKER_SVG_SIZE;
    const rrx = MARKER_RING_RX * scale;
    const rry = MARKER_RING_RY * scale;

    const arrowLayouts = arrows.map((arrow) => {
      const start = new Vec(cx + rrx * Math.cos(arrow.angle), cy + rry * Math.sin(arrow.angle));
      const end = start.clone().add(Vec.FromAngle(arrow.angle).mul(arrow.length));

      const mx = (start.x + end.x) / 2;
      const my = (start.y + end.y) / 2;
      const nx = -(end.y - start.y) / arrow.length;
      const ny = (end.x - start.x) / arrow.length;
      const bendPoint = new Vec(mx + nx * arrow.bend, my + ny * arrow.bend);
      const cp = new Vec(mx + 2 * arrow.bend * nx, my + 2 * arrow.bend * ny);

      return { start, end, cp, bendPoint, arrow };
    });

    const fovLayouts = fovs.map((fov) => {
      const halfAngle = fov.angle / 2;
      const startAngle = fov.direction - halfAngle;

      const orx = rrx + fov.length;
      const ory = rry + fov.length;

      const samples = 12;
      const innerPoints: Vec[] = [];
      const outerPoints: Vec[] = [];
      for (let j = 0; j <= samples; j++) {
        const a = startAngle + (fov.angle * j) / samples;
        innerPoints.push(new Vec(cx + rrx * Math.cos(a), cy + rry * Math.sin(a)));
        outerPoints.push(new Vec(cx + orx * Math.cos(a), cy + ory * Math.sin(a)));
      }

      const handle = new Vec(
        cx + (rrx + fov.length) * Math.cos(fov.direction),
        cy + (rry + fov.length) * Math.sin(fov.direction)
      );

      return { innerPoints, outerPoints, handle, fov };
    });

    return { cx, cy, scale, rrx, rry, arrowLayouts, fovLayouts };
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
    const layout = this.getMarkerLayout(shape);

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
    const layout = this.getMarkerLayout(shape);
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
    const layout = this.getMarkerLayout(shape);
    const { w, h } = shape.props;
    const { scale, cx, cy, rrx, rry, arrowLayouts, fovLayouts } = layout;

    // Sanitise shape id so it is safe for SVG id attributes
    const fid = shape.id.replace(/[^a-zA-Z0-9]/g, '');
    const hasExtras = arrowLayouts.length > 0 || fovLayouts.length > 0;

    return (
      <SVGContainer style={hasExtras ? { overflow: 'visible' } : undefined}>
        <defs>
          {/* Shared drop-shadow filter (white glow for contrast) */}
          <filter
            id={`mds_${fid}`}
            filterUnits="userSpaceOnUse"
            x="-5"
            y="-5"
            width="74"
            height="74"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha"
            />
            <feOffset />
            <feGaussianBlur stdDeviation="1.5" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"
            />
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
          </filter>

          {/* Foreground blur for center glow */}
          <filter
            id={`mfb_${fid}`}
            filterUnits="userSpaceOnUse"
            x="0"
            y="17"
            width="63"
            height="29"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
            <feGaussianBlur stdDeviation="5" result="effect1_foregroundBlur" />
          </filter>

          {/* Clip path */}
          <clipPath id={`mcp_${fid}`}>
            <rect width="64" height="64" fill="white" />
          </clipPath>

          {/* Arrowhead marker */}
          {arrowLayouts.length > 0 && (
            <marker
              id={`mah_${fid}`}
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill={color} />
            </marker>
          )}
        </defs>

        {/* ---- Marker SVG (scaled from 64×64 to shape size) ---- */}
        <g transform={`scale(${scale})`}>
          <g clipPath={`url(#mcp_${fid})`}>
            {MARKER_PATHS.map((d, i) => (
              <g key={i} filter={`url(#mds_${fid})`}>
                <path d={d} fill={color} />
              </g>
            ))}
            {/* Center glow ellipse */}
            <g filter={`url(#mfb_${fid})`}>
              <ellipse cx="31.5" cy="31.5" rx="21.5" ry="4.5" fill={color} />
            </g>
          </g>
        </g>

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
