import type { Player, TempPlayer } from '@/lib/db';

export const formatPlayerLabel = (
  player: Player | TempPlayer | undefined
): string | undefined => {
  if (!player) {
    return undefined;
  }

  const hasName = Boolean(player.name);
  const hasNumber = Number.isFinite(player.number);

  if (!hasName && !hasNumber) {
    return undefined;
  }

  const numberFragment = hasNumber ? `#${player.number}` : '';
  const nameFragment = hasName ? String(player.name) : '';

  return [numberFragment, nameFragment].filter(Boolean).join(' ').trim();
};

export const formatPlayerListLabel = (
  player: TempPlayer,
  fallbackPosition: string = '選手'
): string => {
  const positionLabel = player.position?.trim() || fallbackPosition;
  const hasNumber = Number.isFinite(player.number);
  const numberFragment = hasNumber ? ` #${player.number}` : '';
  const nameFragment = player.name ? ` ${player.name}` : '';
  return `${positionLabel}${numberFragment}${nameFragment}`.trim();
};
