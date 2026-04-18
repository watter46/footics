import React from 'react';
import {
  BaseBoxShapeTool,
  BaseBoxShapeUtil,
  createShapePropsMigrationIds,
  createShapePropsMigrationSequence,
  DefaultColorStyle,
  DefaultDashStyle,
  DefaultFillStyle,
  Ellipse2d,
  SVGContainer,
  T,
  type TLBaseShape,
} from 'tldraw';
import {
  resolveColor,
  resolveDash,
  resolveFill,
  ZONE_DEFAULT_PROPS,
  ZONE_STROKE_WIDTH,
} from './zone-styles';

// --- Type ---

type TLZoneCircleShape = TLBaseShape<
  'zone-circle',
  {
    w: number;
    h: number;
    color: string;
    fill: string;
    dash: string;
  }
>;

// --- Migrations ---

const migrationVersions = createShapePropsMigrationIds('zone-circle', {
  AddStyles: 1,
});

const zoneCircleMigrations = createShapePropsMigrationSequence({
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

// --- ShapeUtil ---

export class ZoneCircleShapeUtil extends BaseBoxShapeUtil<any> {
  static override type = 'zone-circle' as const;
  static override migrations = zoneCircleMigrations;

  static override props = {
    w: T.number,
    h: T.number,
    color: DefaultColorStyle,
    fill: DefaultFillStyle,
    dash: DefaultDashStyle,
  };

  override getDefaultProps(): TLZoneCircleShape['props'] {
    return { ...ZONE_DEFAULT_PROPS };
  }

  override getGeometry(shape: TLZoneCircleShape) {
    return new Ellipse2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: shape.props.fill !== 'none',
    });
  }

  override component(shape: TLZoneCircleShape) {
    const isDarkMode = this.editor.user.getIsDarkMode();
    const color = resolveColor(shape.props.color, isDarkMode);
    const { fill, fillOpacity } = resolveFill(shape.props.fill, color);
    const dash = resolveDash(shape.props.dash);

    return (
      <SVGContainer>
        <ellipse
          cx={shape.props.w / 2}
          cy={shape.props.h / 2}
          rx={shape.props.w / 2}
          ry={shape.props.h / 2}
          fill={fill}
          fillOpacity={fillOpacity}
          stroke={color}
          strokeWidth={ZONE_STROKE_WIDTH}
          strokeDasharray={dash}
        />
      </SVGContainer>
    );
  }

  override indicator(shape: TLZoneCircleShape) {
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

// --- Tool ---

export class ZoneCircleTool extends BaseBoxShapeTool {
  static override id = 'zone-circle';
  override shapeType = 'zone-circle' as any;

  override onEnter() {
    this.editor.setCursor({ type: 'cross', rotation: 0 });
    this.editor.setStyleForNextShapes(DefaultColorStyle, 'red');
    this.editor.setStyleForNextShapes(DefaultFillStyle, 'semi');
  }

  override onPointerUp() {
    this.editor.setCurrentTool('select');
  }
}
