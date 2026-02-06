import { Card } from '@heroui/react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
}

export function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <Card className="border border-default-200 bg-default-50">
      <Card.Header className="flex-row items-center gap-3">
        <div className={`rounded-lg p-2 ${color ?? 'bg-primary-100 text-primary-600'}`}>
          <Icon size={18} />
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase text-default-400">{label}</p>
          <p className="text-lg font-bold text-foreground">{value}</p>
        </div>
      </Card.Header>
    </Card>
  );
}
