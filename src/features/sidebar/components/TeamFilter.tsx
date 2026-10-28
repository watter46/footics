'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SimplifiedTeam, Team } from '@/types';

interface TeamFilterProps {
  selectedTeam: string;
  teams: { home: Team | SimplifiedTeam; away: Team | SimplifiedTeam };
  onTeamChange: (teamId: string) => void;
}

export function TeamFilter({
  selectedTeam,
  teams,
  onTeamChange,
}: TeamFilterProps) {
  const selectedTeamName =
    selectedTeam === 'all'
      ? ''
      : selectedTeam === teams.home.teamId.toString()
        ? teams.home.name
        : teams.away.name;

  return (
    <div className="space-y-2 mb-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-[#71717A]">
        Team Filter
      </div>
      <Select
        value={selectedTeam}
        onValueChange={(val) => onTeamChange(val || 'all')}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="All Teams">
            {selectedTeam === 'all' ? 'All Teams' : selectedTeamName}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Teams</SelectItem>
          <SelectItem
            value={teams.home.teamId.toString()}
            className="font-medium text-blue-400"
          >
            {teams.home.name} (Home)
          </SelectItem>
          <SelectItem
            value={teams.away.teamId.toString()}
            className="font-medium text-emerald-400"
          >
            {teams.away.name} (Away)
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
