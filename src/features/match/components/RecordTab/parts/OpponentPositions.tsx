import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface OpponentPositionsProps {
  onPositionClick: (position: string) => void;
}

const OPPONENT_POSITIONS = ['相手GK', '相手DF', '相手MF', '相手FW'];

export const OpponentPositions = ({ onPositionClick }: OpponentPositionsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground text-lg">
          相手チーム（ポジション別）
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {OPPONENT_POSITIONS.map(position => (
            <Button
              key={position}
              variant="outline"
              className="h-auto py-4"
              onClick={() => onPositionClick(position)}
            >
              {position}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
