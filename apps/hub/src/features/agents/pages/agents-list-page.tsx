import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, Chip } from '@heroui/react';
import { Users, Crown } from 'lucide-react';
import { PageHeader } from '../../../components/layout/page-header';
import { EntityList } from '../../../components/entity';
import { AgentCard } from '../components/agent-card';
import { readFile } from '../../../lib/tauri';
import { useProjectStore } from '../../../stores/project-store';
import { parseAgents, agentSlug, type AgentEntry } from '../lib/parse-agents';

export function AgentsListPage() {
  const navigate = useNavigate();
  const activeProject = useProjectStore((s) => s.activeProject);
  const [agents, setAgents] = useState<AgentEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProject?.path) return;
    void (async () => {
      setLoading(true);
      try {
        const content = await readFile(`${activeProject.path}/AGENTS.md`);
        setAgents(parseAgents(content));
      } catch {
        setAgents([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeProject?.path]);

  const individualAgents = agents.filter((a) => a.type === 'agent');
  const orchestrators = agents.filter((a) => a.type === 'orchestrator');

  return (
    <div>
      <PageHeader
        title="Agents"
        description="Agent roles and competency matrix (read-only from AGENTS.md)"
      />

      {/* Stat cards */}
      <div className="mb-6 grid gap-3 grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-default-200 bg-default-50 p-3">
          <div className="rounded-lg bg-default-100 p-2 text-default-500">
            <Users size={18} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{agents.length}</p>
            <p className="text-[10px] text-default-400">Total</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-default-200 bg-default-50 p-3">
          <div className="rounded-lg bg-default-100 p-2 text-default-500">
            <Users size={18} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{individualAgents.length}</p>
            <p className="text-[10px] text-default-400">Agents</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-default-200 bg-default-50 p-3">
          <div className="rounded-lg bg-default-100 p-2 text-accent">
            <Crown size={18} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{orchestrators.length}</p>
            <p className="text-[10px] text-default-400">Orchestrators</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs aria-label="Agent types" defaultSelectedKey="agents">
        <Tabs.ListContainer>
          <Tabs.List>
            <Tabs.Tab key="agents" id="agents">
              <span className="flex items-center gap-1.5">
                <Users size={14} />
                Agents
                {individualAgents.length > 0 && (
                  <Chip size="sm" variant="soft">{individualAgents.length}</Chip>
                )}
              </span>
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab key="orchestrators" id="orchestrators">
              <span className="flex items-center gap-1.5">
                <Crown size={14} />
                Orchestrators
                {orchestrators.length > 0 && (
                  <Chip size="sm" variant="soft">{orchestrators.length}</Chip>
                )}
              </span>
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel id="agents">
          <div className="pt-4">
            <EntityList
              items={individualAgents}
              loading={loading}
              getKey={(a) => `${a.name}-${a.type}`}
              getSearchText={(a) => `${a.name} ${a.purpose ?? ''} ${a.skills ?? ''}`}
              searchPlaceholder="Search agents..."
              emptyMessage="No agents found in AGENTS.md."
              columns={3}
              renderItem={(agent) => (
                <AgentCard
                  agent={agent}
                  onPress={() => navigate(`/agents/${agentSlug(agent.name)}`)}
                />
              )}
            />
          </div>
        </Tabs.Panel>

        <Tabs.Panel id="orchestrators">
          <div className="pt-4">
            <EntityList
              items={orchestrators}
              loading={loading}
              getKey={(a) => `${a.name}-${a.type}`}
              getSearchText={(a) => `${a.name} ${a.purpose ?? ''} ${a.skills ?? ''}`}
              searchPlaceholder="Search orchestrators..."
              emptyMessage="No orchestrators found in AGENTS.md."
              columns={3}
              renderItem={(agent) => (
                <AgentCard
                  agent={agent}
                  onPress={() => navigate(`/agents/${agentSlug(agent.name)}`)}
                />
              )}
            />
          </div>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
