import { FileX } from 'lucide-react';

interface EmptyStateProps {
  message?: string;
  icon?: React.ReactNode;
}

export function EmptyState({
  message = 'Nothing here yet.',
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
      {icon ?? <FileX size={40} strokeWidth={1.5} />}
      <p className="text-sm">{message}</p>
    </div>
  );
}
