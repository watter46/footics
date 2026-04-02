"use client";

import React from "react";
import { OutcomeFilter as OutcomeType } from "@/types";

const OUTCOME_OPTIONS = [
  { id: "all", label: "All", icon: "●" },
  { id: "success", label: "Success", icon: "✓" },
  { id: "fail", label: "Fail", icon: "✗" },
] as const;

interface OutcomeFilterProps {
  outcomeFilter: OutcomeType;
  onChange: (outcome: OutcomeType) => void;
}

export const OutcomeFilter: React.FC<OutcomeFilterProps> = ({
  outcomeFilter,
  onChange,
}) => {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Outcome
      </label>
      <div className="flex gap-1">
        {OUTCOME_OPTIONS.map((option) => {
          const isActive = outcomeFilter === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id as OutcomeType)}
              className={`
                flex-1 px-2 py-1.5 rounded-md text-xs font-medium
                transition-all duration-200 border
                ${
                  isActive
                    ? option.id === "success"
                      ? "bg-green-600/20 border-green-500/50 text-green-400"
                      : option.id === "fail"
                        ? "bg-red-600/20 border-red-500/50 text-red-400"
                        : "bg-slate-700/50 border-slate-600 text-slate-200"
                    : "bg-slate-800/50 border-slate-700/50 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                }
              `}
            >
              <span className="mr-1">{option.icon}</span>
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
