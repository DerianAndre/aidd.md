import { FileX } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EmptyStateProps {
  message?: string;
  icon?: React.ReactNode;
}

export function EmptyState({
  message,
  icon,
}: EmptyStateProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
      {icon ?? <FileX size={40} strokeWidth={1.5} />}
      <p className="text-sm">{message ?? t('common.emptyState')}</p>
    </div>
  );
}
