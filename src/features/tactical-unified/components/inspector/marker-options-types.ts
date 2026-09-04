import type { ArrowAnnotation, Player } from '@/lib/types/tactical-unified';

export interface PlayerMarkerOptionsSectionProps {
  player: Player;
  allPlayers: Player[];
  slideId: string;
  updatePlayer: (slideId: string, id: string, p: Partial<Player>) => void;
  addArrow: (slideId: string, arrow: ArrowAnnotation) => void;
  newBadgeText: string;
  setNewBadgeText: (s: string) => void;
}
