import React from 'react';
import {
  createShapeId,
  createShapePropsMigrationIds,
  createShapePropsMigrationSequence,
  DefaultColorStyle,
  DefaultDashStyle,
  type IndexKey,
  Polygon2d,
  Polyline2d,
  ShapeUtil,
  StateNode,
  SVGContainer,
  T,
  type TLBaseShape,
  type TLHandle,
  type TLShapeId,
  Vec,
} from 'tldraw';
import { resolveColor, resolveDash, ZONE_STROKE_WIDTH } from './zone-styles';

// --- Type ---

export interface TLZonePathShape
  extends TLBaseShape<
    'zone_path',
    {
      points: Array<{ x: number; y: number }>;
      color: string;
      dash: string;
      isComplete: boolean;
    }
  > {}

// --- Migrations ---

const migrationVersions = createShapePropsMigrationIds('zone_path', {
  Init: 1,
});
const migrations = createShapePropsMigrationSequence({
  sequence: [
    {
      id: migrationVersions.Init,
      up(props: any) {
        props.points = props.points ?? [];
        props.color = props.color ?? 'black';
        props.dash = props.dash ?? 'draw';
        props.isComplete = props.isComplete ?? false;
      },
    },
  ],
});

// --- ShapeUtil ---

// @ts-expect-error - Custom shape type does not satisfy the strict TLShape union constraint in older tldraw versions
export class ZonePathShapeUtil extends ShapeUtil<TLZonePathShape> {
  static override type = 'zone_path' as const;
  static override migrations = migrations;

  static override props = {
    points: T.arrayOf(T.object({ x: T.number, y: T.number })),
    color: DefaultColorStyle,
    dash: DefaultDashStyle,
    isComplete: T.boolean,
  };

  override getDefaultProps(): TLZonePathShape['props'] {
    return {
      points: [],
      color: 'black',
      dash: 'dashed',
      isComplete: false,
    };
  }

  override getGeometry(shape: TLZonePathShape) {
    const { points } = shape.props;

    // 点が0の場合：ダミーの微小 Polygon2d を返す
    if (points.length === 0) {
      return new Polygon2d({
        points: [new Vec(0, 0), new Vec(1, 0), new Vec(0, 1)],
        isFilled: false,
      });
    }

    // 点が1の場合：Polyline2d は2点必要なのでダミー点を追加
    if (points.length === 1) {
      const p = points[0];
      return new Polyline2d({
        points: [new Vec(p.x, p.y), new Vec(p.x + 0.1, p.y + 0.1)],
      });
    }

    // 点が2の場合：Polyline2d を使用
    if (points.length === 2) {
      return new Polyline2d({
        points: points.map((p) => new Vec(p.x, p.y)),
      });
    }

    // 3点以上：ポリゴン（完成前は未クローズ、完成後はクローズ）
    return new Polygon2d({
      points: points.map((p) => new Vec(p.x, p.y)),
      isFilled: shape.props.isComplete,
    });
  }

  override getHandles(shape: TLZonePathShape): TLHandle[] {
    return shape.props.points.map((p, i) => ({
      id: `point_${i}`,
      type: 'vertex',
      index: `p${i}` as IndexKey,
      x: p.x,
      y: p.y,
    }));
  }

  override onHandleDrag(shape: TLZonePathShape, { handle }: any): any {
    const i = parseInt(handle.id.split('_')[1], 10);
    const newPoints = [...shape.props.points];
    newPoints[i] = { x: handle.x, y: handle.y };
    return { ...shape, props: { ...shape.props, points: newPoints } };
  }

  override component(shape: TLZonePathShape) {
    const isDarkMode = this.editor.user.getIsDarkMode();
    const color = resolveColor(shape.props.color, isDarkMode);
    const dash = resolveDash(shape.props.dash);
    const { points, isComplete } = shape.props;

    if (points.length === 0) return null;

    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x} ${points[i].y}`;
    }

    // Draw polygon only if complete, else just polyline
    if (isComplete) {
      pathD += ' Z';
    }

    return (
      <SVGContainer>
        <path
          d={pathD}
          fill={isComplete ? color : 'none'}
          fillOpacity={isComplete ? 0.35 : 0}
          stroke={color}
          strokeWidth={ZONE_STROKE_WIDTH}
          strokeDasharray={isComplete ? dash : undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="all"
        />
        {/* Draw vertices indicators while drawing to help UX */}
        {!isComplete &&
          points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={4}
              fill="white"
              stroke={color}
              strokeWidth={2}
            />
          ))}
      </SVGContainer>
    );
  }

  override indicator(shape: TLZonePathShape) {
    const points = shape.props.points;
    if (points.length === 0) return null;

    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x} ${points[i].y}`;
    }
    if (shape.props.isComplete) pathD += ' Z';

    return <path d={pathD} fill="none" />;
  }
}

// --- Tool ---

export class ZonePathTool extends StateNode {
  static override id = 'zone_path';

  private currentShapeId: TLShapeId | null = null;

  override onEnter() {
    this.editor.setCursor({ type: 'cross', rotation: 0 });
    this.currentShapeId = null;
  }

  override onPointerDown() {
    const { currentPagePoint } = this.editor.inputs;

    if (!this.currentShapeId) {
      // Start a new path
      this.currentShapeId = createShapeId();
      this.editor.markHistoryStoppingPoint('creating zone path');
      this.editor.createShape({
        id: this.currentShapeId,
        type: 'zone_path' as any,
        x: currentPagePoint.x,
        y: currentPagePoint.y,
        props: {
          points: [{ x: 0, y: 0 }],
          isComplete: false,
        },
      });
    } else {
      // Add point
      const shape = this.editor.getShape(this.currentShapeId) as any;
      if (!shape) return;

      const localPoint = {
        x: currentPagePoint.x - shape.x,
        y: currentPagePoint.y - shape.y,
      };

      // 始点と重なっているか判定（3点以上の場合）
      if (shape.props.points.length >= 3) {
        const startPoint = shape.props.points[0];
        const dx = localPoint.x - startPoint.x;
        const dy = localPoint.y - startPoint.y;
        const hitDistance = 15 / this.editor.getCamera().z; // ズームに応じたクリック許容範囲

        if (Math.sqrt(dx * dx + dy * dy) < hitDistance) {
          // パスを閉じて完了
          this.editor.updateShape({
            id: this.currentShapeId,
            type: 'zone_path' as any,
            props: { isComplete: true },
          });
          this.editor.setCurrentTool('select');
          this.currentShapeId = null;
          return;
        }
      }

      this.editor.updateShape({
        id: this.currentShapeId,
        type: 'zone_path' as any,
        props: {
          points: [...shape.props.points, localPoint],
        },
      });
    }
  }

  // ダブルクリックによる終了は行わない（不完全な形状の削除のみ）
  override onDoubleClick() {
    if (this.currentShapeId) {
      this.editor.deleteShape(this.currentShapeId as any);
      this.editor.setCurrentTool('select');
      this.currentShapeId = null;
    }
  }
}
