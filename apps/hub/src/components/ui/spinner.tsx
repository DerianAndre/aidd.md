import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const sizeMap = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-8',
} as const;

export function Spinner({
  size = 'md',
  className,
}: {
  size?: keyof typeof sizeMap;
  className?: string;
}) {
  return (
    <Loader2
      className={cn('animate-spin text-muted-foreground', sizeMap[size], className)}
    />
  );
}
