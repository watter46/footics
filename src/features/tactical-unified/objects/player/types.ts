import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/components/canvas/helpers/canvas-registry';
import type {
  ArrowAnnotation,
  Player,
  Slide,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';

export function normX(v: number, w: number): number {
  return (v / 100) * w;
}

export function normY(v: number, h: number): number {
  return (v / 100) * h;
}

export interface AttachedArrowEntry {
  arrow: ArrowAnnotation;
  sourcePlayer?: Player;
  targetPlayer?: Player;
  isSourceMoved: boolean;
  isTargetMoved: boolean;
  initialP0: { x: number; y: number };
  initialP1: { x: number; y: number };
  initialCp?: { x: number; y: number };
}

export interface AttachedConnectLineEntry {
  lineId: string;
  sourcePlayer: Player;
  targetPlayer: Player;
  sourcePlayerId: string;
  targetPlayerId: string;
  isSourceMoved: boolean;
  isTargetMoved: boolean;
  initialP1: { x: number; y: number };
  initialP2: { x: number; y: number };
}

export interface PlayerDragContext {
  movingPlayers: Array<{
    id: string;
    initialPx: { x: number; y: number };
    initialNorm: { x: number; y: number };
  }>;
  movingPlayerIds: string[];
  draggedPlayerId: string;
  startPx: { x: number; y: number };
  prevPlayerPx: { x: number; y: number } | null;
  attachedArrows: AttachedArrowEntry[];
  attachedConnectLines: AttachedConnectLineEntry[];
  attachedZones: Array<{
    zone: ZoneAnnotation;
    initialPts?: Array<{ x: number; y: number }>;
    initialX?: number;
    initialY?: number;
  }>;
  attachedTexts: Array<{
    text: TextAnnotation;
    initialX: number;
    initialY: number;
  }>;
}

export interface OnionSkinRefs {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ghostGroup: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ghostLine: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ghostMarkerGroup: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ghostCircle: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ghostText: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ghostLabel: any;
}

export interface PlayerMarkerProps {
  player: Player;
  slide: Slide;
  stageSize: { width: number; height: number };
  isSelected: boolean;
  isVisionConeSelected?: boolean;
  isFocusSelected?: boolean;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  onSelect: (
    e: KonvaEventObject<MouseEvent> | KonvaEventObject<TouchEvent>,
  ) => void;
  onSelectOption: (tab: 'vision' | 'connect' | 'badge' | 'focus') => void;
  onUpdateVisionCone: (
    patch: Partial<NonNullable<Player['visionCone']>>,
  ) => void;
  onDragStart: (e: KonvaEventObject<DragEvent>, player: Player) => void;
  onDragMove: (e: KonvaEventObject<DragEvent>, player: Player) => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>, player: Player) => void;
}

export interface PlayerLayerProps {
  slide: Slide;
  stageSize: { width: number; height: number };
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
}
