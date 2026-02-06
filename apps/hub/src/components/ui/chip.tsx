import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const chipVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
  {
    variants: {
      color: {
        default: 'border-border bg-secondary text-secondary-foreground',
        primary: 'border-primary/30 bg-primary/10 text-primary dark:bg-primary/20',
        accent: 'border-primary/30 bg-primary/10 text-primary dark:bg-primary/20',
        success: 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400',
        warning: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
        danger: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400',
        info: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400',
      },
      size: {
        sm: 'px-2 py-0 text-[11px]',
        md: 'px-2.5 py-0.5 text-xs',
      },
    },
    defaultVariants: {
      color: 'default',
      size: 'md',
    },
  },
);

export interface ChipProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'>,
    VariantProps<typeof chipVariants> {}

export function Chip({ className, color, size, ...props }: ChipProps) {
  return (
    <span
      className={cn(
        chipVariants({ color, size }),
        props.onClick && 'cursor-pointer hover:opacity-80',
        className,
      )}
      {...props}
    />
  );
}
