import { Link } from 'react-router-dom';
import { Chip } from '@heroui/react';
import { FolderKanban, ArrowRight } from 'lucide-react';
import { useProjectStore } from '../../../stores/project-store';
import { ROUTES } from '../../../lib/constants';

const MARKERS: { key: keyof NonNullable<ReturnType<typeof useProjectStore.getState>['activeProject']>['markers']; label: string }[] = [
  { key: 'agents_md', label: 'AGENTS' },
  { key: 'rules', label: 'Rules' },
  { key: 'skills', label: 'Skills' },
  { key: 'workflows', label: 'Workflows' },
  { key: 'knowledge', label: 'Knowledge' },
  { key: 'templates', label: 'Templates' },
  { key: 'spec', label: 'Spec' },
  { key: 'aidd_dir', label: '.aidd' },
  { key: 'memory', label: 'Memory' },
];

export function ProjectContextBanner() {
  const activeProject = useProjectStore((s) => s.activeProject);

  if (!activeProject) {
    return (
      <div className="mb-4 flex items-center justify-between rounded-xl border border-default-200 bg-default-50 p-4">
        <div className="flex items-center gap-3 text-default-400">
          <FolderKanban size={20} />
          <span className="text-sm">No project selected</span>
        </div>
        <Link
          to={ROUTES.PROJECTS}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Select project <ArrowRight size={12} />
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-default-200 bg-default-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <div className="rounded-lg bg-default-100 p-2 text-primary">
          <FolderKanban size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-foreground">{activeProject.name}</p>
          <p className="truncate text-xs font-mono text-default-400">{activeProject.path}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {MARKERS.map((m) => (
          <Chip
            key={m.key}
            size="sm"
            variant="soft"
            color={activeProject.markers[m.key] ? 'success' : 'default'}
            className={activeProject.markers[m.key] ? '' : 'opacity-40'}
          >
            {m.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}
