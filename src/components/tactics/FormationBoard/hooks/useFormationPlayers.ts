import type { GridPlayer, GridPlayerNullable } from "../types";
import {
  convertToFieldPositionPlayers,
  convertToFormationPlayers,
  getFormationType,
} from "../utils/formation-utils";
import { useMemo } from "react";

/**
 * スタメンかつgridがstringのGamePlayerのみ抽出する型ガード
 */
function isStarterWithGrid<T extends GridPlayerNullable>(
  gridPlayer: T
): gridPlayer is T & GridPlayer {
  return gridPlayer.isStarter && typeof gridPlayer.grid === "string";
}

export function useFormationPlayers<T extends GridPlayerNullable>(
  gridPlayers: T[]
) {
  return useMemo(() => {
    const startingPlayers = gridPlayers.filter(isStarterWithGrid);
    const substitutePlayers = gridPlayers.filter((player) => !player.isStarter);

    const fieldPositionPlayers = convertToFieldPositionPlayers(startingPlayers);
    const formationType = getFormationType(fieldPositionPlayers);
    const formationPlayers = convertToFormationPlayers(
      fieldPositionPlayers,
      formationType
    );

    return {
      startingPlayers,
      substitutePlayers,
      formationPlayers,
      formationType,
    };
  }, [gridPlayers]);
}
