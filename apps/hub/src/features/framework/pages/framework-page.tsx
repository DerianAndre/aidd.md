import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Tabs, Chip, Spinner, Button } from '@heroui/react';
import {
  ShieldCheck,
  Zap,
  BookOpen,
  GitBranch,
  FileText,
  FileCode,
  RefreshCw,
  Download,
  Check,
  ChevronDown,
  Package,
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/page-header';
import { EntityList, EntityCard } from '../../../components/entity';
import { useFrameworkStore, CATEGORIES } from '../stores/framework-store';
import { useProjectStore } from '../../../stores/project-store';
import { KnowledgeTreeView } from '../components/knowledge-tree-view';
import type { FrameworkCategory } from '../../../lib/tauri';
import type { LucideIcon } from 'lucide-react';

const TAB_META: Record<FrameworkCategory, { label: string; icon: LucideIcon; description: string }> = {
  rules: { label: 'Rules', icon: ShieldCheck, description: 'Immutable framework constraints' },
  skills: { label: 'Skills', icon: Zap, description: 'Specialized agent capabilities' },
  knowledge: { label: 'Knowledge', icon: BookOpen, description: 'Technology Knowledge Base entries' },
  workflows: { label: 'Workflows', icon: GitBranch, description: 'Multi-step procedure guides' },
  templates: { label: 'Templates', icon: FileText, description: 'Task routing and decision templates' },
  spec: { label: 'Spec', icon: FileCode, description: 'AIDD standard specifications' },
};

export function FrameworkPage() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const tab = (CATEGORIES.includes(category as FrameworkCategory) ? category : 'rules') as FrameworkCategory;

  const activeProject = useProjectStore((s) => s.activeProject);
  const entities = useFrameworkStore((s) => s.entities);
  const loading = useFrameworkStore((s) => s.loading);
  const stale = useFrameworkStore((s) => s.stale);
  const fetchCategory = useFrameworkStore((s) => s.fetchCategory);
  const initialize = useFrameworkStore((s) => s.initialize);
  const frameworkPath = useFrameworkStore((s) => s.frameworkPath);

  // Sync state
  const syncInfo = useFrameworkStore((s) => s.syncInfo);
  const syncing = useFrameworkStore((s) => s.syncing);
  const checking = useFrameworkStore((s) => s.checking);
  const checkUpdates = useFrameworkStore((s) => s.checkUpdates);
  const doSync = useFrameworkStore((s) => s.doSync);

  const invalidateAll = useFrameworkStore((s) => s.invalidateAll);
  const [syncExpanded, setSyncExpanded] = useState(false);

  // Initialize framework path on mount
  useEffect(() => {
    if (!frameworkPath) {
      void initialize();
    }
  }, [frameworkPath, initialize]);

  // Re-fetch when project changes
  useEffect(() => {
    invalidateAll();
  }, [activeProject?.path, invalidateAll]);

  // Fetch current tab's data (global framework + active project)
  useEffect(() => {
    if (stale[tab]) {
      void fetchCategory(tab, activeProject?.path);
    }
  }, [tab, stale, fetchCategory, activeProject?.path]);

  const handleTabChange = (key: string | number) => {
    navigate(`/framework/${String(key)}`);
  };

  const handleEntityClick = (cat: FrameworkCategory, name: string) => {
    switch (cat) {
      case 'rules':
        navigate(`/rules/${name}`);
        break;
      case 'skills':
        navigate(`/skills/${name}`);
        break;
      case 'workflows':
        navigate(`/workflows/${name}`);
        break;
      case 'templates':
        navigate(`/templates/${name}`);
        break;
      case 'knowledge':
        navigate(`/knowledge/edit/${name}`);
        break;
      default:
        break;
    }
  };

  const totalEntities = CATEGORIES.reduce((sum, cat) => sum + entities[cat].length, 0);
  const globalCount = CATEGORIES.reduce(
    (sum, cat) => sum + entities[cat].filter((e) => e.source === 'global').length,
    0,
  );
  const projectCount = CATEGORIES.reduce(
    (sum, cat) => sum + entities[cat].filter((e) => e.source === 'project').length,
    0,
  );

  return (
    <div>
      <PageHeader
        title="Framework"
        description={activeProject ? `Global + ${activeProject.name} project content` : 'Global AIDD framework content'}
        actions={
          <div className="flex items-center gap-2">
            {/* Compact version badge */}
            <Chip size="sm" variant="soft" color={syncInfo?.update_available ? 'warning' : 'success'}>
              {syncInfo?.current_version ? `v${syncInfo.current_version}` : 'No version'}
            </Chip>
            {syncInfo?.update_available && (
              <Button
                size="sm"
                variant="primary"
                isDisabled={syncing}
                onPress={() => void doSync()}
              >
                {syncing ? <Spinner size="sm" /> : <Download size={14} />}
                {syncing ? 'Syncing...' : 'Update'}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              isDisabled={checking || syncing}
              onPress={() => void checkUpdates()}
            >
              {checking ? <Spinner size="sm" /> : <RefreshCw size={14} />}
            </Button>
            <button
              type="button"
              className="text-default-400 hover:text-foreground transition-colors"
              onClick={() => setSyncExpanded((v) => !v)}
              title="Sync details"
            >
              <ChevronDown size={14} className={`transition-transform ${syncExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        }
      />

      {/* Expandable sync details */}
      {syncExpanded && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-default-200 bg-default-50 px-4 py-3 text-xs text-default-500">
          {syncInfo?.update_available && syncInfo.latest_version && (
            <span className="text-warning">v{syncInfo.latest_version} available</span>
          )}
          {syncInfo && !syncInfo.update_available && syncInfo.current_version && (
            <span className="flex items-center gap-1 text-success">
              <Check size={12} /> Up to date
            </span>
          )}
          {syncInfo?.last_check && (
            <span>Last checked: {syncInfo.last_check}</span>
          )}
          <span>Auto-sync: {syncInfo?.auto_sync ? 'On' : 'Off'}</span>
        </div>
      )}

      {/* Stat cards */}
      <div className="mb-6 grid gap-3 grid-cols-2 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-xl border border-default-200 bg-default-50 p-3">
          <div className="rounded-lg bg-default-100 p-2 text-default-500">
            <Package size={18} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{totalEntities}</p>
            <p className="text-[10px] text-default-400">Total Entities</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-default-200 bg-default-50 p-3">
          <div className="rounded-lg bg-default-100 p-2 text-default-500">
            <ShieldCheck size={18} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{globalCount}</p>
            <p className="text-[10px] text-default-400">Global</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-default-200 bg-default-50 p-3">
          <div className="rounded-lg bg-default-100 p-2 text-success">
            <FileCode size={18} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{projectCount}</p>
            <p className="text-[10px] text-default-400">Project</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-default-200 bg-default-50 p-3">
          <div className="rounded-lg bg-default-100 p-2 text-default-500">
            <BookOpen size={18} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{CATEGORIES.filter((c) => entities[c].length > 0).length}</p>
            <p className="text-[10px] text-default-400">Categories</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        selectedKey={tab}
        onSelectionChange={handleTabChange}
        aria-label="Framework categories"
      >
        <Tabs.ListContainer>
          <Tabs.List>
            {CATEGORIES.map((cat) => {
              const meta = TAB_META[cat];
              const Icon = meta.icon;
              const count = entities[cat].length;
              return (
                <Tabs.Tab key={cat} id={cat}>
                  <span className="flex items-center gap-1.5">
                    <Icon size={14} />
                    {meta.label}
                    {count > 0 && (
                      <Chip size="sm" variant="soft">{count}</Chip>
                    )}
                  </span>
                  <Tabs.Indicator />
                </Tabs.Tab>
              );
            })}
          </Tabs.List>
        </Tabs.ListContainer>

        {CATEGORIES.map((cat) => {
          const meta = TAB_META[cat];
          return (
            <Tabs.Panel key={cat} id={cat}>
              <div className="pt-4">
                {cat === 'knowledge' ? (
                  loading[cat] ? (
                    <div className="flex justify-center py-12">
                      <Spinner />
                    </div>
                  ) : entities[cat].length === 0 ? (
                    <div className="flex flex-col items-center py-12 text-default-400">
                      <BookOpen size={40} className="mb-3" />
                      <p className="text-sm">No knowledge entries found</p>
                      <p className="mt-1 text-xs">
                        Add .md files to the project&apos;s knowledge/ directory or sync the global framework
                      </p>
                    </div>
                  ) : (
                    <KnowledgeTreeView
                      entities={entities[cat]}
                      onEntityClick={(name) => handleEntityClick(cat, name)}
                    />
                  )
                ) : (
                  <EntityList
                    items={entities[cat]}
                    loading={loading[cat]}
                    getKey={(e) => `${e.source}-${e.name}`}
                    getSearchText={(e) => `${e.name} ${e.content ?? ''} ${e.source}`}
                    searchPlaceholder={`Search ${meta.label.toLowerCase()}...`}
                    emptyMessage={`No ${meta.label.toLowerCase()} found. Add .md files to the project's ${cat}/ directory or sync the global framework.`}
                    columns={2}
                    renderItem={(entity) => (
                      <EntityCard
                        title={entity.name}
                        description={entity.content ?? undefined}
                        chips={[
                          {
                            label: entity.source,
                            color: entity.source === 'project' ? 'accent' : 'default',
                          },
                        ]}
                        onPress={() => handleEntityClick(cat, entity.name)}
                      />
                    )}
                  />
                )}
              </div>
            </Tabs.Panel>
          );
        })}
      </Tabs>
    </div>
  );
}
