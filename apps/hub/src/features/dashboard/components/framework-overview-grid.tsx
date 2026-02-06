import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Chip } from '@heroui/react';
import {
  ShieldCheck,
  Zap,
  BookOpen,
  GitBranch,
  FileText,
  FileCode,
  ArrowRight,
} from 'lucide-react';
import { useFrameworkStore, CATEGORIES } from '../../framework/stores/framework-store';
import { useProjectStore } from '../../../stores/project-store';
import { ROUTES } from '../../../lib/constants';
import type { FrameworkCategory } from '../../../lib/tauri';
import type { LucideIcon } from 'lucide-react';

const CATEGORY_META: Record<FrameworkCategory, { label: string; icon: LucideIcon; color: string }> = {
  rules: { label: 'Rules', icon: ShieldCheck, color: 'text-danger' },
  skills: { label: 'Skills', icon: Zap, color: 'text-warning' },
  knowledge: { label: 'Knowledge', icon: BookOpen, color: 'text-accent' },
  workflows: { label: 'Workflows', icon: GitBranch, color: 'text-success' },
  templates: { label: 'Templates', icon: FileText, color: 'text-primary' },
  spec: { label: 'Spec', icon: FileCode, color: 'text-default-500' },
};

export function FrameworkOverviewGrid() {
  const navigate = useNavigate();
  const activeProject = useProjectStore((s) => s.activeProject);
  const entities = useFrameworkStore((s) => s.entities);
  const stale = useFrameworkStore((s) => s.stale);
  const fetchCategory = useFrameworkStore((s) => s.fetchCategory);
  const syncInfo = useFrameworkStore((s) => s.syncInfo);
  const initialize = useFrameworkStore((s) => s.initialize);
  const frameworkPath = useFrameworkStore((s) => s.frameworkPath);

  useEffect(() => {
    if (!frameworkPath) void initialize();
  }, [frameworkPath, initialize]);

  useEffect(() => {
    for (const cat of CATEGORIES) {
      if (stale[cat]) {
        void fetchCategory(cat, activeProject?.path);
      }
    }
  }, [stale, fetchCategory, activeProject?.path]);

  return (
    <div className="mb-6">
      {/* Section header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Framework</span>
          {syncInfo?.current_version && (
            <Chip size="sm" variant="soft" color="default">
              v{syncInfo.current_version}
            </Chip>
          )}
        </div>
        <Link
          to={ROUTES.FRAMEWORK}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Manage <ArrowRight size={12} />
        </Link>
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {CATEGORIES.map((cat) => {
          const meta = CATEGORY_META[cat];
          const Icon = meta.icon;
          const items = entities[cat];
          const count = items.length;
          const globalCount = items.filter((e) => e.source === 'global').length;
          const projectCount = items.filter((e) => e.source === 'project').length;

          return (
            <button
              key={cat}
              type="button"
              onClick={() => navigate(`/framework/${cat}`)}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-default-200 bg-default-50 p-3 transition-colors hover:border-primary-300 hover:bg-default-100/50"
            >
              <Icon size={20} className={meta.color} />
              <span className="text-xs font-medium text-foreground">{meta.label}</span>
              <span className="text-xl font-bold text-foreground">{count}</span>
              {count > 0 && (
                <span className="text-[10px] text-default-400">
                  {globalCount}g + {projectCount}p
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
