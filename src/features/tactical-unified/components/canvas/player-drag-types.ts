import type {
  ArrowAnnotation,
  Player,
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
  ghostGroup: any;
  ghostLine: any;
  ghostMarkerGroup: any;
  ghostCircle: any;
  ghostText: any;
  ghostLabel: any;
}
