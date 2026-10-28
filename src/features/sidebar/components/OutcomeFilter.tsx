'use client';

import {
  type FilterItem,
  FilterPills,
} from '@/components/ui/patterns/filter-pills';
import type { OutcomeFilter as OutcomeType } from '@/types';

const OUTCOME_ITEMS: FilterItem<OutcomeType>[] = [
  { id: 'all', label: 'All' },
  { id: 'success', label: 'Success' },
  { id: 'fail', label: 'Fail' },
];

interface OutcomeFilterProps {
  outcomeFilter: OutcomeType;
  onChange: (outcome: OutcomeType) => void;
}

export function OutcomeFilter({ outcomeFilter, onChange }: OutcomeFilterProps) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wider text-[#71717A]">
        Outcome
      </div>
      <FilterPills
        items={OUTCOME_ITEMS}
        value={outcomeFilter}
        onChange={onChange}
      />
    </div>
  );
}
