import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { FolderKanban, ArrowRight, RefreshCw } from 'lucide-react';
import { useProjectStore } from '../../../stores/project-store';
import { ROUTES, MARKER_KEYS } from '../../../lib/constants';

export function ProjectContextBanner() {
  const { t } = useTranslation();
  const activeProject = useProjectStore((s) => s.activeProject);
  const refreshProject = useProjectStore((s) => s.refreshProject);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!activeProject) return;
    setRefreshing(true);
    try {
      await refreshProject(activeProject.path);
    } finally {
      setRefreshing(false);
    }
  };

  if (!activeProject) {
    return (
      <div className="mb-4 flex items-center justify-between rounded-xl border border-border bg-muted/50 p-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <FolderKanban size={20} />
          <span className="text-sm">{t('page.dashboard.noProjectSelected')}</span>
        </div>
        <Link
          to={ROUTES.PROJECTS}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {t('page.dashboard.selectProject')} <ArrowRight size={12} />
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <div className="rounded-lg bg-muted p-2 text-primary">
          <FolderKanban size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-foreground">{activeProject.name}</p>
          <p className="truncate text-xs font-mono text-muted-foreground">{activeProject.path}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {MARKER_KEYS.map((m) => {
            const active = activeProject.markers[m.key as keyof typeof activeProject.markers];
            return (
              <Chip
                key={m.key}
                size="sm"
                color={active ? 'success' : 'default'}
                className={active ? '' : 'opacity-40'}
              >
                {m.label}
              </Chip>
            );
          })}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label={t('common.refresh')}
          className="shrink-0"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
        </Button>
      </div>
    </div>
  );
}
