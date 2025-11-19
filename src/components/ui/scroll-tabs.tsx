import * as React from 'react';

import { cn } from '@/lib/utils/cn';

export interface ScrollTabItem {
  key: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
}

export interface ScrollTabsProps
  extends React.HTMLAttributes<HTMLDivElement> {
  items: ScrollTabItem[];
  activeKey: string;
  onTabSelect?: (item: ScrollTabItem, index: number) => void;
  tabContainerRef?: React.RefObject<HTMLDivElement | null>;
  tabRefs?: React.MutableRefObject<Array<HTMLButtonElement | null>>;
  showIndicators?: boolean;
}

export const ScrollTabs = ({
  items,
  activeKey,
  onTabSelect,
  className,
  tabContainerRef,
  tabRefs,
  showIndicators = true,
  ...props
}: ScrollTabsProps) => (
  <>
    <div
      ref={tabContainerRef}
      className={cn(
        'text-muted-foreground flex shrink-0 gap-2 overflow-x-auto border-b border-slate-800 bg-slate-950 px-1.5 pt-0.5 pb-1.5 text-sm font-medium whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] sm:px-2 [&::-webkit-scrollbar]:hidden',
        className
      )}
      {...props}
    >
      {items.map((item, index) => {
        const isActive = item.key === activeKey;
        return (
          <button
            key={item.key}
            type="button"
            ref={element => {
              if (!tabRefs) return;
              tabRefs.current[index] = element;
            }}
            className={cn(
              'flex flex-none items-center gap-2 rounded-2xl border px-4 py-2 text-sm transition-colors',
              isActive
                ? 'border-transparent bg-linear-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_10px_30px_rgba(15,118,255,0.35)]'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white'
            )}
            onClick={() => onTabSelect?.(item, index)}
          >
            {item.icon ? (
              <item.icon
                className={cn('h-4 w-4', item.iconClassName)}
              />
            ) : null}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
    {showIndicators ? (
      <div className="flex items-center justify-center gap-1 bg-slate-950 px-4 py-2">
        {items.map(item => (
          <div
            key={`${item.key}-indicator`}
            className={cn(
              'h-1.5 w-6 rounded-full transition-all',
              item.key === activeKey ? 'bg-cyan-400' : 'bg-slate-700'
            )}
          />
        ))}
      </div>
    ) : null}
  </>
);
