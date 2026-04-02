"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ZonePicker } from "@/components/ui/zone-picker";
import { LengthInput } from "@/components/ui/length-input";
import { eventStrategies } from "@/registry";
import { Filter } from "lucide-react";

interface StrategyFilterProps {
  activeStrategies: Set<string>;
  activeStrategyParams: Record<string, Record<string, unknown>>;
  onStrategyToggle: (strategyId: string) => void;
  onStrategyParamChange: (strategyId: string, paramId: string, value: unknown) => void;
}

export const StrategyFilter: React.FC<StrategyFilterProps> = ({
  activeStrategies,
  activeStrategyParams,
  onStrategyToggle,
  onStrategyParamChange,
}) => {
  return (
    <div className="space-y-3 pt-4 border-t border-slate-800">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Event Scopes
      </label>
      <div className="flex flex-col gap-2">
        {eventStrategies.map((strategy) => {
          const isActive = activeStrategies.has(strategy.id);
          const strategyParams = activeStrategyParams[strategy.id] || {};

          return (
            <div key={strategy.id} className="relative group">
              <Button
                variant={isActive ? "default" : "outline"}
                onClick={() => onStrategyToggle(strategy.id)}
                className={`w-full justify-start transition-all duration-300 ${
                  isActive
                    ? strategy.color
                    : "border-slate-700 text-slate-300 bg-slate-800/50 hover:bg-slate-800"
                }`}
                title={strategy.description}
              >
                <Filter className="mr-2 h-4 w-4" />
                {strategy.label}
              </Button>

              {/* Strategy Parameters */}
              {isActive &&
                strategy.params &&
                strategy.params.length > 0 && (
                  <div className="mt-2 ml-2 pl-3 border-l-2 border-fuchsia-600/40 space-y-3">
                    {strategy.params.map((param) => {
                      if (param.type === "length") {
                        return (
                          <div key={param.id}>
                            <label className="text-xs text-slate-400 mb-1 block">
                              {param.label}
                            </label>
                            <LengthInput
                              value={(strategyParams[param.id] as Record<string, unknown>) || {}}
                              onChange={(val) =>
                                onStrategyParamChange(strategy.id, param.id, val)
                              }
                            />
                          </div>
                        );
                      }
                      if (param.type === "zone") {
                        return (
                          <div key={param.id}>
                            <label className="text-xs text-slate-400 mb-1 block">
                              {param.label}
                            </label>
                            <ZonePicker
                              selectedZones={
                                (strategyParams[param.id] as number[]) || []
                              }
                              onChange={(zones) =>
                                onStrategyParamChange(strategy.id, param.id, zones)
                              }
                            />
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
