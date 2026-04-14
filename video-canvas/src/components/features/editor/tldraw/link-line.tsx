import {
  ShapeUtil,
  TLBaseShape,
  T,
  SVGContainer,
  DefaultColorStyle,
  DefaultDashStyle,
  Polyline2d,
  Vec,
  TLHandle,
  StateNode,
  createShapeId,
  IndexKey,
  createShapePropsMigrationIds,
  createShapePropsMigrationSequence,
} from 'tldraw';
import {
  resolveColor,
  resolveDash,
  ZONE_STROKE_WIDTH,
} from './zone-styles';

// --- Type ---

export interface TLLinkLineShape extends TLBaseShape<'link-line', {
  color: string;
  dash: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
}> {}

// --- Migrations ---

const migrationVersions = createShapePropsMigrationIds('link-line', {
  Init: 1,
});

const linkLineMigrations = createShapePropsMigrationSequence({
  sequence: [
    {
      id: migrationVersions.Init,
      up(props: any) {
        props.color = props.color ?? 'blue';
        props.dash = props.dash ?? 'draw';
        props.start = props.start ?? { x: 0, y: 0 };
        props.end = props.end ?? { x: 0.1, y: 0.1 };
      },
    },
  ],
});

// --- ShapeUtil ---

export class LinkLineShapeUtil extends ShapeUtil<any> {
  static override type = 'link-line' as const;
  static override migrations = linkLineMigrations;

  static override props = {
    color: DefaultColorStyle,
    dash: DefaultDashStyle,
    start: T.object({ x: T.number, y: T.number }),
    end: T.object({ x: T.number, y: T.number }),
  };

  override getDefaultProps(): TLLinkLineShape['props'] {
    return {
      color: 'blue',
      dash: 'draw',
      start: { x: 0, y: 0 },
      end: { x: 100, y: 100 },
    };
  }

  override getHandles(shape: TLLinkLineShape): TLHandle[] {
    return [
      { id: 'start', type: 'vertex', index: 'a1' as IndexKey, x: shape.props.start.x, y: shape.props.start.y },
      { id: 'end', type: 'vertex', index: 'a2' as IndexKey, x: shape.props.end.x, y: shape.props.end.y },
    ];
  }

  override getGeometry(shape: TLLinkLineShape) {
    return new Polyline2d({
      points: [
        new Vec(shape.props.start.x, shape.props.start.y),
        new Vec(shape.props.end.x, shape.props.end.y),
      ],
    });
  }

  override component(shape: TLLinkLineShape) {
    const isDarkMode = this.editor.user.getIsDarkMode();
    const color = resolveColor(shape.props.color, isDarkMode);
    const dash = resolveDash(shape.props.dash);

    const { start, end } = shape.props;
    // ドットのサイズをストローク幅に比例させる（プロっぽく見える黄金比）
    const dotRadius = ZONE_STROKE_WIDTH * 1.8;

    return (
      <SVGContainer>
        <g pointerEvents="none">
          <line
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke={color}
            strokeWidth={ZONE_STROKE_WIDTH}
            strokeDasharray={dash}
            strokeLinecap="round"
          />
          {/* Start Dot */}
          <circle cx={start.x} cy={start.y} r={dotRadius} fill={color} />
          {/* End Dot */}
          <circle cx={end.x} cy={end.y} r={dotRadius} fill={color} />
        </g>
      </SVGContainer>
    );
  }

  override indicator(shape: TLLinkLineShape) {
    const { start, end } = shape.props;
    return (
      <g>
        <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
        <circle cx={start.x} cy={start.y} r={ZONE_STROKE_WIDTH * 1.8} />
        <circle cx={end.x} cy={end.y} r={ZONE_STROKE_WIDTH * 1.8} />
      </g>
    );
  }

  override onHandleDrag(shape: TLLinkLineShape, { handle }: any): any {
    return {
      ...shape,
      props: {
        ...shape.props,
        [handle.id]: { x: handle.x, y: handle.y },
      },
    };
  }
}

// --- Tool ---

export class LinkLineTool extends StateNode {
  static override id = 'link-line';

  override onEnter() {
    this.editor.setCursor({ type: 'cross', rotation: 0 });
  }

  override onPointerDown() {
    const { currentPagePoint } = this.editor.inputs;
    const id = createShapeId();

    this.editor.markHistoryStoppingPoint('creating-link-line');

    this.editor.run(() => {
      this.editor.createShape({
        id,
        type: 'link-line' as any,
        x: currentPagePoint.x,
        y: currentPagePoint.y,
        props: {
          start: { x: 0, y: 0 },
          end: { x: 0.1, y: 0.1 },
          color: 'blue',
        },
      });

      this.editor.setSelectedShapes([id]);
    });
  }

  override onPointerMove() {
    if (!this.editor.inputs.isPointing) return;

    const selectedShapeIds = this.editor.getSelectedShapeIds();
    if (selectedShapeIds.length === 0) return;

    const shape = this.editor.getShape(selectedShapeIds[0]) as unknown as TLLinkLineShape;
    if (!shape || shape.type !== 'link-line') return;

    const { currentPagePoint } = this.editor.inputs;

    this.editor.updateShape({
      id: shape.id,
      type: 'link-line' as any,
      props: {
        end: {
          x: currentPagePoint.x - shape.x,
          y: currentPagePoint.y - shape.y,
        },
      },
    });
  }

  override onPointerUp() {
    // 連続して描画したい場合はここをコメントアウト
    this.editor.setCurrentTool('select');
  }
}