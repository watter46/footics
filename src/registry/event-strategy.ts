import type { EventRow } from '@/types';

export interface StrategyParameter {
  id: string;
  type: 'player' | 'length' | 'zone';
  label: string;
  required?: boolean;
}

export interface EventStrategy {
  id: string;
  label: string;
  description: string;
  color: string;
  params?: StrategyParameter[];
  predicate: (event: EventRow, params: Record<string, any>) => boolean;
}
