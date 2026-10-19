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
  BoundaryBoxHud,
  type BoundaryBoxHudProps,
} from './components/BoundaryBoxHud';
export {
  BoundaryBoxOverlay,
  type BoundaryBoxOverlayProps,
} from './components/BoundaryBoxOverlay';
export {
  CanvasOverlays,
  type CanvasOverlaysProps,
} from './components/CanvasOverlays';
export { CanvasStageContainer } from './components/CanvasStageContainer';
export {
  ContextHud,
  type ContextHudProps,
} from './components/ContextHud';
export {
  CoreDrawingToolbar,
  type CoreDrawingToolbarProps,
} from './components/CoreDrawingToolbar';
export {
  DrawingPreviewLayer,
  type DrawingPreviewLayerProps,
} from './components/DrawingPreviewLayer';
export {
  FootRingLayer,
  type FootRingLayerProps,
} from './components/FootRingLayer';
export {
  ConnectLineHud,
  type ConnectLineHudProps,
  type HudOffsetRect,
  type HudTarget,
  resolveHudTarget,
} from './components/hud';
export {
  PitchInlineTextEditor,
  type PitchInlineTextEditorProps,
} from './components/PitchInlineTextEditor';
export {
  PlayerConnectLines,
  type PlayerConnectLinesProps,
} from './components/PlayerConnectLines';
export {
  PlayerLayer,
  type PlayerLayerProps,
} from './components/PlayerLayer';
export * from './components/toolbar';
export {
  type CornerId,
  useBoundaryBoxDrag,
} from './hooks/use-boundary-box-drag';
export {
  type UseCanvasExportOptions,
  useCanvasExport,
} from './hooks/use-canvas-export';
export {
  type UseCanvasShortcutsOptions,
  useCanvasShortcuts,
} from './hooks/use-canvas-shortcuts';
export { useCanvasStore, useCanvasStoreApi } from './hooks/use-canvas-store';
export {
  type UseCanvasZoomPanOptions,
  useCanvasZoomPan,
} from './hooks/use-canvas-zoom-pan';
export {
  type UseNodePositionTransitionOptions,
  useNodePositionTransition,
} from './hooks/use-node-position-transition';
export { createCanvasStore } from './store/canvas-store';
export {
  CanvasStoreContext,
  CanvasStoreProvider,
  type CanvasStoreProviderProps,
} from './store/canvas-store-provider';
export type {
  AnnotationsData,
  CanvasActions,
  CanvasClipboard,
  CanvasConfig,
  CanvasCoreHandle,
  CanvasHistorySnapshot,
  CanvasStageProps,
  CanvasState,
  CanvasStore,
  CanvasStoreApi,
  DrawingPreviewState,
  SelectedObject,
  SelectedObjectKind,
} from './types';
export {
  clampNorm,
  clampNormPoint,
  DEFAULT_PITCH_PERSPECTIVE,
  getPitchAndNormPos,
  getStagePitchAndNormPos,
  normToPitch,
  normToPx,
  normToScreen,
  type PitchRectBounds,
  type PitchRectSize,
  type PitchTransformState,
  type Point2D,
  pitchToNorm,
  pitchToScreen,
  pitchToStage,
  pxToNorm,
  screenToPitch,
  stageToPitch,
  unprojectScreenYToCssRotateX,
} from './utils/canvas-coordinates';
export {
  applyPitchTransformToGroups,
  buildExportMVPMatrix,
  calculateExportCropRect,
  calculatePitchRect,
  calculatePitchTransform,
  DEFAULT_PITCH_TRANSFORM_ORIGIN,
  type ExportCropRect,
  type ExportCropRectOptions,
  getCssPitchTransform,
  type PitchTransformValues,
} from './utils/canvas-pitch-transform-helper';
export {
  type ArrowNodeEntry,
  type CanvasNodesRegistry,
  type ConnectLineNodeEntry,
  createCanvasNodesRegistry,
  type TrajectoryArrowNodeEntry,
} from './utils/canvas-registry';
export {
  buildMVPMatrix,
  type CameraParams,
  DEFAULT_FAR,
  DEFAULT_FOV,
  DEFAULT_NEAR,
  type NormPoint,
  type ProjectedPoint,
  projectPitchToScreen,
  unprojectScreenToPitch,
} from './utils/matrix-coordinates';
export {
  calculateVirtualCanvasRect,
  type VirtualCanvasRect,
} from './utils/virtual-canvas-rect';
