import { cn } from '@/lib/utils';

export interface FilterItem<T extends string = string> {
  id: T;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  color?: string;
}

export interface FilterPillsProps<T extends string = string> {
  items: Array<FilterItem<T>>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function FilterPills<T extends string = string>({
  items,
  value,
  onChange,
  className,
}: FilterPillsProps<T>) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 overflow-x-auto no-scrollbar',
        className,
      )}
      role="group"
      aria-label="Filter options"
    >
      {items.map((item) => {
        const isSelected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(item.id)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all shrink-0 cursor-pointer select-none',
              isSelected
                ? 'bg-[#FF8100]/15 text-[#FFA336] border border-[#FF8100]/40 font-medium shadow-[0_0_8px_rgba(255,129,0,0.15)]'
                : 'bg-[#18181B] text-[#A1A1AA] border border-white/[0.08] hover:bg-white/[0.04] hover:text-white',
            )}
          >
            {item.icon && <span className="shrink-0">{item.icon}</span>}
            <span>{item.label}</span>
            {item.count !== undefined && (
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-mono',
                  isSelected
                    ? 'bg-[#FF8100]/25 text-[#FFA336]'
                    : 'bg-white/[0.06] text-[#A1A1AA]',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
