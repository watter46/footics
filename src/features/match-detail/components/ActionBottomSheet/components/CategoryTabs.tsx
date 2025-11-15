import { type MutableRefObject, type RefObject } from 'react';
import { cn } from '@/lib/utils/cn';
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
  return (
    <>
      <div
        ref={tabContainerRef}
        className="flex shrink-0 gap-2 overflow-x-auto border-b border-slate-800/70 px-2 pt-0.5 pb-1 whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {categories.map((category, index) => (
          <button
            key={category.key}
            type="button"
            onClick={() => onTabClick(index)}
            className={cn(
              'flex flex-none items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors',
              activeTab === index
                ? 'bg-slate-800/70 text-sky-200 ring-1 ring-sky-400'
                : 'text-slate-500 hover:text-slate-300'
            )}
            ref={element => {
              tabRefs.current[index] = element;
            }}
          >
            <category.icon className={cn('h-4 w-4', category.markerClassName)} />
            <span>{category.label}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-center gap-1 px-4 py-2">
        {categories.map((category, index) => (
          <div
            key={`${category.key}-indicator`}
            className={cn(
              'h-1.5 w-1.5 rounded-full transition-colors',
              activeTab === index ? 'bg-sky-400' : 'bg-slate-700'
            )}
          />
        ))}
      </div>
    </>
  );
};
