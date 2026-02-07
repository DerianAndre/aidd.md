import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'default' | 'success' | 'warning' | 'danger';
}

const COLOR_MAP = {
  default: 'text-muted-foreground',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
} as const;

export function StatCard({ label, value, icon: Icon, color = 'default' }: StatCardProps) {
  return (
    <Card className="flex-row items-center gap-3 py-3 px-3">
      <div className={`rounded-lg bg-muted p-2 ${COLOR_MAP[color]}`}>
        <Icon size={18} strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-lg font-bold text-foreground">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}
