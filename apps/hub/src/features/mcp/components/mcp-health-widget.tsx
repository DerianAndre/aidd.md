import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Server, ArrowRight } from 'lucide-react';
import { useMcpHealthStore } from '../stores/mcp-health-store';
import { useProjectStore } from '../../../stores/project-store';
import { ROUTES } from '../../../lib/constants';

export function McpHealthWidget() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const { report, stale, fetch: fetchHealth } = useMcpHealthStore();

  useEffect(() => {
    if (stale) void fetchHealth(activeProject?.path);
  }, [stale, activeProject?.path, fetchHealth]);

  const total = report?.summary.total_discovered ?? 0;
  const running = report?.summary.hub_running ?? 0;
  const errors = report?.summary.hub_error ?? 0;

  const statusColor = errors > 0
    ? 'bg-danger'
    : running > 0
      ? 'bg-success'
      : 'bg-muted-foreground';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
        <div className="flex items-center gap-1.5">
          <Server size={14} className="text-muted-foreground" />
          <span className="text-sm text-foreground">
            <span className="font-semibold">{total}</span> configured
          </span>
          {running > 0 && (
            <span className="text-sm text-success">
              &middot; <span className="font-semibold">{running}</span> running
            </span>
          )}
          {errors > 0 && (
            <span className="text-sm text-danger">
              &middot; <span className="font-semibold">{errors}</span> error{errors > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <Link
        to={ROUTES.MCP}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        View MCP Overview <ArrowRight size={12} />
      </Link>
    </div>
  );
}
