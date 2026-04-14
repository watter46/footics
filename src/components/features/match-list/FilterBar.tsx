"use client";

import React from "react";
import { Filter, X } from "lucide-react";
import { GlobalDataManagement } from "../GlobalDataManagement";

interface FilterBarProps {
  activeType: "all" | "club" | "national";
  setActiveType: (type: "all" | "club" | "national") => void;
  activeTeam: string | null;
  setActiveTeam: (team: string | null) => void;
  resultCount: number;
}

const TEAM_FILTERS = [
  { label: "Chelsea", value: "Chelsea" },
];

export function FilterBar({
  activeType,
  setActiveType,
  activeTeam,
  setActiveTeam,
  resultCount,
}: FilterBarProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap relative z-20">
      <div className="flex items-center gap-1.5 text-slate-500 text-sm font-medium pr-2">
        <Filter className="w-3.5 h-3.5" />
        <span>Type</span>
      </div>
      {(["all", "club", "national"] as const).map((t) => (
        <button
          key={t}
          onClick={() => setActiveType(t)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200 capitalize ${
            activeType === t
              ? "bg-blue-500/20 border-blue-500/60 text-blue-300"
              : "bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
          }`}
        >
          {t}
        </button>
      ))}

      <div className="w-px h-5 bg-slate-700 mx-2" />

      <div className="flex items-center gap-1.5 text-slate-500 text-sm font-medium pr-2">
        <Filter className="w-3.5 h-3.5" />
        <span>Team</span>
      </div>
      {TEAM_FILTERS.map((f) => {
        const isActive = activeTeam === f.value;
        return (
          <button
            key={f.value}
            onClick={() => setActiveTeam(isActive ? null : f.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200 ${
              isActive
                ? "bg-blue-500/20 border-blue-500/60 text-blue-300"
                : "bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
            }`}
          >
            {f.label}
            {isActive && <X className="w-3 h-3 opacity-70" />}
          </button>
        );
      })}
      {activeTeam && (
        <span className="text-xs text-slate-500 ml-auto mr-4 italic">
          {resultCount} match{resultCount !== 1 ? "es" : ""} found
        </span>
      )}
      <div className={activeTeam ? "" : "ml-auto"}>
        <GlobalDataManagement />
      </div>
    </div>
  );
}
