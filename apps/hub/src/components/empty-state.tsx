import { FileX } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EmptyStateProps {
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({
  message,
  icon,
  action,
}: EmptyStateProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
      {icon ?? <FileX size={40} strokeWidth={1.5} />}
      <p className="text-sm">{message ?? t('common.emptyState')}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
