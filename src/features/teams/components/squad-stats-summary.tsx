'use client';

import { KpiTile } from '@/components/ui/card';
import type { Player, StandardPosition } from '@/types';

export interface PositionCategory {
  key: StandardPosition;
  label: string;
  positions: Array<Player['position']>;
}

export interface SquadStatsSummaryProps {
  totalCount: number;
  positionCategories: PositionCategory[];
  playersByCategory: Record<string, Player[]>;
}

const POSITION_ACCENTS: Record<string, string> = {
  GK: '#EAB308',
  DF: '#3B82F6',
  MF: '#10B981',
  FW: '#EF4444',
};

export function SquadStatsSummary({
  totalCount,
  positionCategories,
  playersByCategory,
}: SquadStatsSummaryProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <KpiTile title="Total Squad" value={totalCount} accentColor="#FF8100" />

      {positionCategories.map((cat) => (
        <KpiTile
          key={cat.key}
          title={cat.label}
          value={playersByCategory[cat.key]?.length || 0}
          subtext={cat.key}
          accentColor={POSITION_ACCENTS[cat.key] || '#71717A'}
        />
      ))}
    </div>
  );
}
