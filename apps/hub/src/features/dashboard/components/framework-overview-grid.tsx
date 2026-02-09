import { useEffect, useState } from 'react';
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
import { useProjectStore } from '../../../stores/project-store';
import { CONTENT_PATHS, ROUTES } from '../../../lib/constants';
import { getFrameworkPath, getSyncStatus, listDirectory } from '../../../lib/tauri';
import { normalizePath } from '../../../lib/utils';
import type { FrameworkCategory, SyncInfo } from '../../../lib/tauri';
import type { LucideIcon } from 'lucide-react';

const CATEGORIES: FrameworkCategory[] = [
  'agents',
  'rules',
  'skills',
  'knowledge',
  'workflows',
  'templates',
  'specs',
];

interface CategoryCount {
  total: number;
  global: number;
  project: number;
  loading: boolean;
}

function createEmptyCounts(): Record<FrameworkCategory, CategoryCount> {
  return {
    agents: { total: 0, global: 0, project: 0, loading: true },
    rules: { total: 0, global: 0, project: 0, loading: true },
    skills: { total: 0, global: 0, project: 0, loading: true },
    knowledge: { total: 0, global: 0, project: 0, loading: true },
    workflows: { total: 0, global: 0, project: 0, loading: true },
    templates: { total: 0, global: 0, project: 0, loading: true },
    specs: { total: 0, global: 0, project: 0, loading: true },
  };
}

async function countMarkdownFiles(path: string | null): Promise<number> {
  if (!path) return 0;
  try {
    const entries = await listDirectory(path, ['md'], true);
    return entries.filter((entry) => !entry.is_dir).length;
  } catch {
    return 0;
  }
}

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
  const [syncInfo, setSyncInfo] = useState<SyncInfo | null>(null);
  const [counts, setCounts] = useState<Record<FrameworkCategory, CategoryCount>>(createEmptyCounts);

  useEffect(() => {
    let canceled = false;
    const loadSync = async () => {
      try {
        const info = await getSyncStatus();
        if (!canceled) setSyncInfo(info);
      } catch {
        // ignore
      }
    };
    void loadSync();
    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeProject?.path) {
      setCounts(createEmptyCounts());
      return;
    }

    let canceled = false;
    const loadCounts = async () => {
      const projectRoot = normalizePath(activeProject.path);
      let frameworkRoot: string | null = null;
      try {
        frameworkRoot = await getFrameworkPath();
      } catch {
        frameworkRoot = null;
      }

      setCounts((prev) => {
        const next = { ...prev };
        for (const cat of CATEGORIES) {
          next[cat] = { ...next[cat], loading: true };
        }
        return next;
      });

      // Sequential category loading avoids I/O bursts when the dashboard mounts.
      for (const cat of CATEGORIES) {
        if (canceled) break;
        const [globalCount, projectCount] = await Promise.all([
          countMarkdownFiles(frameworkRoot ? `${frameworkRoot}/${cat}` : null),
          countMarkdownFiles(`${projectRoot}/${CONTENT_PATHS[cat]}`),
        ]);
        if (canceled) break;
        setCounts((prev) => ({
          ...prev,
          [cat]: {
            total: globalCount + projectCount,
            global: globalCount,
            project: projectCount,
            loading: false,
          },
        }));
      }
    };

    void loadCounts();
    return () => {
      canceled = true;
    };
  }, [activeProject?.path]);

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
          const info = counts[cat];
          const count = info.total;
          const globalCount = info.global;
          const projectCount = info.project;
          const loading = info.loading;

          return (
            <button
              key={cat}
              type="button"
              onClick={() => navigate(`/framework/${cat}`)}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-muted/50 p-3 transition-colors hover:border-primary hover:bg-accent/50"
            >
              <Icon size={20} className={meta.color} />
              <span className="text-xs font-medium text-foreground">{t(meta.labelKey)}</span>
              <span className="text-xl font-bold text-foreground">{loading ? '...' : count}</span>
              {!loading && count > 0 && (
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
