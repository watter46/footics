import {
  createShapeId,
  createShapePropsMigrationIds,
  createShapePropsMigrationSequence,
  DefaultColorStyle,
  Edge2d,
  Group2d,
  ShapeUtil,
  StateNode,
  SVGContainer,
  T,
  type TLBaseShape,
  type TLShapeId,
  Vec,
} from 'tldraw';
import { MARKER_CONNECTOR_STROKE_WIDTH } from '../styles/marker-styles';
import { resolveColor } from '../styles/zone-styles';
import type { AppShape } from '../types/app-shapes';
import { getMarkerLayoutDimensions } from '../utils/marker-geometry';

// =============================================================================
// 型定義
// =============================================================================

export interface TLMarkerConnectorShape
  extends TLBaseShape<
    'marker_connector',
    {
      startMarkerId: TLShapeId | null;
      endMarkerId: TLShapeId | null;
      color: string;
    }
  > {}

// =============================================================================
// マイグレーション
// =============================================================================

const versions = createShapePropsMigrationIds('marker_connector', { Init: 1 });
const migrations = createShapePropsMigrationSequence({
  sequence: [
    {
      id: versions.Init,
      up(props: any) {
        props.startMarkerId = props.startMarkerId ?? null;
        props.endMarkerId = props.endMarkerId ?? null;
        props.color = props.color ?? 'black';
      },
    },
  ],
});

// =============================================================================
// =============================================================================
// ヘルパー
// =============================================================================

function getEllipseBoundary(
  cx: number,
  cy: number,
  rrx: number,
  rry: number,
  angle: number,
): Vec {
  // 幾何学的な放射状距離の計算: r(θ) = (a*b) / sqrt((b*cosθ)^2 + (a*sinθ)^2)
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const r = (rrx * rry) / Math.sqrt((rry * cos) ** 2 + (rrx * sin) ** 2);
  return new Vec(cx + r * cos, cy + r * sin);
}

// =============================================================================
// ShapeUtil
// =============================================================================

// @ts-expect-error - Custom shape type does not satisfy the strict TLShape union constraint
export class MarkerConnectorShapeUtil extends ShapeUtil<TLMarkerConnectorShape> {
  static override type = 'marker_connector' as const;
  static override migrations = migrations;

  static override props = {
    startMarkerId: T.any,
    endMarkerId: T.any,
    color: DefaultColorStyle,
  };

  override getDefaultProps(): TLMarkerConnectorShape['props'] {
    return {
      startMarkerId: null,
      endMarkerId: null,
      color: 'black',
    };
  }

  override getGeometry(shape: TLMarkerConnectorShape) {
    if (!shape.props.startMarkerId || !shape.props.endMarkerId) {
      return new Group2d({ children: [] });
    }
    const startShape = this.editor.getShape(shape.props.startMarkerId) as any;
    const endShape = this.editor.getShape(shape.props.endMarkerId) as any;
    if (!startShape || !endShape) return new Group2d({ children: [] });

    const { startPt, endPt } = this._getPoints(startShape, endShape);
    return new Edge2d({ start: startPt, end: endPt });
  }

  _getPoints(startShape: any, endShape: any) {
    const sDim = getMarkerLayoutDimensions(
      startShape.props.w,
      startShape.props.h,
    );
    const eDim = getMarkerLayoutDimensions(endShape.props.w, endShape.props.h);

    const sCenter = new Vec(startShape.x + sDim.cx, startShape.y + sDim.cy);
    const eCenter = new Vec(endShape.x + eDim.cx, endShape.y + eDim.cy);

    const angle = Math.atan2(eCenter.y - sCenter.y, eCenter.x - sCenter.x);

    const startPt = getEllipseBoundary(
      sCenter.x,
      sCenter.y,
      sDim.rrx,
      sDim.rry,
      angle,
    );
    const endPt = getEllipseBoundary(
      eCenter.x,
      eCenter.y,
      eDim.rrx,
      eDim.rry,
      angle + Math.PI,
    );

    return { startPt, endPt };
  }

  override component(shape: TLMarkerConnectorShape) {
    if (!shape.props.startMarkerId || !shape.props.endMarkerId) return null;

    const startShape = this.editor.getShape(shape.props.startMarkerId) as any;
    const endShape = this.editor.getShape(shape.props.endMarkerId) as any;
    if (!startShape || !endShape) return null;

    const isDarkMode = this.editor.user.getIsDarkMode();
    // コネクタ自身の color が 'black' でなければそちらを優先、そうでなければ開始マーカーの色に従う
    const colorName =
      shape.props.color !== 'black'
        ? shape.props.color
        : startShape.props.color;
    const color = resolveColor(colorName, isDarkMode);

    const { startPt, endPt } = this._getPoints(startShape, endShape);

    // Sanitise shape id so it is safe for SVG id attributes
    const fid = shape.id.replace(/[^a-zA-Z0-9]/g, '');

    // tldraw: レンダリング座標はシェイプのローカル空間 (shape.x, shape.y からのオフセット)
    const ox = shape.x;
    const oy = shape.y;

    // 計算された座標
    const x1 = startPt.x - ox;
    const y1 = startPt.y - oy;
    const x2 = endPt.x - ox;
    const y2 = endPt.y - oy;

    // フィルター領域の計算 (水平・垂直線での消失を防ぐため userSpaceOnUse を使用)
    const padding = 20;
    const fx = Math.min(x1, x2) - padding;
    const fy = Math.min(y1, y2) - padding;
    const fw = Math.abs(x1 - x2) + padding * 2;
    const fh = Math.abs(y1 - y2) + padding * 2;

    return (
      <SVGContainer style={{ pointerEvents: 'none', overflow: 'visible' }}>
        <defs>
          <filter
            id={`connector_glow_${fid}`}
            x={fx}
            y={fy}
            width={fw}
            height={fh}
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
            <feFlood floodColor="white" result="glowColor" />
            <feComposite
              in="glowColor"
              in2="blur"
              operator="in"
              result="glow"
            />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={color}
          strokeWidth={MARKER_CONNECTOR_STROKE_WIDTH}
          strokeLinecap="round"
          filter={`url(#connector_glow_${fid})`}
        />
      </SVGContainer>
    );
  }

  override indicator(shape: TLMarkerConnectorShape) {
    if (!shape.props.startMarkerId || !shape.props.endMarkerId) return null;

    const startShape = this.editor.getShape(shape.props.startMarkerId) as any;
    const endShape = this.editor.getShape(shape.props.endMarkerId) as any;
    if (!startShape || !endShape) return null;

    const { startPt, endPt } = this._getPoints(startShape, endShape);

    return (
      <line
        x1={startPt.x - shape.x}
        y1={startPt.y - shape.y}
        x2={endPt.x - shape.x}
        y2={endPt.y - shape.y}
      />
    );
  }
}

// =============================================================================
// MarkerConnectorTool
// — Floating Toolbar 起点フロー:
//   1. FloatingToolbar の「コネクタ」ボタン押下
//   2. setCurrentTool('marker_connector', { startMarkerId: <id> }) を呼ぶ
//   3. onEnter で startMarkerId を受け取りプレビュー用コネクタを生成
//   4. 別のマーカーをクリック → endMarkerId を確定して select に戻る
//   5. まったく別の場所クリック or Escape → コネクタ削除してキャンセル
// =============================================================================

export class MarkerConnectorTool extends StateNode {
  static override id = 'marker_connector';

  private startMarkerId: TLShapeId | null = null;
  private connectorId: TLShapeId | null = null;
  /** キャンバス上での PointerDown を受け取ったかどうか。
   * ツールバーボタン押下時の PointerUp 誤発火を防ぐために使用する。 */
  private hasPointerDown: boolean = false;

  // info には FloatingToolbar から { startMarkerId } が渡される
  override onEnter(info: any) {
    this.editor.setCursor({ type: 'cross', rotation: 0 });
    this.startMarkerId = (info as any)?.startMarkerId ?? null;
    this.connectorId = null;
    this.hasPointerDown = false;

    // 起点マーカーIDが渡されていればプレビュー用コネクタを即生成
    if (this.startMarkerId) {
      this.connectorId = createShapeId();
      this.editor.markHistoryStoppingPoint('creating marker connector');
      this.editor.createShape({
        id: this.connectorId,
        type: 'marker_connector' as any,
        x: 0,
        y: 0,
        props: {
          startMarkerId: this.startMarkerId,
          // 最初は自分自身を指す（非表示相当）
          endMarkerId: this.startMarkerId,
        },
      });
    }
  }

  override onExit() {
    // Escape などでツールが切り替わった場合、未確定コネクタを削除
    this._cancelIfIncomplete();
  }

  override onKeyUp(info: { key: string }) {
    if (info.key === 'Escape') {
      this._cancelIfIncomplete();
      this.editor.setCurrentTool('select');
    }
  }

  override onPointerDown() {
    // キャンバス上での意図的なクリック開始を記録する
    this.hasPointerDown = true;
  }

  override onPointerMove() {
    if (!this.connectorId || !this.startMarkerId) return;

    const { currentPagePoint } = this.editor.inputs;
    const hovered = this._findNearestMarkerAt(
      currentPagePoint,
      this.startMarkerId,
    );

    if (hovered) {
      // ホバー中のマーカーを強調表示（ヒンティング）
      this.editor.setHintingShapes([hovered]);
      // プレビューコネクタをホバー対象に吸着させる
      this.editor.updateShape({
        id: this.connectorId as any,
        type: 'marker_connector' as any,
        props: { endMarkerId: hovered },
      });
    } else {
      // ホバー対象なし → 強調を解除して起点にリセット（非表示相当）
      this.editor.setHintingShapes([]);
      this.editor.updateShape({
        id: this.connectorId as any,
        type: 'marker_connector' as any,
        props: { endMarkerId: this.startMarkerId },
      });
    }
  }

  override onPointerUp() {
    // ツールバーボタン押下時の PointerUp 誤発火を無視する
    if (!this.hasPointerDown) return;

    if (!this.connectorId || !this.startMarkerId) {
      this.editor.setCurrentTool('select');
      return;
    }

    const { currentPagePoint } = this.editor.inputs;
    const hovered = this._findNearestMarkerAt(
      currentPagePoint,
      this.startMarkerId,
    );

    if (hovered && hovered !== this.startMarkerId) {
      // ─ 確定: ホバー中のマーカーに接続して完了 ─
      this.editor.setHintingShapes([]);
      this.editor.updateShape({
        id: this.connectorId as any,
        type: 'marker_connector' as any,
        props: { endMarkerId: hovered },
      });
      this.connectorId = null;
      this.startMarkerId = null;
      this.editor.setCurrentTool('select');
    } else {
      // ─ キャンセル: マーカー以外の場所をクリックした ─
      this._cancelIfIncomplete();
      this.editor.setCurrentTool('select');
    }
  }

  // ─── プライベートヘルパー ───────────────────────────────────────────

  /**
   * 指定ポイント付近にある最も近いマーカーのIDを返す（excludeId は除外）。
   * `_findMarkerAt` の最初にヒットしたものを返す従来ロジックを改善し、
   * 複数候補がある場合でも中心距離が最も近いものを選ぶ。
   */
  private _findNearestMarkerAt(
    point: Vec,
    excludeId: TLShapeId,
  ): TLShapeId | null {
    const allShapes = this.editor.getCurrentPageShapes() as AppShape[];
    let nearestId: TLShapeId | null = null;
    let nearestDist = Infinity;

    for (const s of allShapes) {
      if (s.type !== 'marker' || s.id === excludeId) continue;
      const bounds = this.editor.getShapePageBounds(s.id);
      if (!bounds) continue;
      // 少し広めのヒット領域でスナップしやすくする
      if (!bounds.expandBy(20).containsPoint(point)) continue;
      // ヒット範囲内の候補の中から中心距離が最も近いものを選ぶ
      const dist = bounds.center.dist(point);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestId = s.id;
      }
    }
    return nearestId;
  }

  /** プレビュー中のコネクタがまだ確定していなければ削除する */
  private _cancelIfIncomplete() {
    // ヒンティングを必ず解除する
    this.editor.setHintingShapes([]);
    if (this.connectorId) {
      const shape = this.editor.getShape(this.connectorId) as any;
      if (shape && shape.props.startMarkerId === shape.props.endMarkerId) {
        this.editor.deleteShape(this.connectorId as any);
      }
      this.connectorId = null;
      this.startMarkerId = null;
    }
  }
}
