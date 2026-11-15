export interface PlayerMatchCandidate {
  readonly id: string;
  readonly team: 'home' | 'away' | 'neutral';
  readonly shirtNo?: string;
  readonly name?: string;
}

export interface MatchedPlayerPair<
  TPlayer extends PlayerMatchCandidate = PlayerMatchCandidate,
> {
  readonly key: string;
  readonly playerA?: TPlayer;
  readonly playerB?: TPlayer;
}

const playerMatchCache = new WeakMap<
  readonly PlayerMatchCandidate[],
  WeakMap<
    readonly PlayerMatchCandidate[],
    MatchedPlayerPair<PlayerMatchCandidate>[]
  >
>();

/**
 * Matches players across two slides by:
 * 1. Exact ID match
 * 2. Team + Shirt Number match (if shirtNo is defined and non-empty)
 * 3. Team + Player Name match (if name is defined and non-empty)
 * 4. Unmatched players in Slide A (fade out)
 * 5. Unmatched players in Slide B (fade in)
 */
export function matchSlidePlayers<TPlayer extends PlayerMatchCandidate>(
  playersA: readonly TPlayer[],
  playersB: readonly TPlayer[],
): MatchedPlayerPair<TPlayer>[] {
  const cachedForA = playerMatchCache.get(playersA);
  const cachedResult = cachedForA?.get(playersB);
  if (cachedResult) {
    return cachedResult as MatchedPlayerPair<TPlayer>[];
  }

  const result: MatchedPlayerPair<TPlayer>[] = [];
  const unmatchedA = new Map(playersA.map((p) => [p.id, p]));
  const unmatchedB = new Map(playersB.map((p) => [p.id, p]));

  // 1. Exact ID matching
  for (const [id, pA] of Array.from(unmatchedA.entries())) {
    const pB = unmatchedB.get(id);
    if (pB) {
      result.push({ key: id, playerA: pA, playerB: pB });
      unmatchedA.delete(id);
      unmatchedB.delete(id);
    }
  }

  // 2. Team + Shirt Number matching
  for (const [idA, pA] of Array.from(unmatchedA.entries())) {
    const shirtNoA = pA.shirtNo?.trim();
    if (!shirtNoA) continue;
    const matchEntry = Array.from(unmatchedB.entries()).find(
      ([, pB]) => pB.team === pA.team && pB.shirtNo?.trim() === shirtNoA,
    );
    if (matchEntry) {
      const [idB, pB] = matchEntry;
      result.push({ key: idA, playerA: pA, playerB: pB });
      unmatchedA.delete(idA);
      unmatchedB.delete(idB);
    }
  }

  // 3. Team + Name matching
  for (const [idA, pA] of Array.from(unmatchedA.entries())) {
    const nameA = pA.name?.trim().toLowerCase();
    if (!nameA) continue;
    const matchEntry = Array.from(unmatchedB.entries()).find(
      ([, pB]) =>
        pB.team === pA.team && pB.name?.trim().toLowerCase() === nameA,
    );
    if (matchEntry) {
      const [idB, pB] = matchEntry;
      result.push({ key: idA, playerA: pA, playerB: pB });
      unmatchedA.delete(idA);
      unmatchedB.delete(idB);
    }
  }

  // 4. Remaining in A (disappearing)
  for (const [idA, pA] of unmatchedA.entries()) {
    result.push({ key: idA, playerA: pA });
  }

  // 5. Remaining in B (appearing)
  for (const [idB, pB] of unmatchedB.entries()) {
    result.push({ key: idB, playerB: pB });
  }

  if (!cachedForA) {
    const nextMap = new WeakMap<
      readonly PlayerMatchCandidate[],
      MatchedPlayerPair<PlayerMatchCandidate>[]
    >();
    nextMap.set(playersB, result);
    playerMatchCache.set(playersA, nextMap);
  } else {
    cachedForA.set(playersB, result);
  }

  return result;
}
