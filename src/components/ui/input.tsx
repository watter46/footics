import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'focus-visible:ring-primary/60 flex h-10 w-full rounded-xl border border-slate-800 bg-[#0a0a0a] px-3 py-2 text-sm text-slate-100 shadow-[0_0_1px_hsl(var(--primary)/0.5)] transition-colors placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export { Input };
