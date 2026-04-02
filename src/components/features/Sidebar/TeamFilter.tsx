"use client";

import React from "react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Team } from "@/types";

interface TeamFilterProps {
  selectedTeam: string;
  teams: { home: Team; away: Team };
  onTeamChange: (teamId: string) => void;
}

export const TeamFilter: React.FC<TeamFilterProps> = ({
  selectedTeam,
  teams,
  onTeamChange,
}) => {
  const selectedTeamName =
    selectedTeam === "all"
      ? ""
      : selectedTeam === teams.home.teamId.toString()
        ? teams.home.name
        : teams.away.name;

  return (
    <div className="space-y-2 mb-4">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Team Filter
      </label>
      <Select value={selectedTeam} onValueChange={(val) => onTeamChange(val || "all")}>
        <SelectTrigger className="w-full bg-slate-800/50 border-slate-700 text-slate-200">
          <SelectValue placeholder="All Teams">
            {selectedTeam === "all" ? "All Teams" : selectedTeamName}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
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
};
