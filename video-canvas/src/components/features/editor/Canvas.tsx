import React, { useEffect } from 'react';
import {
  Tldraw,
  useEditor,
  exportAs,
  copyAs,
  createShapeId,
  Editor,
  AssetRecordType,
} from 'tldraw';
import 'tldraw/tldraw.css';
import { useEditorStore } from '@/stores/useEditorStore';
import { FloatingMarkerToolbar } from './tldraw/FloatingMarkerToolbar';

// --- Zone shape modules ---
import { ZoneCircleShapeUtil, ZoneCircleTool } from './tldraw/zone-circle';
import { ZoneRectShapeUtil, ZoneRectTool } from './tldraw/zone-rect';
import { LinkLineShapeUtil, LinkLineTool } from './tldraw/link-line';
import { MarkerShapeUtil } from './tldraw/marker-shape';
import { MarkerTool } from './tldraw/marker-tool';
import { uiOverrides } from './tldraw/ui-overrides';
import { CustomToolbar } from './tldraw/CustomToolbar';

// --- Editor event bridge ---

const EditorEventsListener: React.FC = () => {
  const editor = useEditor();
  const triggerCopy = useEditorStore(state => state.triggerCopy);
  const triggerSave = useEditorStore(state => state.triggerSave);

  useEffect(() => {
    if (triggerCopy === 0) return;
    const handleCopy = async () => {
      try {
        const shapeIds = editor.getSelectedShapeIds();
        const idsToCopy = shapeIds.length > 0 ? shapeIds : Array.from(editor.getCurrentPageShapeIds().values());

        if (idsToCopy.length === 0) return;

        await copyAs(editor, idsToCopy, { format: 'png' });
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    };
    handleCopy();
  }, [triggerCopy, editor]);

  useEffect(() => {
    if (triggerSave === 0) return;
    const handleSave = async () => {
      try {
        const shapeIds = editor.getSelectedShapeIds();
        const idsToSave = shapeIds.length > 0 ? shapeIds : Array.from(editor.getCurrentPageShapeIds().values());

        if (idsToSave.length === 0) return;

        await exportAs(editor, idsToSave, { format: 'png' });
      } catch (err) {
        console.error("Failed to save:", err);
      }
    };
    handleSave();
  }, [triggerSave, editor]);

  return null;
}

// --- Main container ---

// --- Background Manager ---

/**
 * 背景画像の配置をリアクティブに管理するコンポーネント
 * Tldraw の子コンポーネントとして配置する必要がある (useEditor を使用するため)
 */
const BackgroundManager: React.FC = () => {
  const editor = useEditor();
  const lastCapturedFrame = useEditorStore((state) => state.lastCapturedFrame);
  const isHydrated = useEditorStore((state) => state.isHydrated);

  useEffect(() => {
    if (!isHydrated || !lastCapturedFrame || !editor) return;

    console.log('[Canvas] Placing background image...');

    try {
      const timestamp = Date.now();
      const assetId = AssetRecordType.createId();
      const shapeId = createShapeId('bg-screenshot');

      const img = new Image();
      img.onload = () => {
        editor.run(() => {
          // 新しいアセットを作成
          editor.createAssets([
            {
              id: assetId,
              type: 'image',
              typeName: 'asset',
              props: {
                name: `screenshot-${timestamp}.png`,
                src: lastCapturedFrame,
                w: img.width,
                h: img.height,
                mimeType: 'image/png',
                isAnimated: false,
              },
              meta: {},
            }
          ]);

          const existing = editor.getShape(shapeId);
          if (existing) {
            editor.updateShape({
              id: shapeId,
              type: 'image',
              isLocked: true, 
              props: {
                assetId,
                w: img.width,
                h: img.height,
              }
            });
          } else {
            editor.createShape({
              id: shapeId,
              type: 'image',
              x: 0,
              y: 0,
              isLocked: true,
              props: {
                w: img.width,
                h: img.height,
                assetId,
              }
            });
          }

          editor.sendToBack([shapeId]);
          
          // 背景にズームを合わせる
          editor.zoomToBounds({ x: 0, y: 0, w: img.width, h: img.height }, { inset: 0 });

          console.log('[Canvas] Background image placed successfully.');
        }, { history: 'ignore' });
      };
      img.onerror = (e) => console.error('[Canvas] Image load error:', e);
      img.src = lastCapturedFrame;
    } catch (e) {
      console.error('[Canvas] Background placement failed:', e);
    }
  }, [editor, lastCapturedFrame, isHydrated]);

  return null;
};

// --- Main container ---

export const CanvasContainer: React.FC = () => {
  // URLからcaptureIdを取得し、タブごとにキャンバス状態を分離する
  const captureId = new URLSearchParams(window.location.search).get('id') || 'default';
  const persistenceKey = `footics-video-canvas-${captureId}`;

  const handleMount = (editor: Editor) => {
    // 初期設定 (背景以外)
    editor.updateInstanceState({ isReadonly: false });
    editor.user.updateUserPreferences({ isSnapMode: true });
  };

  return (
    <div className="w-full h-full isolate">
      <Tldraw
        persistenceKey={persistenceKey}
        inferDarkMode
        tools={[ZoneCircleTool, ZoneRectTool, LinkLineTool, MarkerTool]}
        shapeUtils={[ZoneCircleShapeUtil, ZoneRectShapeUtil, LinkLineShapeUtil, MarkerShapeUtil]}
        overrides={[uiOverrides]}
        onMount={handleMount}
        // Remove unnecessary built-in menus by hiding them via components
        components={{
          Toolbar: CustomToolbar,
          HelpMenu: null,
          MainMenu: null, // Keep minimal UI
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
