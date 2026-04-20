import type React from 'react';
import { type Editor, Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';

import { BackgroundManager } from './BackgroundManager';
import { EditorEventsListener } from './EditorEventsListener';
import { CanvasMask } from './tldraw/components/CanvasMask';
import { CustomToolbar } from './tldraw/components/CustomToolbar';
import { FloatingMarkerToolbar } from './tldraw/components/FloatingMarkerToolbar';
import { CaptureFrameShapeUtil } from './tldraw/shapes/capture-frame';
import {
  MarkerArrowDashShapeUtil,
  MarkerArrowDashTool,
  MarkerArrowSolidShapeUtil,
  MarkerArrowSolidTool,
  MarkerManMarkShapeUtil,
  MarkerManMarkTool,
} from './tldraw/shapes/marker-arrow';
import {
  MarkerConnectorShapeUtil,
  MarkerConnectorTool,
} from './tldraw/shapes/marker-connector';
import { MarkerFovShapeUtil, MarkerFovTool } from './tldraw/shapes/marker-fov';
import { MarkerShapeUtil } from './tldraw/shapes/marker-shape';
import { MarkerTool } from './tldraw/shapes/marker-tool';
import {
  ZoneCircleShapeUtil,
  ZoneCircleTool,
} from './tldraw/shapes/zone-circle';
import { ZonePathShapeUtil, ZonePathTool } from './tldraw/shapes/zone-path';
import { ZoneRectShapeUtil, ZoneRectTool } from './tldraw/shapes/zone-rect';
import { uiOverrides } from './tldraw/types/ui-overrides';
import { registerMarkerSync } from './tldraw/utils/marker-sync';
import { migrateLegacyMarkerData } from './tldraw/utils/migrations';

/**
 * Tldraw エディタのメインコンテナ
 */
export const CanvasContainer: React.FC = () => {
  // URLからcaptureIdを取得し、タブごとにキャンバス状態を分離する
  const captureId =
    new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : '',
    ).get('id') || 'default';
  const persistenceKey = `footics-video-canvas-${captureId}`;

  const handleMount = (editor: Editor) => {
    // 初期設定
    editor.updateInstanceState({ isReadonly: false });
    editor.user.updateUserPreferences({ isSnapMode: true });

    // 同期・連動ロジックの登録
    registerMarkerSync(editor);

    // 古いデータからの自動マイグレーション
    migrateLegacyMarkerData(editor);
  };

  return (
    <div className="w-full h-full isolate">
      <Tldraw
        persistenceKey={persistenceKey}
        inferDarkMode
        tools={[
          ZoneCircleTool,
          ZoneRectTool,
          ZonePathTool,
          MarkerTool,
          MarkerArrowSolidTool,
          MarkerArrowDashTool,
          MarkerManMarkTool,
          MarkerFovTool,
          MarkerConnectorTool,
        ]}
        shapeUtils={[
          ZoneCircleShapeUtil,
          ZoneRectShapeUtil,
          ZonePathShapeUtil,
          MarkerShapeUtil,
          MarkerArrowSolidShapeUtil,
          MarkerArrowDashShapeUtil,
          MarkerManMarkShapeUtil,
          MarkerFovShapeUtil,
          MarkerConnectorShapeUtil,
          CaptureFrameShapeUtil,
        ]}
        overrides={[uiOverrides]}
        onMount={handleMount}
        components={{
          Toolbar: CustomToolbar,
          OnTheCanvas: CanvasMask,
          HelpMenu: null,
          MainMenu: null,
          PageMenu: null,
          NavigationPanel: null,
          DebugPanel: null,
        }}
      >
        <BackgroundManager />
        <EditorEventsListener />
        <FloatingMarkerToolbar />
      </Tldraw>
    </div>
  );
};
