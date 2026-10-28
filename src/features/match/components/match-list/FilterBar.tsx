'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/select';
import { GlobalDataManagement } from '@/features/management';

interface FilterBarProps {
  activeType: 'all' | 'club' | 'national';
  setActiveType: (type: 'all' | 'club' | 'national') => void;
  activeTeam: string | null;
  setActiveTeam: (team: string | null) => void;
  resultCount: number;
}

const TEAM_FILTERS = [{ label: 'Chelsea', value: 'Chelsea' }];

export function FilterBar({
  activeType,
  setActiveType,
  activeTeam,
  setActiveTeam,
  resultCount,
}: FilterBarProps) {
  return (
    <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap relative z-20">
      {/* Type Select */}
      <div className="w-32 sm:w-36 shrink-0">
        <NativeSelect
          aria-label="Match Type"
          value={activeType}
          onChange={(e) =>
            setActiveType(e.target.value as 'all' | 'club' | 'national')
          }
          className="h-8 text-xs py-1"
        >
          <option value="all">All Types</option>
          <option value="club">Club</option>
          <option value="national">National</option>
        </NativeSelect>
      </div>

      {/* Team Search Input */}
      <div className="w-44 sm:w-56 shrink-0">
        <SearchInput
          placeholder="Search team..."
          value={activeTeam ?? ''}
          onChange={(e) => setActiveTeam(e.target.value || null)}
          onClear={() => setActiveTeam(null)}
          className="h-8 text-xs"
        />
      </div>

      {/* Quick Filter Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {TEAM_FILTERS.map((f) => {
          const isActive = activeTeam === f.value;
          return (
            <Button
              key={f.value}
              variant="secondary"
              size="sm"
              isActive={isActive}
              onClick={() => setActiveTeam(isActive ? null : f.value)}
              icon={
                isActive ? <X className="w-3 h-3 text-[#FF8A00]" /> : undefined
              }
              iconPosition="right"
            >
              {f.label}
            </Button>
          );
        })}
      </div>

      {activeTeam && (
        <span className="text-xs text-[#A1A1AA] ml-auto mr-2 sm:mr-4 font-mono italic">
          {resultCount} match{resultCount !== 1 ? 'es' : ''} found
        </span>
      )}

      <div
        className={activeTeam ? 'hidden sm:block' : 'hidden sm:block ml-auto'}
      >
        <GlobalDataManagement />
      </div>
    </div>
  );
}
