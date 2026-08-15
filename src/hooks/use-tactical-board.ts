import type { Match } from '@/types';
import { useTacticalDnd } from './tactical/use-tactical-dnd';
import { useTacticalFormation } from './tactical/use-tactical-formation';
import { useTacticalPersistence } from './tactical/use-tactical-persistence';

export function useTacticalBoard(
  matchId: string,
  metadata: Match | null,
  isOpen: boolean,
) {
  useTacticalPersistence(matchId, metadata, isOpen);
  const dnd = useTacticalDnd();
  const formation = useTacticalFormation(metadata);

  return {
    ...dnd,
    ...formation,
  };
}
