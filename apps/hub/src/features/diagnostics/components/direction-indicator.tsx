import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { TrendDirection } from '../lib/types';

interface DirectionIndicatorProps {
  direction: TrendDirection;
  delta?: number;
  label?: string;
}

const CONFIG: Record<TrendDirection, { icon: typeof TrendingUp; color: string; text: string }> = {
  improving: { icon: TrendingUp, color: 'text-success', text: 'Improving' },
  stable: { icon: Minus, color: 'text-muted-foreground', text: 'Stable' },
  degrading: { icon: TrendingDown, color: 'text-danger', text: 'Degrading' },
};

export function DirectionIndicator({ direction, delta, label }: DirectionIndicatorProps) {
  const { icon: Icon, color, text } = CONFIG[direction];
  const sign = delta != null && delta > 0 ? '+' : '';

  return (
    <div className="flex items-center gap-1.5">
      {label && <span className="w-24 shrink-0 text-[10px] font-medium uppercase text-muted-foreground">{label}</span>}
      <Icon size={14} className={color} />
      <span className={`text-xs font-medium ${color}`}>{text}</span>
      {delta != null && (
        <span className={`text-[10px] ${color}`}>({sign}{Math.round(delta)})</span>
      )}
    </div>
  );
}
