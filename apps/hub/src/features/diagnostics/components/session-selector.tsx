import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDate, truncate } from '../../../lib/utils';
import type { SessionState } from '../../../lib/types';

interface SessionSelectorProps {
  sessions: SessionState[];
  selected: string[];
  onToggle: (id: string) => void;
  max?: number;
}

export function SessionSelector({ sessions, selected, onToggle, max = 5 }: SessionSelectorProps) {
  const { t } = useTranslation();
  const atMax = selected.length >= max;

  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">
        {t('page.diagnostics.sessions.selectSessions')} ({selected.length}/{max})
      </p>
      <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
        {sessions.map((s) => {
          const isSelected = selected.includes(s.id);
          const disabled = atMax && !isSelected;
          const model = s.aiProvider?.modelId ?? 'unknown';
          const compliance = s.outcome?.complianceScore ?? 0;

          return (
            <button
              key={s.id}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(s.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
                isSelected
                  ? 'border border-primary/30 bg-primary/5'
                  : 'hover:bg-muted/50',
                disabled && 'cursor-not-allowed opacity-40',
              )}
            >
              <span className={cn(
                'inline-block h-2 w-2 shrink-0 rounded-full',
                isSelected ? 'bg-primary' : 'bg-border',
              )} />
              <span className="flex-1 text-xs font-medium text-foreground">
                {truncate(s.name || s.id, 30)}
              </span>
              <Badge variant="secondary" className="text-[10px]">{model}</Badge>
              <span className="text-[10px] text-muted-foreground">{compliance}%</span>
              <span className="text-[10px] text-muted-foreground">{formatDate(s.startedAt)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
