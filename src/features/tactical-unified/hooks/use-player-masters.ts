import { getPlayerMastersBySeason } from '@/lib/db/queries';

export async function fetchPlayerMastersBySeason(
  season: string,
  teamName: string,
) {
  return getPlayerMastersBySeason(season, teamName);
}
