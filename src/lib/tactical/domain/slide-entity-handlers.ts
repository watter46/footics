import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import type { SlideCommand } from './commands';

export function handleInsertEntities(
  prevSlide: DomainSlide,
  command: Extract<SlideCommand, { type: 'INSERT_ENTITIES' }>,
): DomainSlide {
  const addPlayers = command.players ?? [];
  const addArrows = command.arrows ?? [];
  const addZones = command.zones ?? [];
  const addTexts = command.texts ?? [];
  if (
    addPlayers.length === 0 &&
    addArrows.length === 0 &&
    addZones.length === 0 &&
    addTexts.length === 0
  ) {
    return prevSlide;
  }
  return {
    ...prevSlide,
    players: [...prevSlide.players, ...addPlayers],
    arrows: [...prevSlide.arrows, ...addArrows],
    zones: [...prevSlide.zones, ...addZones],
    texts: [...prevSlide.texts, ...addTexts],
  };
}

export function handleDeleteEntities(
  prevSlide: DomainSlide,
  ids: readonly string[],
): DomainSlide {
  const idSet = new Set(ids);
  return {
    ...prevSlide,
    players: prevSlide.players.filter((p) => !idSet.has(p.id)),
    arrows: prevSlide.arrows.filter((a) => !idSet.has(a.id)),
    zones: prevSlide.zones.filter((z) => !idSet.has(z.id)),
    texts: prevSlide.texts.filter((t) => !idSet.has(t.id)),
  };
}

export function handleResetSlideObjects(
  prevSlide: DomainSlide,
  keepSquad: boolean,
): DomainSlide {
  const players = keepSquad
    ? prevSlide.players.map((p) => {
        if (p.area === 'bench') return p;
        return {
          ...p,
          connectLines: [],
          badges: [],
          visionCone: undefined,
          focus: undefined,
          trajectory: undefined,
        };
      })
    : [];

  return {
    ...prevSlide,
    players,
    arrows: [],
    zones: [],
    texts: [],
    ball: { ...prevSlide.ball, trajectory: undefined },
  };
}
