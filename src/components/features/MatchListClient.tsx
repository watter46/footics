"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import type { MatchSummary } from "@/lib/data/scan-matches";
import { Calendar, Filter, X } from "lucide-react";

interface Props {
  matches: MatchSummary[];
}

// チームフィルター定義 (拡張しやすいように配列で管理)
const TEAM_FILTERS = [
  { label: "Chelsea", value: "Chelsea" },
];

export function MatchListClient({ matches }: Props) {
  const [activeTeam, setActiveTeam] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"all" | "club" | "national">("all");

  const sortedAndFiltered = useMemo(() => {
    let sorted = [...matches].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    if (activeType !== "all") {
      sorted = sorted.filter((m) => m.matchType === activeType);
    }
    if (activeTeam) {
      sorted = sorted.filter(
        (m) =>
          m.homeTeam.name.toLowerCase().includes(activeTeam.toLowerCase()) ||
          m.awayTeam.name.toLowerCase().includes(activeTeam.toLowerCase())
      );
    }
    return sorted;
  }, [matches, activeTeam, activeType]);

  return (
    <div className="flex flex-col gap-6">
      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
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
          <span className="text-xs text-slate-500 ml-auto">
            {sortedAndFiltered.length} match{sortedAndFiltered.length !== 1 ? "es" : ""}
          </span>
        )}
      </div>

      {/* Match List */}
      {sortedAndFiltered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-600">
          <Filter className="w-10 h-10 opacity-40" />
          <p className="text-base font-medium">No matches found</p>
          <button
            onClick={() => setActiveTeam(null)}
            className="text-sm text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
          >
            Clear filter
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sortedAndFiltered.map((match, i) => {
            const isLatest = i === 0 && !activeTeam;
            return (
              <Link key={match.id} href={`/match/${match.id}`}>
                <div
                  className={`relative bg-slate-900 border hover:bg-slate-800/80 transition-all duration-200 overflow-hidden group cursor-pointer w-full rounded-xl shadow hover:shadow-blue-900/10 flex flex-row ${
                    isLatest
                      ? "border-blue-500/40 shadow-blue-900/20"
                      : "border-slate-800 hover:border-blue-500/30"
                  }`}
                >
                  {isLatest && (
                    <span className="absolute top-2.5 left-3 text-[10px] font-bold uppercase tracking-widest text-blue-400/80 z-10">
                      Latest
                    </span>
                  )}

                  {/* Date column */}
                  <div className="px-4 py-3 sm:px-5 sm:py-4 w-28 sm:w-36 border-r border-slate-800 flex flex-col justify-center items-start gap-1.5 bg-slate-900/50 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <Calendar className="w-3 h-3 text-blue-400/70" />
                      {match.date
                        ? new Date(match.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </div>
                    <div className="text-[10px] text-slate-600 font-mono">
                      {match.date ? new Date(match.date).getFullYear() : ""}
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/60 text-slate-500 font-mono mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis w-full max-w-full block">
                      #{match.id}
                    </span>
                    {match.matchType === "national" && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-900/40 border border-emerald-500/40 text-emerald-400 font-semibold mt-0.5 uppercase tracking-wider">
                        National
                      </span>
                    )}
                  </div>

                  {/* Match content */}
                  <div className="p-3 sm:p-4 flex-1 flex justify-between items-center gap-2 sm:gap-4">
                    {/* Home Team */}
                    <div className="flex items-center gap-2 sm:gap-3 w-[38%] justify-end text-right">
                      <span className="font-bold text-xs sm:text-base leading-tight line-clamp-1 text-slate-100">
                        {match.homeTeam.name}
                      </span>
                      <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg bg-slate-100 flex items-center justify-center p-1.5 shadow-inner transform group-hover:scale-105 transition-transform duration-200 shrink-0">
                        <img
                          src={`https://d2zywfiolv4f83.cloudfront.net/img/teams/${match.homeTeam.id}.png`}
                          alt={match.homeTeam.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>

                    {/* Score */}
                    <div className="flex flex-col items-center justify-center flex-1 z-10">
                      <div className="text-xl sm:text-3xl font-extrabold tracking-tighter text-slate-50 whitespace-nowrap tabular-nums">
                        {match.score.replace(/\s+/g, "").replace(":", " - ")}
                      </div>
                      <div className="text-[9px] sm:text-[10px] text-slate-600 mt-0.5 uppercase tracking-widest font-bold">
                        FT
                      </div>
                    </div>

                    {/* Away Team */}
                    <div className="flex items-center gap-2 sm:gap-3 w-[38%] justify-start text-left">
                      <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg bg-slate-100 flex items-center justify-center p-1.5 shadow-inner transform group-hover:scale-105 transition-transform duration-200 shrink-0">
                        <img
                          src={`https://d2zywfiolv4f83.cloudfront.net/img/teams/${match.awayTeam.id}.png`}
                          alt={match.awayTeam.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="font-bold text-xs sm:text-base leading-tight line-clamp-1 text-slate-300 group-hover:text-slate-200 transition-colors">
                        {match.awayTeam.name}
                      </span>
                    </div>
                  </div>

                  {/* Hover accent */}
                  <div className="absolute inset-y-0 left-0 w-0.5 bg-blue-500/0 group-hover:bg-blue-500/60 transition-all duration-200 rounded-l-xl" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
