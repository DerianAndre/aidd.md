import { useEffect, useState, useCallback } from 'react';
import {
  Tabs,
  Chip,
  Spinner,
  Switch,
  Label,
  Button,
  Card,
  TextField,
  Input,
} from '@heroui/react';
import { Layers, ShieldCheck, Eye, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/page-header';
import { EmptyState } from '../../../components/empty-state';
import { useOverridesStore } from '../stores/overrides-store';
import { useProjectStore } from '../../../stores/project-store';
import { readFile } from '../../../lib/tauri';
import { parseAgents, type AgentEntry } from '../../agents/lib/parse-agents';
import { useFrameworkStore, CATEGORIES } from '../../framework/stores/framework-store';

export function OverridesPage() {
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

  // Local state for agents from AGENTS.md
  const [agents, setAgents] = useState<AgentEntry[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);

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

  // Load agents from global AGENTS.md
  useEffect(() => {
    if (!frameworkPath) return;
    void (async () => {
      setAgentsLoading(true);
      try {
        const content = await readFile(`${frameworkPath}/AGENTS.md`);
        setAgents(parseAgents(content));
      } catch {
        // Try project-level AGENTS.md as fallback
        if (activeProject?.path) {
          try {
            const content = await readFile(`${activeProject.path}/AGENTS.md`);
            setAgents(parseAgents(content));
          } catch {
            setAgents([]);
          }
        } else {
          setAgents([]);
        }
      } finally {
        setAgentsLoading(false);
      }
    })();
  }, [frameworkPath, activeProject?.path]);

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
    (key: string | number) => {
      if (key === 'effective') {
        void fetchEffective('rules');
      }
    },
    [fetchEffective],
  );

  if (!activeProject) {
    return (
      <div>
        <PageHeader title="Overrides" description="Per-project framework customizations" />
        <EmptyState message="Select a project to manage overrides." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Overrides"
        description={`Per-project customizations for ${activeProject.name}`}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <Tabs
          aria-label="Override sections"
          onSelectionChange={handleTabChange}
        >
          <Tabs.ListContainer>
            <Tabs.List>
              <Tabs.Tab key="agents" id="agents">
                <span className="flex items-center gap-1.5">
                  <Layers size={14} />
                  Agents
                  {overrides && overrides.agents.disabled.length > 0 && (
                    <Chip size="sm" variant="soft" color="warning">
                      {overrides.agents.disabled.length} disabled
                    </Chip>
                  )}
                </span>
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab key="rules" id="rules">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={14} />
                  Project Rules
                  {overrides && overrides.rule_count > 0 && (
                    <Chip size="sm" variant="soft">{overrides.rule_count}</Chip>
                  )}
                </span>
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab key="effective" id="effective">
                <span className="flex items-center gap-1.5">
                  <Eye size={14} />
                  Effective Preview
                </span>
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>

          {/* ── Agents tab ──────────────────────────────────────────── */}
          <Tabs.Panel key="agents" id="agents">
            <div className="pt-4">
              <p className="mb-4 text-sm text-default-500">
                Toggle agents on/off for this project. Disabled agents are excluded
                from integration-generated files.
              </p>

              {agentsLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : agents.length === 0 ? (
                <EmptyState message="No agents found. Ensure AGENTS.md exists in the global framework." />
              ) : (
                <div className="grid gap-2">
                  {agents.filter((a) => a.type === 'agent').map((agent, i) => (
                    <div
                      key={`${agent.name}-${i}`}
                      className="flex items-center justify-between rounded-lg border border-default-200 bg-default-50 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{agent.emoji}</span>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {agent.name}
                          </p>
                          {agent.purpose && (
                            <p className="line-clamp-1 text-xs text-default-400">
                              {agent.purpose}
                            </p>
                          )}
                        </div>
                      </div>
                      <Switch
                        size="sm"
                        isSelected={!isDisabled(agent.name)}
                        onChange={(val) => void handleToggleAgent(agent.name, val)}
                      >
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Tabs.Panel>

          {/* ── Project Rules tab ──────────────────────────────────── */}
          <Tabs.Panel key="rules" id="rules">
            <div className="pt-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-default-500">
                  Project-specific rules stored in .aidd/overrides/rules/.
                  These are merged with global rules.
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => setShowAddRule(!showAddRule)}
                >
                  <Plus size={14} />
                  Add Rule
                </Button>
              </div>

              {showAddRule && (
                <Card className="mb-4">
                  <Card.Content className="flex items-end gap-3 p-4">
                    <TextField
                      className="flex-1"
                      value={newRuleName}
                      onChange={setNewRuleName}
                    >
                      <Label>Rule name</Label>
                      <Input placeholder="e.g. project-conventions" />
                    </TextField>
                    <Button
                      size="sm"
                      variant="primary"
                      isDisabled={!newRuleName.trim()}
                      onPress={() => void handleAddRule()}
                    >
                      Create
                    </Button>
                  </Card.Content>
                </Card>
              )}

              {projectRules.length === 0 ? (
                <EmptyState message="No project-specific rules yet." />
              ) : (
                <div className="grid gap-2">
                  {projectRules.map((rule) => (
                    <div
                      key={rule.name}
                      className="flex items-center justify-between rounded-lg border border-default-200 bg-default-50 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {rule.name}
                        </p>
                        {rule.content && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-default-400">
                            {rule.content.slice(0, 120)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Chip size="sm" variant="soft" color="accent">override</Chip>
                        <Button
                          size="sm"
                          variant="danger"
                          onPress={() => void removeRule(rule.name)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Tabs.Panel>

          {/* ── Effective Preview tab ──────────────────────────────── */}
          <Tabs.Panel key="effective" id="effective">
            <div className="pt-4">
              <div className="mb-4 flex items-center gap-3">
                <p className="text-sm text-default-500">
                  Preview the merged result of global framework + project overrides.
                </p>
                <div className="flex gap-1">
                  {CATEGORIES.map((cat) => (
                    <Button
                      key={cat}
                      size="sm"
                      variant={effectiveCategory === cat ? 'primary' : 'ghost'}
                      onPress={() => void fetchEffective(cat)}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>

              {effectiveEntities.length === 0 ? (
                <EmptyState message="Select a category above to preview effective content." />
              ) : (
                <div className="grid gap-2">
                  {effectiveEntities.map((entity) => (
                    <div
                      key={entity.name}
                      className="flex items-center justify-between rounded-lg border border-default-200 bg-default-50 px-4 py-3"
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
                      <div className="flex items-center gap-2">
                        <Chip
                          size="sm"
                          variant="soft"
                          color={entity.source === 'override' ? 'accent' : 'default'}
                        >
                          {entity.source}
                        </Chip>
                        {!entity.enabled && (
                          <Chip size="sm" variant="soft" color="danger">
                            disabled
                          </Chip>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Tabs.Panel>
        </Tabs>
      )}
    </div>
  );
}
