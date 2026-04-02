"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { getEventMetadata } from "@/lib/event-definitions";
import { Phase } from "@/hooks/use-central-focus";

interface PhaseIndicatorProps {
  phase: Phase;
  setPhase: (phase: Phase) => void;
  formattedTime: string;
  selectedLabels: string[];
}

export const PhaseIndicator: React.FC<PhaseIndicatorProps> = ({
  phase,
  setPhase,
  formattedTime,
  selectedLabels,
}) => {
  if (phase === "memo") {
    return (
      <div className="flex bg-slate-950/50 p-4 border-b border-slate-800/80 items-center justify-center gap-4">
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <Badge
            className="bg-amber-500/20 text-amber-500 text-lg py-1 px-3 border border-amber-500/30 cursor-pointer hover:bg-amber-500/30 transition-colors"
            onClick={() => setPhase("timestamp")}
            title="Click to edit time"
          >
            {formattedTime}
          </Badge>
          <div className="flex gap-1 flex-wrap">
            {selectedLabels.map((lbl, i) => {
              const meta = getEventMetadata(lbl);
              return (
                <Badge
                  key={i}
                  className="text-base py-1 px-3 cursor-pointer transition-colors border text-white"
                  style={{ backgroundColor: meta?.groupColor ?? "#8E8E93", borderColor: meta?.groupColor ?? "#8E8E93" }}
                  onClick={() => setPhase("label")}
                  title="Click to edit labels"
                >
                  {lbl}
                </Badge>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-slate-950/50 p-4 border-b border-slate-800/80 items-center justify-center gap-4">
      <div className="text-sm font-medium text-slate-400 tracking-wider w-full text-center relative flex justify-center gap-4">
        <span
          className={`cursor-pointer transition-colors ${phase === "timestamp" ? "text-amber-400 font-bold" : "hover:text-amber-200"}`}
          onClick={() => setPhase("timestamp")}
        >
          1. TIME
        </span>
        <span className="text-slate-600">/</span>
        <span
          className={`cursor-pointer transition-colors ${phase === "label" ? "text-amber-400 font-bold" : "hover:text-amber-200"}`}
          onClick={() => setPhase("label")}
        >
          2. LABEL
        </span>
        <span className="text-slate-600">/</span>
        <span
          className="cursor-pointer transition-colors hover:text-amber-200"
          onClick={() => setPhase("memo")}
        >
          3. MEMO
        </span>
      </div>
    </div>
  );
};
