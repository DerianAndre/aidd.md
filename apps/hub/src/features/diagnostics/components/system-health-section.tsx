import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { SystemCheckStatus } from '../lib/types';

interface SystemHealthSectionProps {
  title: string;
  status: SystemCheckStatus;
  children: React.ReactNode;
}

const STATUS_DOT: Record<SystemCheckStatus, string> = {
  healthy: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-danger',
};

export function SystemHealthSection({ title, status, children }: SystemHealthSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[status]}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
