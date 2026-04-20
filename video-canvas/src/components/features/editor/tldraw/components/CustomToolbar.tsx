import { Maximize, RectangleHorizontal, Square } from 'lucide-react';
import type React from 'react';
import {
  DefaultToolbar,
  TldrawUiMenuItem,
  useEditor,
  useIsToolSelected,
  useTools,
} from 'tldraw';
import { BG_SCREENSHOT_ID, CAPTURE_FRAME_ID } from '../styles/constants';

/**
 * カスタムツールバーの各アイテムを表示するためのコンポーネント。
 * Hooks (useIsToolSelected) を条件分岐の外で呼ぶために分離。
 */
const ToolbarItem: React.FC<{ tool: any }> = ({ tool }) => {
  const isSelected = useIsToolSelected(tool);
  return <TldrawUiMenuItem {...tool} isSelected={isSelected} />;
};

/**
 * カスタムツールバー。
 * コネクタは Floating Marker Toolbar 専用のためここには表示しない。
 */
export const CustomToolbar: React.FC = () => {
  const tools = useTools();

  const select = tools.select;
  const hand = tools.hand;
  const arrow = tools.arrow;
  const zoneCircle = tools.zone_circle;
  const zoneRect = tools.zone_rect;
  const zonePath = tools.zone_path;
  const marker = tools.marker;

  if (
    !select &&
    !hand &&
    !arrow &&
    !zoneCircle &&
    !zoneRect &&
    !zonePath &&
    !marker
  ) {
    return null;
  }

  return (
    <DefaultToolbar>
      <div className="flex items-center">
        {select && <ToolbarItem tool={select} />}
        {hand && <ToolbarItem tool={hand} />}
        {arrow && <ToolbarItem tool={arrow} />}
        {zoneCircle && <ToolbarItem tool={zoneCircle} />}
        {zoneRect && <ToolbarItem tool={zoneRect} />}
        {zonePath && <ToolbarItem tool={zonePath} />}
        {marker && <ToolbarItem tool={marker} />}
      </div>
      <AspectRatioPresets />
    </DefaultToolbar>
  );
};

const AspectRatioPresets: React.FC = () => {
  const editor = useEditor();

  const setRatio = (ratio?: number) => {
    const frameId = CAPTURE_FRAME_ID;
    const shape = editor.getShape(frameId);
    if (!shape) return;

    const { w, h } = shape.props as any;
    const cx = shape.x + w / 2;
    const cy = shape.y + h / 2;

    let newW = w;
    let newH = h;

    if (ratio !== undefined && ratio !== null) {
      // 幅を維持して高さを調整
      newH = w / ratio;
    } else {
      // 背景に合わせる
      const bgId = BG_SCREENSHOT_ID;
      const bg = editor.getShape(bgId);
      if (bg) {
        newW = (bg.props as any).w;
        newH = (bg.props as any).h;
      }
    }

    editor.updateShape({
      id: frameId,
      type: 'capture_frame' as any,
      x: cx - newW / 2,
      y: cy - newH / 2,
      props: { w: newW, h: newH },
    });
  };

  return (
    <div className="flex items-center px-1 border-l border-[var(--color-divider)] ml-1 gap-1">
      <button
        type="button"
        className="tlui-button tlui-button__icon"
        onClick={() => setRatio()}
        title="背景に合わせる"
      >
        <Maximize size={18} />
      </button>
      <button
        type="button"
        className="tlui-button tlui-button__icon"
        onClick={() => setRatio(16 / 9)}
        title="16:9"
      >
        <RectangleHorizontal size={18} />
      </button>
      <button
        type="button"
        className="tlui-button tlui-button__icon"
        onClick={() => setRatio(1 / 1)}
        title="1:1"
      >
        <Square size={18} />
      </button>
    </div>
  );
};
