import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Tabs, Chip, Spinner, Button, Switch, Label } from '@heroui/react';
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
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/page-header';
import { useFrameworkStore, CATEGORIES } from '../stores/framework-store';
import { useProjectStore } from '../../../stores/project-store';
import { KnowledgeTreeView } from '../components/knowledge-tree-view';
import type { FrameworkCategory } from '../../../lib/tauri';
import type { LucideIcon } from 'lucide-react';

const TAB_META: Record<FrameworkCategory, { label: string; icon: LucideIcon }> = {
  rules: { label: 'Rules', icon: ShieldCheck },
  skills: { label: 'Skills', icon: Zap },
  knowledge: { label: 'Knowledge', icon: BookOpen },
  workflows: { label: 'Workflows', icon: GitBranch },
  templates: { label: 'Templates', icon: FileText },
  spec: { label: 'Spec', icon: FileCode },
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
  const toggleAutoSync = useFrameworkStore((s) => s.toggleAutoSync);

  const invalidateAll = useFrameworkStore((s) => s.invalidateAll);

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
    // Navigate to existing detail/editor routes
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

  return (
    <div>
      <PageHeader
        title="Framework"
        description="Global AIDD framework content managed from ~/.aidd/framework/"
      />

      {/* ── Sync status bar ──────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-default-200 bg-default-50 px-4 py-3">
        {/* Version badge */}
        <Chip size="sm" variant="soft" color={syncInfo?.update_available ? 'warning' : 'success'}>
          {syncInfo?.current_version ? `v${syncInfo.current_version}` : 'No version'}
        </Chip>

        {/* Update available indicator */}
        {syncInfo?.update_available && syncInfo.latest_version && (
          <span className="text-xs text-warning">
            v{syncInfo.latest_version} available
          </span>
        )}

        {/* Check for updates */}
        <Button
          size="sm"
          variant="ghost"
          isDisabled={checking || syncing}
          onPress={() => void checkUpdates()}
        >
          {checking ? (
            <Spinner size="sm" />
          ) : (
            <RefreshCw size={14} />
          )}
          Check for updates
        </Button>

        {/* Update now */}
        {syncInfo?.update_available && (
          <Button
            size="sm"
            variant="primary"
            isDisabled={syncing}
            onPress={() => void doSync()}
          >
            {syncing ? (
              <Spinner size="sm" />
            ) : (
              <Download size={14} />
            )}
            {syncing ? 'Syncing…' : 'Update now'}
          </Button>
        )}

        {/* Up to date indicator */}
        {syncInfo && !syncInfo.update_available && syncInfo.current_version && (
          <span className="flex items-center gap-1 text-xs text-success">
            <Check size={12} />
            Up to date
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Auto-sync toggle */}
        <Switch
          size="sm"
          isSelected={syncInfo?.auto_sync ?? false}
          onChange={(val) => void toggleAutoSync(val)}
        >
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Label className="text-xs">Auto-sync</Label>
        </Switch>
      </div>

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
          const Icon = meta.icon;
          return (
            <Tabs.Panel key={cat} id={cat}>
              <div className="pt-4">
                {loading[cat] ? (
                  <div className="flex justify-center py-12">
                    <Spinner />
                  </div>
                ) : entities[cat].length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-default-400">
                    <Icon size={40} className="mb-3" />
                    <p className="text-sm">No {meta.label.toLowerCase()} found</p>
                    <p className="mt-1 text-xs">
                      Add .md files to the project&apos;s {cat}/ directory or sync the global framework
                    </p>
                  </div>
                ) : cat === 'knowledge' ? (
                  <KnowledgeTreeView
                    entities={entities[cat]}
                    onEntityClick={(name) => handleEntityClick(cat, name)}
                  />
                ) : (
                  <div className="grid gap-2">
                    {entities[cat].map((entity) => (
                      <button
                        key={`${entity.source}-${entity.name}`}
                        type="button"
                        className="flex items-center justify-between rounded-lg border border-default-200 bg-default-50 px-4 py-3 text-left transition-colors hover:bg-default-100"
                        onClick={() => handleEntityClick(cat, entity.name)}
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {entity.name}
                          </p>
                          {entity.content && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-default-400">
                              {entity.content.slice(0, 120)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Chip
                            size="sm"
                            variant="soft"
                            color={entity.source === 'project' ? 'accent' : 'default'}
                          >
                            {entity.source}
                          </Chip>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Tabs.Panel>
          );
        })}
      </Tabs>
    </div>
  );
}
