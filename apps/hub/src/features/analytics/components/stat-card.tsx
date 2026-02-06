import { Card, CardHeader } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
}

export function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <Card className="border border-border bg-muted/50">
      <CardHeader className="flex-row items-center gap-3">
        <div className={`rounded-lg p-2 ${color ?? 'bg-primary/10 text-primary'}`}>
          <Icon size={18} />
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase text-muted-foreground">{label}</p>
          <p className="text-lg font-bold text-foreground">{value}</p>
        </div>
      </CardHeader>
    </Card>
  );
}
