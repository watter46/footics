'use client';

import { ChevronDown, Eraser, RotateCcw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FORMATION_LIST, type FormationType } from '@/lib/data/formations';
import { QUICK_FORMATIONS } from './formation-presets-data';

interface FormationPresetSelectorProps {
  selectedFormation: FormationType;
  onSelectFormation: (formation: FormationType) => void;
  onResetFormation?: () => void;
  onClearPitch?: () => void;
}

export function FormationPresetSelector({
  selectedFormation,
  onSelectFormation,
  onResetFormation,
  onClearPitch,
}: FormationPresetSelectorProps) {
  const [isOpenMore, setIsOpenMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFormations = useMemo(() => {
    if (!searchQuery.trim()) return FORMATION_LIST;
    return FORMATION_LIST.filter((f) =>
      f.toLowerCase().includes(searchQuery.trim().toLowerCase()),
    );
  }, [searchQuery]);

  return (
    <div className="p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
          Quick Formations
        </span>
        <div className="flex items-center gap-1">
          {onResetFormation && (
            <button
              type="button"
              onClick={onResetFormation}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Reset to default formation positions"
            >
              <RotateCcw size={10} className="text-amber-400" />
              <span>Reset</span>
            </button>
          )}
          {onClearPitch && (
            <button
              type="button"
              onClick={onClearPitch}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Clear all players from pitch to bench"
            >
              <Eraser size={10} className="text-rose-400" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Formation Chips */}
      <div className="grid grid-cols-5 gap-1">
        {QUICK_FORMATIONS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onSelectFormation(f)}
            className={`py-1 rounded text-[10.5px] font-mono text-center transition-all cursor-pointer truncate ${
              selectedFormation === f
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'bg-white/5 text-white/70 hover:bg-white/15 hover:text-white'
            }`}
            title={`Apply ${f}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Collapsible: More Formations & Search */}
      <div className="pt-0.5">
        <button
          type="button"
          onClick={() => setIsOpenMore((v) => !v)}
          className="flex items-center justify-between w-full py-1 text-[11px] text-white/60 hover:text-white transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Search size={11} className="text-white/40" />
            <span>More Formations ({FORMATION_LIST.length})</span>
          </span>
          <div className="flex items-center gap-1">
            {selectedFormation && (
              <span className="text-[10px] font-mono text-blue-400">
                {selectedFormation}
              </span>
            )}
            <ChevronDown
              size={12}
              className={`transition-transform duration-150 ${isOpenMore ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {isOpenMore && (
          <div className="mt-1.5 space-y-1.5 p-2 bg-black/40 rounded-lg border border-white/10">
            <div className="relative">
              <Search
                size={11}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-white/40"
              />
              <input
                type="text"
                placeholder="Search formations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-6 pr-2 py-1 rounded bg-white/5 border border-white/10 text-white text-[11px] placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
              />
            </div>

            <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto p-1 bg-black/20 rounded border border-white/5 custom-scrollbar">
              {filteredFormations.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => onSelectFormation(f)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                    selectedFormation === f
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'bg-white/5 text-white/70 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
