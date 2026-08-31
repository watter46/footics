'use client';

import { Users } from 'lucide-react';
import type React from 'react';
import { Card } from '@/components/ui/card';
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

export const SquadStatsSummary: React.FC<SquadStatsSummaryProps> = ({
  totalCount,
  positionCategories,
  playersByCategory,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <Card className="bg-slate-900/50 border-slate-800/80 p-4 rounded-xl flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20">
          <Users className="w-4 h-4" />
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">
            Total Squad
          </span>
          <span className="text-xl font-black text-slate-100">
            {totalCount}
          </span>
        </div>
      </Card>

      {positionCategories.map((cat) => (
        <Card
          key={cat.key}
          className="bg-slate-900/50 border-slate-800/80 p-4 rounded-xl flex items-center gap-3"
        >
          <div className="p-2.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60">
            <span className="text-xs font-black">{cat.key}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider truncate">
              {cat.label}
            </span>
            <span className="text-xl font-black text-slate-100">
              {playersByCategory[cat.key]?.length || 0}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
};
