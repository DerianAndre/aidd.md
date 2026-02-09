import { ArrowDown, ArrowUp, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TokenUsage } from '@/lib/types';

interface TidMetricsProps {
  tokenUsage?: TokenUsage;
  compact?: boolean;
  className?: string;
}

function formatTokenCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function calculateTidRatio(tokenUsage?: TokenUsage): string {
  if (!tokenUsage || tokenUsage.inputTokens === 0) return '—';
  const ratio = tokenUsage.outputTokens / tokenUsage.inputTokens;
  return `${ratio.toFixed(1)}x`;
}

export function TidMetrics({ tokenUsage, compact = false, className }: TidMetricsProps) {
  if (!tokenUsage) {
    return (
      <span className={cn('font-mono text-[10px] text-muted-foreground', className)}>
        TID: —
      </span>
    );
  }

  const tidRatio = calculateTidRatio(tokenUsage);

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2 font-mono text-[10px]', className)}>
        <span className="text-foreground font-semibold">
          TID: {tidRatio}
        </span>
        <span className="text-cyan-500">
          {formatTokenCount(tokenUsage.inputTokens)}↓
        </span>
        <span className="text-teal-500">
          {formatTokenCount(tokenUsage.outputTokens)}↑
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {/* TID Ratio - Primary metric */}
      <div className="flex items-center gap-2 font-mono text-xs">
        <span className="text-muted-foreground">TID:</span>
        <span className="text-foreground font-semibold">{tidRatio}</span>
      </div>

      {/* Token breakdown - Secondary metrics */}
      <div className="flex items-center gap-3 font-mono text-[10px]">
        <div className="flex items-center gap-1">
          <ArrowDown size={10} className="text-cyan-500" />
          <span className="text-cyan-500">{formatTokenCount(tokenUsage.inputTokens)}</span>
        </div>
        <div className="flex items-center gap-1">
          <ArrowUp size={10} className="text-teal-500" />
          <span className="text-teal-500">{formatTokenCount(tokenUsage.outputTokens)}</span>
        </div>
        {tokenUsage.cacheReadTokens !== undefined && tokenUsage.cacheReadTokens > 0 && (
          <div className="flex items-center gap-1">
            <RotateCw size={10} className="text-muted-foreground" />
            <span className="text-muted-foreground">{formatTokenCount(tokenUsage.cacheReadTokens)}</span>
          </div>
        )}
        {tokenUsage.totalCost !== undefined && (
          <span className="text-yellow-500">${tokenUsage.totalCost.toFixed(3)}</span>
        )}
      </div>
    </div>
  );
}
