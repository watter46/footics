import type { SheetCategory } from './types';
import { FAVORITE_CATEGORY_META } from '../HistoryTab/constants';

export const FAVORITE_CATEGORY_KEY = '__favorites__';

export const FAVORITE_CATEGORY: SheetCategory = {
  key: FAVORITE_CATEGORY_KEY,
  label: FAVORITE_CATEGORY_META.label,
  markerClassName: FAVORITE_CATEGORY_META.markerClassName,
  icon: FAVORITE_CATEGORY_META.icon,
};

export const SWIPE_THRESHOLD_PX = 100;
export const SWIPE_VELOCITY_PX = 500;
