import type { AnnotationsData } from '../types';

export function cascadeRemoveMarker(
  annotations: AnnotationsData,
  markerId: string,
): AnnotationsData {
  return {
    ...annotations,
    arrows: annotations.arrows.filter(
      (a) => a.sourcePlayerId !== markerId && a.targetPlayerId !== markerId,
    ),
    markers: annotations.markers
      .filter((m) => m.id !== markerId)
      .map((m) => ({
        ...m,
        connectLines: (m.connectLines ?? []).filter(
          (cl) => cl.toPlayerId !== markerId,
        ),
      })),
  };
}

export function cascadeRemoveSelected(
  annotations: AnnotationsData,
  idSet: Set<string>,
): AnnotationsData {
  const removedMarkerIds = new Set(
    annotations.markers.filter((m) => idSet.has(m.id)).map((m) => m.id),
  );
  return {
    arrows: annotations.arrows.filter(
      (a) =>
        !idSet.has(a.id) &&
        (!a.sourcePlayerId || !removedMarkerIds.has(a.sourcePlayerId)) &&
        (!a.targetPlayerId || !removedMarkerIds.has(a.targetPlayerId)),
    ),
    zones: annotations.zones.filter((z) => !idSet.has(z.id)),
    texts: annotations.texts.filter((t) => !idSet.has(t.id)),
    markers: annotations.markers
      .filter((m) => !idSet.has(m.id))
      .map((m) => ({
        ...m,
        connectLines: (m.connectLines ?? []).filter(
          (cl) => !idSet.has(cl.id) && !removedMarkerIds.has(cl.toPlayerId),
        ),
      })),
  };
}
