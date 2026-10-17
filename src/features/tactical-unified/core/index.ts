/**
 * pure canvas core
 * Level 1〜2 共通描画基盤
 */

export {
  AnnotationLayer,
  type AnnotationLayerProps,
} from './components/AnnotationLayer';
export {
  BackgroundImageLayer,
  type BackgroundImageLayerProps,
} from './components/BackgroundImageLayer';
export {
  BoundaryBoxOverlay,
  type BoundaryBoxOverlayProps,
} from './components/BoundaryBoxOverlay';
export { CanvasStageContainer } from './components/CanvasStageContainer';
export {
  CoreDrawingToolbar,
  type CoreDrawingToolbarProps,
} from './components/CoreDrawingToolbar';
export {
  FootRingLayer,
  type FootRingLayerProps,
} from './components/FootRingLayer';
export {
  type UseCanvasExportOptions,
  useCanvasExport,
} from './hooks/use-canvas-export';
export { useCanvasStore, useCanvasStoreApi } from './hooks/use-canvas-store';
export { createCanvasStore } from './store/canvas-store';
export {
  CanvasStoreContext,
  CanvasStoreProvider,
  type CanvasStoreProviderProps,
} from './store/canvas-store-provider';
export type {
  AnnotationsData,
  CanvasConfig,
  CanvasCoreHandle,
  CanvasStageProps,
  CanvasStore,
  CanvasStoreApi,
  DrawingPreviewState,
} from './types';
export {
  calculateVirtualCanvasRect,
  type VirtualCanvasRect,
} from './utils/virtual-canvas-rect';
