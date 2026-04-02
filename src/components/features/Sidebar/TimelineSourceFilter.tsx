"use client";

import React from "react";

const TIMELINE_SOURCE_OPTIONS = [
  { id: "all", label: "All Events" },
  { id: "custom", label: "My Memos" },
  { id: "whoscored", label: "WhoScored" },
] as const;

interface TimelineSourceFilterProps {
  timelineSource: "all" | "whoscored" | "custom";
  onChange: (source: "all" | "whoscored" | "custom") => void;
}

export const TimelineSourceFilter: React.FC<TimelineSourceFilterProps> = ({
  timelineSource,
  onChange,
}) => {
  return (
    <div className="space-y-2 mb-4">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Timeline Source
      </label>
      <div className="flex bg-slate-800/50 p-1 rounded-lg">
        {TIMELINE_SOURCE_OPTIONS.map((option) => {
          const isActive = timelineSource === option.id;
          return (
            <button
              key={option.id}
              onClick={() => onChange(option.id as any)}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
                isActive
                  ? "bg-amber-600 text-amber-50 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
