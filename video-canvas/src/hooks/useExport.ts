import { useCallback } from 'react';
import { copyAs, type Editor, exportAs } from 'tldraw';
import type { TLCaptureFrameShape } from '@/components/features/editor/tldraw/shapes/capture-frame';
import {
  BG_SCREENSHOT_ID,
  CAPTURE_FRAME_ID,
  MAX_OPTIMIZED_WIDTH,
} from '@/components/features/editor/tldraw/styles/constants';
import type { AppShape } from '@/components/features/editor/tldraw/types/app-shapes';
import { useEditorStore } from '@/stores/useEditorStore';

/**
 * キャンバスの内容をコピーまたは保存するためのロジックを管理するフック
 */
export function useExport() {
  const setExportStatus = useEditorStore((state) => state.setExportStatus);

  const performExport = useCallback(
    async (editor: Editor, type: 'copy' | 'save') => {
      setExportStatus('loading', type);

      try {
        const shapeIds = editor.getSelectedShapeIds();
        const hasCaptureFrame = !!editor.getShape(CAPTURE_FRAME_ID);

        // キャプチャフレームがある場合は全図形（フレーム自身は除く）、ない場合は選択範囲または全図形
        const idsToExport = hasCaptureFrame
          ? Array.from(editor.getCurrentPageShapeIds().values()).filter(
              (id) => id !== CAPTURE_FRAME_ID,
            )
          : shapeIds.length > 0
            ? shapeIds
            : Array.from(editor.getCurrentPageShapeIds().values());

        if (idsToExport.length === 0) {
          setExportStatus('idle');
          return;
        }

        const captureBounds = editor.getShapePageBounds(CAPTURE_FRAME_ID);
        const bgBounds = editor.getShapePageBounds(BG_SCREENSHOT_ID);

        // 範囲の決定優先順位: キャプチャフレーム > 背景 > 選択範囲 > 全図形範囲
        const bounds =
          captureBounds ??
          bgBounds ??
          editor.getSelectionPageBounds() ??
          editor.getCurrentPageBounds();

        if (!bounds) {
          setExportStatus('idle');
          return;
        }

        // 最適化のためのスケール計算
        let scale = 1;
        if (bounds.width > MAX_OPTIMIZED_WIDTH) {
          scale = MAX_OPTIMIZED_WIDTH / bounds.width;
        }

        // キャプチャフレームを一時的に非表示にする
        if (hasCaptureFrame) {
          editor.updateShape({
            id: CAPTURE_FRAME_ID,
            type: 'capture_frame',
            props: { isVisible: false },
          } as any);
        }

        const options = {
          format: 'png' as const,
          scale,
          pixelRatio: 1,
          bounds,
          padding: 0,
        };

        if (type === 'copy') {
          await copyAs(editor, idsToExport, options);
        } else {
          await exportAs(editor, idsToExport, options);
        }

        // 非表示を戻す
        if (hasCaptureFrame) {
          editor.updateShape({
            id: CAPTURE_FRAME_ID,
            type: 'capture_frame',
            props: { isVisible: true },
          } as any);
        }

        setExportStatus('success');
        setTimeout(() => setExportStatus('idle'), 3000);
      } catch (err) {
        console.error(`Failed to ${type}:`, err);
        setExportStatus('error');
        setTimeout(() => setExportStatus('idle'), 3000);
      }
    },
    [setExportStatus],
  );

  return { performExport };
}
