import { type MutableRefObject, type RefObject } from 'react';
import { ScrollTabs } from '@/components/ui/scroll-tabs';
import type { SheetCategory } from '../types';

interface CategoryTabsProps {
  categories: SheetCategory[];
  activeTab: number;
  onTabClick: (index: number) => void;
  tabContainerRef: RefObject<HTMLDivElement | null>;
  tabRefs: MutableRefObject<Array<HTMLButtonElement | null>>;
}

export const CategoryTabs = ({
  categories,
  activeTab,
  onTabClick,
  tabContainerRef,
  tabRefs,
}: CategoryTabsProps) => {
  const activeKey =
    categories[activeTab]?.key ?? categories[0]?.key ?? 'default-tab';

  return (
    <ScrollTabs
      items={categories.map(category => ({
        key: category.key,
        label: category.label,
        icon: category.icon,
        iconClassName: category.markerClassName,
      }))}
      activeKey={activeKey}
      onTabSelect={(_, index) => onTabClick(index)}
      tabContainerRef={tabContainerRef}
      tabRefs={tabRefs}
    />
  );
};
