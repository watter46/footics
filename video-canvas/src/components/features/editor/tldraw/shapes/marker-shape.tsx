import {
  BaseBoxShapeUtil,
  createShapePropsMigrationIds,
  createShapePropsMigrationSequence,
  Ellipse2d,
  resizeBox,
  SVGContainer,
  T,
  type TLBaseShape,
} from 'tldraw';
import { MARKER_DEFAULT_PROPS, MARKER_MIN_SIZE } from '../styles/marker-styles';
import { resolveColor } from '../styles/zone-styles';
import {
  MarkerBaseSVG,
  MarkerDefs,
  MarkerSpotlight,
} from '../utils/marker-assets';
import { getMarkerLayoutDimensions } from '../utils/marker-geometry';

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

export type TLMarkerShape = TLBaseShape<
  'marker',
  {
    w: number;
    h: number;
    color: string;
    isSpotlight: boolean;
  }
>;

// ---------------------------------------------------------------------------
// Migrations
// ---------------------------------------------------------------------------

const versions = createShapePropsMigrationIds('marker', {
  Init: 1,
});

const markerMigrations = createShapePropsMigrationSequence({
  sequence: [
    {
      id: versions.Init,
      up(props: any) {
        props.color = props.color ?? MARKER_DEFAULT_PROPS.color;
        props.isSpotlight = props.isSpotlight ?? false;
        // Clean up old properties if they exist
        if ('arrows' in props) delete props.arrows;
        if ('fovs' in props) delete props.fovs;
        if ('label' in props) delete props.label;
      },
    },
  ],
});

// ---------------------------------------------------------------------------
// ShapeUtil
// ---------------------------------------------------------------------------

// @ts-expect-error - Custom shape type does not satisfy the strict TLShape union constraint in older tldraw versions
export class MarkerShapeUtil extends BaseBoxShapeUtil<TLMarkerShape> {
  static override type = 'marker' as const;
  static override migrations = markerMigrations;

  static override props = {
    w: T.number,
    h: T.number,
    color: T.string,
    isSpotlight: T.boolean,
  };

  override getDefaultProps(): TLMarkerShape['props'] {
    return { ...MARKER_DEFAULT_PROPS, isSpotlight: false };
  }

  override getGeometry(shape: TLMarkerShape) {
    // Spotlight is not part of geometry bounds (it's visual mostly).
    return new Ellipse2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
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
    } as any;
  }

  // -----------------------------------------------------------------------
  // Component — SVG rendering
  // -----------------------------------------------------------------------

  override component(shape: TLMarkerShape) {
    const isDarkMode = this.editor.user.getIsDarkMode();
    const color = resolveColor(shape.props.color, isDarkMode);
    const { w, h, isSpotlight } = shape.props;
    const { scale, cx, cy } = getMarkerLayoutDimensions(w, h);

    // Sanitise shape id so it is safe for SVG id attributes
    const fid = shape.id.replace(/[^a-zA-Z0-9]/g, '');

    return (
      <SVGContainer style={isSpotlight ? { overflow: 'visible' } : undefined}>
        <MarkerDefs fid={fid} color={color} hasArrows={false} />

        {/* Spotlight effect layered below or above depending on visual need. We'll layer it over the marker. */}
        <MarkerBaseSVG scale={scale} fid={fid} color={color} />

        {isSpotlight && <MarkerSpotlight cx={cx} cy={cy} w={w} fid={fid} />}
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
