import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'default' | 'success' | 'warning' | 'danger';
}

const COLOR_MAP = {
  default: 'text-default-500',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
} as const;

export function StatCard({ label, value, icon: Icon, color = 'default' }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-default-200 bg-default-50 p-3">
      <div className={`rounded-lg bg-default-100 p-2 ${COLOR_MAP[color]}`}>
        <Icon size={18} strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-lg font-bold text-foreground">{value}</p>
        <p className="text-[10px] text-default-400">{label}</p>
      </div>
    </div>
  );
}
