import { useEffect } from 'react';
import { AssetRecordType, type Editor } from 'tldraw';
import {
  BG_SCREENSHOT_ID,
  CAPTURE_FRAME_ID,
} from '@/components/features/editor/tldraw/styles/constants';
import { useEditorStore } from '@/stores/useEditorStore';

/**
 * 背景画像の配置と同期を管理するフック
 */
export function useBackground(editor: Editor | null) {
  const lastCapturedFrame = useEditorStore((state) => state.lastCapturedFrame);
  const isHydrated = useEditorStore((state) => state.isHydrated);

  useEffect(() => {
    if (!isHydrated || !lastCapturedFrame || !editor) return;

    console.log('[useBackground] Placing background image...');

    try {
      const timestamp = Date.now();
      const assetId = AssetRecordType.createId();

      const img = new Image();
      img.onload = () => {
        editor.run(
          () => {
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
              },
            ]);

            const existing = editor.getShape(BG_SCREENSHOT_ID);
            if (existing) {
              editor.updateShape({
                id: BG_SCREENSHOT_ID,
                type: 'image',
                isLocked: true,
                props: {
                  assetId,
                  w: img.width,
                  h: img.height,
                },
              });
            } else {
              editor.createShape({
                id: BG_SCREENSHOT_ID,
                type: 'image',
                x: 0,
                y: 0,
                isLocked: true,
                props: {
                  w: img.width,
                  h: img.height,
                  assetId,
                },
              });
            }

            // キャプチャフレームを作成/更新
            const existingCapture = editor.getShape(CAPTURE_FRAME_ID);
            if (existingCapture) {
              editor.updateShape({
                id: CAPTURE_FRAME_ID,
                type: 'capture_frame' as any,
                x: 0,
                y: 0,
                isLocked: true,
                props: {
                  w: img.width,
                  h: img.height,
                },
              } as any);
            } else {
              editor.createShape({
                id: CAPTURE_FRAME_ID,
                type: 'capture_frame' as any,
                x: 0,
                y: 0,
                isLocked: true,
                props: {
                  w: img.width,
                  h: img.height,
                  isVisible: true,
                },
              } as any);
            }

            editor.sendToBack([BG_SCREENSHOT_ID]);
            // キャプチャフレームは背景のすぐ上に配置
            editor.sendToBack([CAPTURE_FRAME_ID]);
            editor.bringForward([CAPTURE_FRAME_ID]);

            editor.zoomToBounds(
              { x: 0, y: 0, w: img.width, h: img.height },
              { inset: 0 },
            );

            console.log(
              '[useBackground] Background image placed successfully.',
            );
          },
          { history: 'ignore' },
        );
      };
      img.onerror = (e) =>
        console.error('[useBackground] Image load error:', e);
      img.src = lastCapturedFrame;
    } catch (e) {
      console.error('[useBackground] Background placement failed:', e);
    }
  }, [editor, lastCapturedFrame, isHydrated]);
}
