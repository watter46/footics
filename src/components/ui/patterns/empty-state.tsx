import * as React from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: React.ElementType | React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return icon;
    }
    if (
      typeof icon === 'function' ||
      (typeof icon === 'object' && icon !== null)
    ) {
      const IconComponent = icon as React.ElementType;
      return <IconComponent className="size-6" />;
    }
    return icon;
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-[10px] border border-dashed border-white/[0.08] bg-[#18181B]/50',
        className,
      )}
    >
      {icon && (
        <div className="p-3 rounded-full bg-white/[0.03] border border-white/[0.08] mb-4 text-[#71717A] flex items-center justify-center">
          {renderIcon()}
        </div>
      )}
      <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
      {description && (
        <div className="text-xs text-[#A1A1AA] max-w-sm mb-4">
          {description}
        </div>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
