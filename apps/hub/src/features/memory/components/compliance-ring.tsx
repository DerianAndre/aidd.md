import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { getLifecycleColor } from '../lib/lifecycle-progress';

interface ComplianceRingProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  lifecycleProgress?: number;
  isWip?: boolean;
  isStale?: boolean;
  tooltipContent?: ReactNode;
}

const sizeConfig = {
  sm: { width: 32, stroke: 2, fontSize: 'text-[10px]', iconSize: 10 },
  md: { width: 48, stroke: 3, fontSize: 'text-xs', iconSize: 14 },
  lg: { width: 64, stroke: 4, fontSize: 'text-sm', iconSize: 18 },
};

export function ComplianceRing({
  score,
  size = 'md',
  className,
  lifecycleProgress,
  isWip = false,
  isStale = false,
  tooltipContent,
}: ComplianceRingProps) {
  const config = sizeConfig[size];
  const radius = (config.width - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  // Arc fill uses lifecycle progress when available, falls back to score
  const arcValue = lifecycleProgress ?? score;
  const offset = circumference - (arcValue / 100) * circumference;
  const colorClass = getLifecycleColor(arcValue, isWip);

  const ring = (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: config.width, height: config.width }}
    >
      <svg
        width={config.width}
        height={config.width}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={config.width / 2}
          cy={config.width / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.stroke}
          className="text-border opacity-20"
        />
        {/* Progress circle */}
        <circle
          cx={config.width / 2}
          cy={config.width / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(colorClass, 'transition-all duration-300', isWip && 'animate-pulse')}
        />
      </svg>
      {/* Center content: staleness icon or score */}
      {isStale ? (
        <AlertTriangle
          size={config.iconSize}
          className="absolute text-amber-500"
          aria-label="Compliance data may be stale"
        />
      ) : (
        <span className={cn('absolute font-mono font-semibold', config.fontSize, colorClass)}>
          {score}
        </span>
      )}
    </div>
  );

  if (tooltipContent) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{ring}</TooltipTrigger>
        <TooltipContent sideOffset={6}>{tooltipContent}</TooltipContent>
      </Tooltip>
    );
  }

  return ring;
}
