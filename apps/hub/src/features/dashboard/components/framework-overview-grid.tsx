import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { Chip } from '@/components/ui/chip';
import {
  ShieldCheck,
  Zap,
  BookOpen,
  GitBranch,
  FileText,
  FileCode,
  Users,
  ArrowRight,
} from 'lucide-react';
import { useFrameworkStore, CATEGORIES } from '../../framework/stores/framework-store';
import { useProjectStore } from '../../../stores/project-store';
import { ROUTES } from '../../../lib/constants';
import type { FrameworkCategory } from '../../../lib/tauri';
import type { LucideIcon } from 'lucide-react';

const CATEGORY_META = {
  agents: { labelKey: 'page.dashboard.catAgents' as const, icon: Users, color: 'text-accent' },
  rules: { labelKey: 'page.dashboard.catRules' as const, icon: ShieldCheck, color: 'text-danger' },
  skills: { labelKey: 'page.dashboard.catSkills' as const, icon: Zap, color: 'text-warning' },
  knowledge: { labelKey: 'page.dashboard.catKnowledge' as const, icon: BookOpen, color: 'text-accent' },
  workflows: { labelKey: 'page.dashboard.catWorkflows' as const, icon: GitBranch, color: 'text-success' },
  templates: { labelKey: 'page.dashboard.catTemplates' as const, icon: FileText, color: 'text-primary' },
  specs: { labelKey: 'page.dashboard.catSpec' as const, icon: FileCode, color: 'text-muted-foreground' },
} satisfies Record<FrameworkCategory, { labelKey: string; icon: LucideIcon; color: string }>;

export function FrameworkOverviewGrid() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const activeProject = useProjectStore((s) => s.activeProject);
  const entities = useFrameworkStore((s) => s.entities);
  const stale = useFrameworkStore((s) => s.stale);
  const fetchCategory = useFrameworkStore((s) => s.fetchCategory);
  const syncInfo = useFrameworkStore((s) => s.syncInfo);
  const initialize = useFrameworkStore((s) => s.initialize);
  const frameworkPath = useFrameworkStore((s) => s.frameworkPath);

  const invalidateAll = useFrameworkStore((s) => s.invalidateAll);

  useEffect(() => {
    if (!frameworkPath) void initialize();
  }, [frameworkPath, initialize]);

  // Re-fetch all categories when active project changes
  useEffect(() => {
    if (activeProject?.path) {
      invalidateAll();
    }
  }, [activeProject?.path, invalidateAll]);

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
          <span className="text-sm font-semibold text-foreground">{t('page.dashboard.framework')}</span>
          {syncInfo?.current_version && (
            <Chip size="sm" color="default">
              v{syncInfo.current_version}
            </Chip>
          )}
        </div>
        <Link
          to={ROUTES.FRAMEWORK}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {t('common.manage')} <ArrowRight size={12} />
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
              className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-muted/50 p-3 transition-colors hover:border-primary hover:bg-accent/50"
            >
              <Icon size={20} className={meta.color} />
              <span className="text-xs font-medium text-foreground">{t(meta.labelKey)}</span>
              <span className="text-xl font-bold text-foreground">{count}</span>
              {count > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  {t('page.dashboard.sourceBreakdown', { global: globalCount, project: projectCount })}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
