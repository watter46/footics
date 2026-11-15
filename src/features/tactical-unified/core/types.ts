import type {
  AspectRatio,
  DrawingTool,
  PitchTransform,
} from '@/lib/types/tactical-unified';

import type { CanvasNodesRegistry } from './utils/canvas-registry';

export type { AspectRatio, DrawingTool, PitchTransform };

export type SelectedObjectKind =
  | 'player'
  | 'arrow'
  | 'zone'
  | 'text'
  | 'ball'
  | 'vision-cone'
  | 'connect-line'
  | 'badge'
  | 'focus';

export interface SelectedObject {
  id: string;
  kind: SelectedObjectKind;
  parentPlayerId?: string;
}

export interface CanvasCapabilities {
  hasBall: boolean;
  hasPitchLock: boolean;
  hasBench: boolean;
  paddingRatio: number;
}

export interface CanvasCoreHandle {
  exportPng: (options?: { crop?: boolean; scale?: number }) => Promise<string>;
  copyToClipboard: (options?: {
    crop?: boolean;
    scale?: number;
  }) => Promise<void>;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export interface DrawingPreviewState {
  isDrawing: boolean;
  tool: DrawingTool;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  points?: number[];
}

export interface CanvasStageProps {
  className?: string;
  /** 明示指定時のみ Stage 矩形を比率で contain フィット。未指定ならコンテナ全面。 */
  imageAspect?: number;
  paddingRatio?: number;
  /** 親(Level3)から注入するノードレジストリ（アニメーション hook と共有） */
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  /** Stage 実サイズ(px)の変化通知。親が座標写像（ピッチ矩形）に用いる */
  onStageSizeChange?: (size: { width: number; height: number }) => void;
  onAutoSave?: (json: string) => void;
  toolbar?: React.ReactNode;
  cleanRender?: boolean;
}
