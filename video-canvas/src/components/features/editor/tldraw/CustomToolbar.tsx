import React from 'react';
import {
  DefaultToolbar,
  TldrawUiMenuItem,
  useTools,
  useIsToolSelected,
} from 'tldraw';

/**
 * Custom toolbar showing only the tools relevant to video-canvas analysis:
 * select, hand, arrow, Zone Circle, Zone Rect, Link Line, Marker.
 */
export const CustomToolbar: React.FC = () => {
  const tools = useTools();

  const select = tools['select'];
  const hand = tools['hand'];
  const arrow = tools['arrow'];
  const zoneCircle = tools['zone_circle'];
  const zoneRect = tools['zone_rect'];
  const linkLine = tools['link_line'];
  const marker = tools['marker'];

  // ツールが一つも見つからない場合は何も表示しない（クラッシュ防止）
  if (!select && !hand && !arrow && !zoneCircle && !zoneRect && !linkLine && !marker) {
    return null;
  }

  return (
    <DefaultToolbar>
      {select && <TldrawUiMenuItem {...select} isSelected={useIsToolSelected(select)} />}
      {hand && <TldrawUiMenuItem {...hand} isSelected={useIsToolSelected(hand)} />}
      {arrow && <TldrawUiMenuItem {...arrow} isSelected={useIsToolSelected(arrow)} />}
      {zoneCircle && <TldrawUiMenuItem {...zoneCircle} isSelected={useIsToolSelected(zoneCircle)} />}
      {zoneRect && <TldrawUiMenuItem {...zoneRect} isSelected={useIsToolSelected(zoneRect)} />}
      {linkLine && <TldrawUiMenuItem {...linkLine} isSelected={useIsToolSelected(linkLine)} />}
      {marker && <TldrawUiMenuItem {...marker} isSelected={useIsToolSelected(marker)} />}
    </DefaultToolbar>
  );
};

