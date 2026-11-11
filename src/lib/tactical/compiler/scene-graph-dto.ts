import type { StageViewport } from '@/lib/tactical/engine/coordinates';
import type {
  ScreenNormPoint,
  StagePixel,
  StagePixelPoint,
} from '@/lib/types/tactical/branded';
import type { PitchPlayer } from '@/lib/types/tactical/domain-entities';

export interface EphemeralDragDelta {
  readonly entityIds: readonly string[];
  readonly deltaScreenNormX: number;
  readonly deltaScreenNormY: number;
}

export interface EphemeralSessionState {
  readonly activePhaseId: string;
  readonly activeSlideId: string;
  readonly selectedIds: readonly string[];
  readonly activeDragDelta?: EphemeralDragDelta | null;
  readonly drawingPreview?: {
    readonly tool: string;
    readonly startPoint: ScreenNormPoint;
    readonly currentPoint: ScreenNormPoint;
    readonly polygonPoints?: readonly ScreenNormPoint[];
  } | null;
}

export interface ResolvedArrowPrimitive {
  readonly id: string;
  readonly flatPointsPx: readonly number[];
  readonly startPointPx: StagePixelPoint;
  readonly endPointPx: StagePixelPoint;
  readonly controlHandlePx?: StagePixelPoint;
  readonly color: string;
  readonly strokeWidthPx: number;
  readonly dashArrayPx: readonly number[];
  readonly dashOffsetPx: number;
  readonly opacity: number;
  readonly visible: boolean;
  readonly startMarker: 'none' | 'arrow' | 'dot';
  readonly endMarker: 'none' | 'arrow' | 'dot';
  readonly pointerLengthPx: number;
  readonly pointerWidthPx: number;
  readonly dotRadiusPx: number;
  readonly endAngleRad: number;
  readonly selected: boolean;
}

export interface ResolvedBillboardPlayerItem {
  readonly kind: 'player';
  readonly id: string;
  readonly positionPx: StagePixelPoint;
  readonly radiusPx: number;
  readonly depthSortKey: number;
  readonly opacity: number;
  readonly visible: boolean;
  readonly selected: boolean;
  readonly player: PitchPlayer;
  readonly rippleRingsPx: readonly {
    readonly radiusPx: number;
    readonly opacity: number;
    readonly color: string;
  }[];
}

export interface ResolvedBillboardBallItem {
  readonly kind: 'ball';
  readonly positionPx: StagePixelPoint;
  readonly radiusPx: number;
  readonly depthSortKey: number;
  readonly opacity: number;
  readonly visible: boolean;
  readonly color?: string;
}

export interface ResolvedBillboardTextItem {
  readonly kind: 'text';
  readonly id: string;
  readonly positionPx: StagePixelPoint;
  readonly depthSortKey: number;
  readonly content: string;
  readonly fontSizePx: number;
  readonly color: string;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly opacity: number;
  readonly visible: boolean;
  readonly selected: boolean;
}

export type ResolvedBillboardItem =
  | ResolvedBillboardPlayerItem
  | ResolvedBillboardBallItem
  | ResolvedBillboardTextItem;

export interface ResolvedZonePrimitive {
  readonly id: string;
  readonly shapeType: 'rect' | 'ellipse' | 'polygon';
  readonly xPx?: StagePixel;
  readonly yPx?: StagePixel;
  readonly widthPx?: number;
  readonly heightPx?: number;
  readonly rotationDeg?: number;
  readonly flatPointsPx?: readonly number[];
  readonly color: string;
  readonly opacity: number;
  readonly strokeColor: string;
  readonly strokeOpacity: number;
  readonly strokeWidthPx: number;
  readonly visible: boolean;
  readonly selected: boolean;
}

export interface ResolvedConnectLinePrimitive {
  readonly id: string;
  readonly fromPlayerId: string;
  readonly toPlayerId: string;
  readonly flatPointsPx: readonly [number, number, number, number];
  readonly color: string;
  readonly strokeWidthPx: number;
  readonly dashArrayPx: readonly number[];
  readonly visible: boolean;
}

export interface ResolvedTrajectoryPrimitive {
  readonly playerId: string;
  readonly flatPointsPx: readonly number[];
  readonly color: string;
  readonly dashArrayPx: readonly number[];
  readonly visible: boolean;
}

export interface ResolvedDrawingPreview {
  readonly tool: string;
  readonly startPointPx: StagePixelPoint;
  readonly currentPointPx: StagePixelPoint;
  readonly flatPolygonPointsPx?: readonly number[];
}

export interface ResolvedSceneGraphDTO {
  readonly viewport: StageViewport;
  readonly zones: readonly ResolvedZonePrimitive[];
  readonly connectLines: readonly ResolvedConnectLinePrimitive[];
  readonly trajectories: readonly ResolvedTrajectoryPrimitive[];
  readonly arrows: readonly ResolvedArrowPrimitive[];
  readonly billboardItems: readonly ResolvedBillboardItem[];
  readonly drawingPreview?: ResolvedDrawingPreview | null;
}
