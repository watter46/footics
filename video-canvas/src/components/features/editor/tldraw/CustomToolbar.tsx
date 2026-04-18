import type React from 'react';
import {
  DefaultToolbar,
  TldrawUiMenuItem,
  useIsToolSelected,
  useTools,
} from 'tldraw';

/**
 * カスタムツールバー。
 * コネクタは Floating Marker Toolbar 専用のためここには表示しない。
 */
export const CustomToolbar: React.FC = () => {
  const tools = useTools();

  const select = tools['select'];
  const hand = tools['hand'];
  const arrow = tools['arrow'];
  const zoneCircle = tools['zone_circle'];
  const zoneRect = tools['zone_rect'];
  const zonePath = tools['zone_path'];
  const marker = tools['marker'];

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
      {select && (
        <TldrawUiMenuItem {...select} isSelected={useIsToolSelected(select)} />
      )}
      {hand && (
        <TldrawUiMenuItem {...hand} isSelected={useIsToolSelected(hand)} />
      )}
      {arrow && (
        <TldrawUiMenuItem {...arrow} isSelected={useIsToolSelected(arrow)} />
      )}
      {zoneCircle && (
        <TldrawUiMenuItem
          {...zoneCircle}
          isSelected={useIsToolSelected(zoneCircle)}
        />
      )}
      {zoneRect && (
        <TldrawUiMenuItem
          {...zoneRect}
          isSelected={useIsToolSelected(zoneRect)}
        />
      )}
      {zonePath && (
        <TldrawUiMenuItem
          {...zonePath}
          isSelected={useIsToolSelected(zonePath)}
        />
      )}
      {marker && (
        <TldrawUiMenuItem {...marker} isSelected={useIsToolSelected(marker)} />
      )}
    </DefaultToolbar>
  );
};
