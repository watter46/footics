import React from 'react';
import {
  BaseBoxShapeUtil,
  BaseBoxShapeTool,
  TLBaseShape,
  T,
  SVGContainer,
  DefaultColorStyle,
  DefaultFillStyle,
  DefaultDashStyle,
  Rectangle2d,
  createShapePropsMigrationIds,
  createShapePropsMigrationSequence,
} from 'tldraw';
import {
  resolveColor,
  resolveFill,
  resolveDash,
  ZONE_STROKE_WIDTH,
  ZONE_DEFAULT_PROPS,
} from './zone-styles';

// --- Type ---

type TLZoneRectShape = TLBaseShape<'zone-rect', {
  w: number;
  h: number;
  color: string;
  fill: string;
  dash: string;
}>;

// --- Migrations ---

const migrationVersions = createShapePropsMigrationIds('zone-rect', {
  AddStyles: 1,
});

const zoneRectMigrations = createShapePropsMigrationSequence({
  sequence: [
    {
      id: migrationVersions.AddStyles,
      up(props: any) {
        props.color = props.color ?? ZONE_DEFAULT_PROPS.color;
        props.fill = props.fill ?? 'none';
        props.dash = props.dash ?? ZONE_DEFAULT_PROPS.dash;
      },
    },
  ],
});

/** Corner radius for rounded rectangle shapes. */
const CORNER_RADIUS = 8;

// --- ShapeUtil ---

export class ZoneRectShapeUtil extends BaseBoxShapeUtil<any> {
  static override type = 'zone-rect' as const;
  static override migrations = zoneRectMigrations;

  static override props = {
    w: T.number,
    h: T.number,
    color: DefaultColorStyle,
    fill: DefaultFillStyle,
    dash: DefaultDashStyle,
  };

  override getDefaultProps(): TLZoneRectShape['props'] {
    return { ...ZONE_DEFAULT_PROPS };
  }

  override getGeometry(shape: TLZoneRectShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: shape.props.fill !== 'none',
    });
  }

  override component(shape: TLZoneRectShape) {
    const isDarkMode = this.editor.user.getIsDarkMode();
    const color = resolveColor(shape.props.color, isDarkMode);
    const { fill, fillOpacity } = resolveFill(shape.props.fill, color);
    const dash = resolveDash(shape.props.dash);

    return (
      <SVGContainer>
        <rect
          width={shape.props.w}
          height={shape.props.h}
          rx={CORNER_RADIUS}
          ry={CORNER_RADIUS}
          fill={fill}
          fillOpacity={fillOpacity}
          stroke={color}
          strokeWidth={ZONE_STROKE_WIDTH}
          strokeDasharray={dash}
        />
      </SVGContainer>
    );
  }

  override indicator(shape: TLZoneRectShape) {
    return (
      <rect
        width={shape.props.w}
        height={shape.props.h}
        rx={CORNER_RADIUS}
        ry={CORNER_RADIUS}
      />
    );
  }
}

// --- Tool ---

export class ZoneRectTool extends BaseBoxShapeTool {
  static override id = 'zone-rect';
  override shapeType = 'zone-rect' as any;

  override onEnter() {
    this.editor.setCursor({ type: 'cross', rotation: 0 });
    this.editor.setStyleForNextShapes(DefaultColorStyle, 'red');
    this.editor.setStyleForNextShapes(DefaultFillStyle, 'semi');
  }

  override onPointerUp() {
    this.editor.setCurrentTool('select');
  }
}
