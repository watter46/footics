import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-all select-none [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    variants: {
      variant: {
        default:
          'bg-[#18181B] text-[#F4F4F5] border-white/[0.07] hover:bg-[#222226]',
        secondary: 'bg-[#222226] text-[#A1A1AA] border-white/[0.07]',
        primary:
          'bg-[#FF8100]/15 text-[#FF8A00] border-[#FF8100]/40 shadow-[0_0_10px_rgba(255,129,0,0.25)]',
        fw: 'badge-pos-fw',
        mid: 'badge-pos-mid',
        df: 'badge-pos-df',
        gk: 'badge-pos-gk',
        destructive: 'bg-[#EB3B5A]/14 text-[#FF4757] border-[#EB3B5A]/40',
        danger: 'bg-[#EB3B5A]/14 text-[#FF4757] border-[#EB3B5A]/40',
        outline: 'border-white/[0.07] text-[#A1A1AA]',
        ghost: 'border-transparent text-[#A1A1AA] hover:bg-white/[0.05]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({
  className,
  variant = 'default',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: 'badge',
      variant,
    },
  });
}

export { Badge, badgeVariants };
