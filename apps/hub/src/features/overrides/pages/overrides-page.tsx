import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Chip } from '@/components/ui/chip';
import { Spinner } from '@/components/ui/spinner';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Layers, ShieldCheck, Eye, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/page-header';
import { EmptyState } from '../../../components/empty-state';
import { useOverridesStore } from '../stores/overrides-store';
import { useProjectStore } from '../../../stores/project-store';
import { parseAgentsFromFrameworkEntities, type AgentEntry } from '../../agents/lib/parse-agents';
import { useFrameworkStore, CATEGORIES } from '../../framework/stores/framework-store';

export function OverridesPage() {
  const { t } = useTranslation();
  const activeProject = useProjectStore((s) => s.activeProject);
  const frameworkPath = useFrameworkStore((s) => s.frameworkPath);
  const initFramework = useFrameworkStore((s) => s.initialize);

  const overrides = useOverridesStore((s) => s.overrides);
  const projectRules = useOverridesStore((s) => s.projectRules);
  const effectiveEntities = useOverridesStore((s) => s.effectiveEntities);
  const effectiveCategory = useOverridesStore((s) => s.effectiveCategory);
  const loading = useOverridesStore((s) => s.loading);
  const load = useOverridesStore((s) => s.load);
  const toggleAgent = useOverridesStore((s) => s.toggleAgent);
  const addRule = useOverridesStore((s) => s.addRule);
  const removeRule = useOverridesStore((s) => s.removeRule);
  const fetchEffective = useOverridesStore((s) => s.fetchEffective);

  // Local state for agents
  const [agents, setAgents] = useState<AgentEntry[]>([]);
  const agentsLoading = useFrameworkStore((s) => s.loading.agents);
  const agentEntities = useFrameworkStore((s) => s.entities.agents);
  const fetchAgents = useFrameworkStore((s) => s.fetchCategory);

  // New rule form
  const [newRuleName, setNewRuleName] = useState('');
  const [showAddRule, setShowAddRule] = useState(false);

  // Init framework path
  useEffect(() => {
    if (!frameworkPath) void initFramework();
  }, [frameworkPath, initFramework]);

  // Load overrides when project changes
  useEffect(() => {
    if (activeProject?.path) {
      void load(activeProject.path);
    }
  }, [activeProject?.path, load]);

  // Load agents from framework service
  useEffect(() => {
    if (!frameworkPath) return;
    void (async () => {
      try {
        // Fetch from framework service (global + project)
        await fetchAgents('agents', activeProject?.path);
        setAgents(parseAgentsFromFrameworkEntities(agentEntities));
      } catch {
        setAgents([]);
      }
    })();
  }, [frameworkPath, activeProject?.path, fetchAgents, agentEntities]);

  const isDisabled = useCallback(
    (agentName: string) =>
      overrides?.agents.disabled.includes(agentName) ?? false,
    [overrides],
  );

  const handleToggleAgent = useCallback(
    async (agentName: string, enabled: boolean) => {
      await toggleAgent(agentName, enabled);
    },
    [toggleAgent],
  );

  const handleAddRule = useCallback(async () => {
    if (!newRuleName.trim()) return;
    await addRule(newRuleName.trim(), `# ${newRuleName.trim()}\n\nAdd your rule content here.\n`);
    setNewRuleName('');
    setShowAddRule(false);
  }, [newRuleName, addRule]);

  const handleTabChange = useCallback(
    (value: string) => {
      if (value === 'effective') {
        void fetchEffective('rules');
      }
    },
    [fetchEffective],
  );

  if (!activeProject) {
    return (
      <div>
        <PageHeader title={t('page.overrides.title')} description={t('page.overrides.noProject')} />
        <EmptyState message={t('page.overrides.noProject')} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t('page.overrides.title')}
        description={t('page.overrides.description', { project: activeProject.name })}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <Tabs
          defaultValue="agents"
          onValueChange={handleTabChange}
        >
          <TabsList>
            <TabsTrigger value="agents">
              <span className="flex items-center gap-1.5">
                <Layers size={14} />
                {t('page.overrides.agentsTab')}
                {overrides && overrides.agents.disabled.length > 0 && (
                  <Chip size="sm" color="warning">
                    {overrides.agents.disabled.length} {t('page.overrides.disabled')}
                  </Chip>
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger value="rules">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} />
                {t('page.overrides.projectRulesTab')}
                {overrides && overrides.rule_count > 0 && (
                  <Chip size="sm">{overrides.rule_count}</Chip>
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger value="effective">
              <span className="flex items-center gap-1.5">
                <Eye size={14} />
                {t('page.overrides.effectivePreviewTab')}
              </span>
            </TabsTrigger>
          </TabsList>

          {/* -- Agents tab -- */}
          <TabsContent value="agents">
            <div className="pt-4">
              <p className="mb-4 text-sm text-muted-foreground">
                {t('page.overrides.agentsHint')}
              </p>

              {agentsLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : agents.length === 0 ? (
                <EmptyState message={t('page.overrides.noAgents')} />
              ) : (
                <div className="grid gap-2">
                  {agents.filter((a) => a.type === 'agent').map((agent, i) => (
                    <div
                      key={`${agent.name}-${i}`}
                      className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{agent.emoji}</span>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {agent.name}
                          </p>
                          {agent.purpose && (
                            <p className="line-clamp-1 text-xs text-muted-foreground">
                              {agent.purpose}
                            </p>
                          )}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={!isDisabled(agent.name)}
                        onChange={(e) => void handleToggleAgent(agent.name, e.target.checked)}
                        className="h-4 w-4 rounded border-border"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* -- Project Rules tab -- */}
          <TabsContent value="rules">
            <div className="pt-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t('page.overrides.projectRulesHint')}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAddRule(!showAddRule)}
                >
                  <Plus size={14} />
                  {t('page.overrides.addRule')}
                </Button>
              </div>

              {showAddRule && (
                <Card className="mb-4">
                  <CardContent className="flex items-end gap-3 p-4">
                    <div className="flex-1">
                      <Label>Rule name</Label>
                      <Input
                        value={newRuleName}
                        onChange={(e) => setNewRuleName(e.target.value)}
                        placeholder={t('page.overrides.ruleNamePlaceholder')}
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="default"
                      disabled={!newRuleName.trim()}
                      onClick={() => void handleAddRule()}
                    >
                      {t('common.create')}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {projectRules.length === 0 ? (
                <EmptyState message={t('page.overrides.noRules')} />
              ) : (
                <div className="grid gap-2">
                  {projectRules.map((rule) => (
                    <div
                      key={rule.name}
                      className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {rule.name}
                        </p>
                        {rule.content && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                            {rule.content.slice(0, 120)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Chip size="sm" color="accent">{t('page.overrides.override')}</Chip>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => void removeRule(rule.name)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* -- Effective Preview tab -- */}
          <TabsContent value="effective">
            <div className="pt-4">
              <div className="mb-4 flex items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  {t('page.overrides.effectivePreviewHint')}
                </p>
                <div className="flex gap-1">
                  {CATEGORIES.map((cat) => (
                    <Button
                      key={cat}
                      size="sm"
                      variant={effectiveCategory === cat ? 'default' : 'ghost'}
                      onClick={() => void fetchEffective(cat)}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>

              {effectiveEntities.length === 0 ? (
                <EmptyState message={t('page.overrides.selectCategory')} />
              ) : (
                <div className="grid gap-2">
                  {effectiveEntities.map((entity) => (
                    <div
                      key={entity.name}
                      className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {entity.name}
                        </p>
                        {entity.content && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                            {entity.content.slice(0, 120)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Chip
                          size="sm"
                          color={entity.source === 'override' ? 'accent' : 'default'}
                        >
                          {entity.source === 'override' ? t('page.overrides.override') : t('page.overrides.global')}
                        </Chip>
                        {!entity.enabled && (
                          <Chip size="sm" color="danger">
                            {t('page.overrides.disabled')}
                          </Chip>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
