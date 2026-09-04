import { getLastName } from '@/lib/tactical/player-formatting';
import type { Player } from '@/lib/types/tactical-unified';
import { normX, normY, type OnionSkinRefs } from './player-drag-types';

export function setupOnionSkinGhost(
  prevPlayer: Player | undefined,
  startPx: { x: number; y: number },
  stageSize: { width: number; height: number },
  refs: OnionSkinRefs,
): { x: number; y: number } | null {
  if (!prevPlayer || prevPlayer.area === 'bench') {
    if (refs.ghostGroup) {
      refs.ghostGroup.visible(false);
      refs.ghostGroup.getLayer()?.batchDraw();
    }
    return null;
  }
  const px = {
    x: normX(prevPlayer.x, stageSize.width),
    y: normY(prevPlayer.y, stageSize.height),
  };
  refs.ghostGroup?.visible(true);
  refs.ghostMarkerGroup?.position(px);
  refs.ghostLine?.points([px.x, px.y, startPx.x, startPx.y]);
  refs.ghostCircle?.fill(prevPlayer.style.color);
  refs.ghostText?.text(prevPlayer.shirtNo || '');
  if (refs.ghostLabel)
    refs.ghostLabel.text(prevPlayer.name ? getLastName(prevPlayer.name) : '');
  refs.ghostGroup?.getLayer()?.batchDraw();
  return px;
}
