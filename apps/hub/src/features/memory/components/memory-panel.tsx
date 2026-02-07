import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardAction, CardContent } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { useMemoryStore } from '../stores/memory-store';
import { ROUTES } from '@/lib/constants';

function StatSkeleton() {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-secondary/30 p-3">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-6 w-10" />
    </div>
  );
}

export function MemoryPanel() {
  const { t } = useTranslation();
  const sessionSummary = useMemoryStore((s) => s.sessionSummary);
  const evolutionStatus = useMemoryStore((s) => s.evolutionStatus);
  const patternStats = useMemoryStore((s) => s.patternStats);
  const loading = useMemoryStore((s) => s.loading);
  const error = useMemoryStore((s) => s.error);
  const stale = useMemoryStore((s) => s.stale);
  const fetch = useMemoryStore((s) => s.fetch);
  const clearError = useMemoryStore((s) => s.clearError);

  useEffect(() => {
    if (stale) {
      void fetch();
    }
  }, [stale, fetch]);

  const sessionTotal = sessionSummary?.total ?? 0;
  const sessionActive = sessionSummary?.active ?? 0;
  const evolutionPending = evolutionStatus?.pending_count ?? 0;
  const patternActive = patternStats?.active_patterns ?? 0;

  return (
    <Card className="mb-4 border-primary/20 py-4 gap-3">
      {/* Header */}
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
            <Brain size={18} />
          </div>
          <span className="text-sm font-semibold text-foreground">{t('page.dashboard.permanentMemory')}</span>
          {!loading && !error && sessionTotal > 0 && (
            <Chip size="sm" color={sessionActive > 0 ? 'success' : 'warning'}>
              {sessionTotal}
            </Chip>
          )}
          {!loading && !error && evolutionPending > 0 && (
            <Chip size="sm" color="warning">
              {evolutionPending}
            </Chip>
          )}
        </div>
        <CardAction>
          <Link
            to={ROUTES.MEMORY}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {t('common.view')} <ArrowRight size={12} />
          </Link>
        </CardAction>
      </CardHeader>

      <CardContent>
        {/* Error State */}
        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <AlertCircle size={16} className="shrink-0 text-destructive" />
            <div className="flex-1">
              <p className="text-xs text-destructive">{error}</p>
            </div>
            <button
              onClick={() => {
                clearError();
                void fetch(true);
              }}
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && !error && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </div>
        )}

        {/* Stats Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Sessions */}
            <div className="flex flex-col gap-1 rounded-lg bg-secondary/30 p-3">
              <span className="text-xs text-muted-foreground">{t('page.memory.decisions')}</span>
              <span className="text-lg font-semibold">{sessionTotal}</span>
              {sessionActive > 0 && (
                <span className="text-xs text-success">{sessionActive} active</span>
              )}
            </div>

            {/* Observations */}
            <div className="flex flex-col gap-1 rounded-lg bg-secondary/30 p-3">
              <span className="text-xs text-muted-foreground">
                {t('page.memory.conventions')}
              </span>
              <span className="text-lg font-semibold">{sessionSummary?.recent_sessions.length ?? 0}</span>
            </div>

            {/* Evolution */}
            <div className="flex flex-col gap-1 rounded-lg bg-secondary/30 p-3">
              <span className="text-xs text-muted-foreground">Evolution</span>
              <span className="text-lg font-semibold">{evolutionPending}</span>
              <span className="text-xs text-muted-foreground">pending</span>
            </div>

            {/* Patterns */}
            <div className="flex flex-col gap-1 rounded-lg bg-secondary/30 p-3">
              <span className="text-xs text-muted-foreground">Patterns</span>
              <span className="text-lg font-semibold">{patternActive}</span>
              <span className="text-xs text-muted-foreground">active</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
