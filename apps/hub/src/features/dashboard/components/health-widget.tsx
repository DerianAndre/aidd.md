import { useEffect } from 'react';
import { Skeleton } from '@heroui/react';
import { useDiagnosticsStore } from '../../diagnostics/stores/diagnostics-store';
import { useProjectStore } from '../../../stores/project-store';
import { scoreColor } from '../../../lib/utils';

const COLOR_MAP = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
} as const;

export function HealthWidget() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const { healthScore, loading, stale, fetch } = useDiagnosticsStore();

  useEffect(() => {
    if (activeProject?.path && stale) {
      void fetch(activeProject.path);
    }
  }, [activeProject?.path, stale, fetch]);

  if (loading) {
    return <Skeleton className="h-16 rounded-lg" />;
  }

  if (!healthScore || healthScore.sessionsAnalyzed === 0) {
    return <p className="text-xs text-default-400">No health data yet.</p>;
  }

  const color = COLOR_MAP[scoreColor(healthScore.overall)];

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-bold ${color}`}>{healthScore.overall}</span>
        <span className="text-xs text-default-400">/ 100</span>
      </div>
      {healthScore.recommendations.slice(0, 2).map((rec, i) => (
        <p key={i} className="mt-1 text-[10px] text-default-500">&bull; {rec}</p>
      ))}
    </div>
  );
}
