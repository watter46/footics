import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ActionMaster } from '@/lib/db';
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  DEFAULT_CATEGORY_META,
} from '../../HistoryTab/constants';
import { FAVORITE_CATEGORY, FAVORITE_CATEGORY_KEY } from '../constants';
import type { SheetCategory } from '../types';

interface UseCategorizedActionsResult {
  categories: SheetCategory[];
  categorizedMap: Map<string, ActionMaster[]>;
  actions: ActionMaster[];
}

export const useCategorizedActions = (): UseCategorizedActionsResult => {
  const actions = useLiveQuery(() => db.actions_master.toArray(), []);

  const categories = useMemo<SheetCategory[]>(() => {
    const ordered = CATEGORY_ORDER.map<SheetCategory>(key => {
      const meta = CATEGORY_META[key] ?? DEFAULT_CATEGORY_META;
      return {
        key,
        label: meta.label,
        markerClassName: meta.markerClassName,
        icon: meta.icon,
      };
    });

    return [FAVORITE_CATEGORY, ...ordered];
  }, []);

  return useMemo(() => {
    const categorizedMap = new Map<string, ActionMaster[]>();
    categories.forEach(category => categorizedMap.set(category.key, []));

    const safeActions: ActionMaster[] = actions ?? [];
    const fallbackKey = CATEGORY_ORDER.includes('印象')
      ? '印象'
      : CATEGORY_ORDER[CATEGORY_ORDER.length - 1];

    safeActions.forEach(action => {
      if (action.isFavorite) {
        categorizedMap.get(FAVORITE_CATEGORY_KEY)?.push(action);
      }

      const categoryKey =
        action.category && CATEGORY_ORDER.includes(action.category)
          ? action.category
          : fallbackKey;

      categorizedMap.get(categoryKey)?.push(action);
    });

    categorizedMap.forEach(actionsInCategory => {
      actionsInCategory.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    });

    return { categories, categorizedMap, actions: safeActions };
  }, [actions, categories]);
};
