import { useNavigate } from 'react-router-dom';
import type { McpPackageInfo } from '../../mcp/lib/mcp-catalog';
import type { McpPackageStatus } from '../../mcp/stores/mcp-servers-store';
import type { McpServer } from '../../../lib/tauri';
import { ROUTES } from '../../../lib/constants';

const ROLE_COLORS: Record<string, string> = {
  'The Brain': 'text-accent',
  'The Memory': 'text-success',
  'The Hands': 'text-warning',
  'Engine': 'text-default-500',
  'Foundation': 'text-default-500',
};

const SHORT_ROLES: Record<string, string> = {
  'The Brain': 'Brain',
  'The Memory': 'Memory',
  'The Hands': 'Tools',
  'Engine': 'All-in-1',
  'Foundation': 'Shared',
};

interface McpPackageMiniCardProps {
  info: McpPackageInfo;
  status?: McpPackageStatus;
  server?: McpServer;
}

export function McpPackageMiniCard({ info, status, server }: McpPackageMiniCardProps) {
  const navigate = useNavigate();
  const isRunning = server?.status === 'running';
  const isBuilt = status?.built ?? false;
  const toolCount = info.tools.length;

  return (
    <button
      type="button"
      onClick={() => navigate(ROUTES.MCP)}
      className="flex items-center gap-2.5 rounded-lg border border-default-200 bg-default-50/50 px-3 py-2 text-left transition-colors hover:border-primary-300 hover:bg-default-100/50"
    >
      {/* Status dot */}
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span
          className={`absolute inline-flex h-full w-full rounded-full ${
            isRunning ? 'animate-ping bg-success opacity-75' : ''
          }`}
        />
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
            isRunning ? 'bg-success' : isBuilt ? 'bg-success' : 'bg-danger'
          }`}
        />
      </span>

      <div className="min-w-0">
        <p className={`text-xs font-semibold ${ROLE_COLORS[info.role] ?? 'text-default-500'}`}>
          {SHORT_ROLES[info.role] ?? info.role}
        </p>
        <p className="text-[10px] text-default-400">
          {toolCount > 0 ? `${toolCount} tools` : info.role === 'Foundation' ? 'types' : 'aggregate'}
        </p>
      </div>
    </button>
  );
}
