import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core/utils/canvas-registry';
import type {
  DomainArrowAnnotation,
  DomainPlayer,
  DomainTextAnnotation,
  DomainZoneAnnotation,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';

export function normX(v: number, w: number): number {
  return (v / 100) * w;
}

export function normY(v: number, h: number): number {
  return (v / 100) * h;
}

export interface AttachedArrowEntry {
  arrow: DomainArrowAnnotation;
  sourcePlayer?: DomainPlayer;
  targetPlayer?: DomainPlayer;
  isSourceMoved: boolean;
  isTargetMoved: boolean;
  initialP0: { x: number; y: number };
  initialP1: { x: number; y: number };
  initialCp?: { x: number; y: number };
}

export interface AttachedConnectLineEntry {
  lineId: string;
  sourcePlayer: DomainPlayer;
  targetPlayer: DomainPlayer;
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
    zone: DomainZoneAnnotation;
    initialPts?: Array<{ x: number; y: number }>;
    initialX?: number;
    initialY?: number;
  }>;
  attachedTexts: Array<{
    text: DomainTextAnnotation;
    initialX: number;
    initialY: number;
  }>;
}

export interface OnionSkinRefs {
  ghostGroup: Konva.Group | null;
  ghostLine: Konva.Line | null;
  ghostMarkerGroup: Konva.Group | null;
  ghostCircle: Konva.Circle | null;
  ghostText: Konva.Text | null;
  ghostLabel: Konva.Text | null;
}

export interface PlayerMarkerProps {
  player: DomainPlayer;
  slide: DomainSlide;
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
    patch: Partial<NonNullable<PitchPlayer['visionCone']>>,
  ) => void;
  onDragStart: (e: KonvaEventObject<DragEvent>, player: DomainPlayer) => void;
  onDragMove: (e: KonvaEventObject<DragEvent>, player: DomainPlayer) => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>, player: DomainPlayer) => void;
}

export interface BasePlayerLayerProps {
  slide: DomainSlide;
  stageSize: { width: number; height: number };
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
}
