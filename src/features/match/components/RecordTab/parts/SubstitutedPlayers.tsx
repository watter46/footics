import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubstituteList } from '@/features/match/components/SetupTab/parts/SubstituteList';
import type { Player } from '@/lib/db';

interface SubstitutedPlayersProps {
  players: Player[];
}

export const SubstitutedPlayers = ({ players }: SubstitutedPlayersProps) => {
  if (players.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground text-lg">
          交代済み選手
        </CardTitle>
      </CardHeader>
      <CardContent>
        <SubstituteList
          players={players}
          selectedPlayerId={null}
          onPlayerSelect={() => {}}
          disabled
        />
      </CardContent>
    </Card>
  );
};
