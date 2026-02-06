import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@heroui/react';
import { PageHeader } from '../../../components/layout/page-header';
import { EmptyState } from '../../../components/empty-state';
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
      <PageHeader title="Agents" description="Agent roles and competency matrix (read-only from AGENTS.md)" />

      {loading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      )}

      {!loading && agents.length === 0 && (
        <EmptyState message="No AGENTS.md found in this project." />
      )}

      {!loading && individualAgents.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-default-600">
            Individual Agents ({individualAgents.length})
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {individualAgents.map((agent) => (
              <AgentCard
                key={agent.name}
                agent={agent}
                onPress={() => navigate(`/agents/${agentSlug(agent.name)}`)}
              />
            ))}
          </div>
        </section>
      )}

      {!loading && orchestrators.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-default-600">
            Orchestrators ({orchestrators.length})
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {orchestrators.map((agent) => (
              <AgentCard
                key={agent.name}
                agent={agent}
                onPress={() => navigate(`/agents/${agentSlug(agent.name)}`)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
