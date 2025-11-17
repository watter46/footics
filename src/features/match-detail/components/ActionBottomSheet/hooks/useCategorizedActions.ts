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

    const filtered = ordered.filter(category => category.key !== 'イベント');

    return [FAVORITE_CATEGORY, ...filtered];
  }, []);

  return useMemo(() => {
    const categorizedMap = new Map<string, ActionMaster[]>();
    categorizedMap.set(FAVORITE_CATEGORY_KEY, []);
    CATEGORY_ORDER.forEach(categoryKey => {
      if (!categorizedMap.has(categoryKey)) {
        categorizedMap.set(categoryKey, []);
      }
    });
    categories.forEach(category => {
      if (!categorizedMap.has(category.key)) {
        categorizedMap.set(category.key, []);
      }
    });

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

    categorizedMap.delete('イベント');

    categorizedMap.forEach(actionsInCategory => {
      actionsInCategory.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    });

    return { categories, categorizedMap, actions: safeActions };
  }, [actions, categories]);
};
