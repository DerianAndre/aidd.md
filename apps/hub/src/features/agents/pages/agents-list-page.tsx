import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Chip } from '@/components/ui/chip';
import { Users, Crown } from 'lucide-react';
import { PageHeader } from '../../../components/layout/page-header';
import { EntityList } from '../../../components/entity';
import { AgentCard } from '../components/agent-card';
import { readFile } from '../../../lib/tauri';
import { useProjectStore } from '../../../stores/project-store';
import { useFrameworkStore } from '../../framework/stores/framework-store';
import { parseAgentsFromFrameworkEntities, parseAgentsFromRouting, agentSlug, type AgentEntry } from '../lib/parse-agents';

export function AgentsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const activeProject = useProjectStore((s) => s.activeProject);
  const frameworkStore = useFrameworkStore();
  const [agents, setAgents] = useState<AgentEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProject?.path) return;
    void (async () => {
      setLoading(true);
      try {
        // Try to fetch from framework service
        await frameworkStore.fetchCategory('agents', activeProject.path);
        const entities = frameworkStore.entities.agents;

        if (entities.length > 0) {
          setAgents(parseAgentsFromFrameworkEntities(entities));
        } else {
          // Fallback: try reading routing.md or AGENTS.md directly
          try {
            const routingPath = `${activeProject.path}/.aidd/content/agents/routing.md`;
            const content = await readFile(routingPath);
            setAgents(parseAgentsFromRouting(content));
          } catch {
            // Final fallback: try old AGENTS.md location
            try {
              const content = await readFile(`${activeProject.path}/AGENTS.md`);
              setAgents(parseAgentsFromRouting(content));
            } catch {
              setAgents([]);
            }
          }
        }
      } catch {
        setAgents([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeProject?.path, frameworkStore]);

  const individualAgents = agents.filter((a) => a.type === 'agent');
  const orchestrators = agents.filter((a) => a.type === 'orchestrator');

  return (
    <div>
      <PageHeader
        title={t('page.agents.title')}
        description={t('page.agents.description')}
      />

      {/* Stat cards */}
      <div className="mb-6 grid gap-3 grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3">
          <div className="rounded-lg bg-muted p-2 text-muted-foreground">
            <Users size={18} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{agents.length}</p>
            <p className="text-[10px] text-muted-foreground">{t('page.agents.total')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3">
          <div className="rounded-lg bg-muted p-2 text-muted-foreground">
            <Users size={18} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{individualAgents.length}</p>
            <p className="text-[10px] text-muted-foreground">{t('page.agents.agents')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3">
          <div className="rounded-lg bg-muted p-2 text-accent">
            <Crown size={18} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{orchestrators.length}</p>
            <p className="text-[10px] text-muted-foreground">{t('page.agents.orchestrators')}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="agents">
        <TabsList>
          <TabsTrigger value="agents">
            <span className="flex items-center gap-1.5">
              <Users size={14} />
              {t('page.agents.agentsTab', { count: individualAgents.length })}
              {individualAgents.length > 0 && (
                <Chip size="sm">{individualAgents.length}</Chip>
              )}
            </span>
          </TabsTrigger>
          <TabsTrigger value="orchestrators">
            <span className="flex items-center gap-1.5">
              <Crown size={14} />
              {t('page.agents.orchestratorsTab', { count: orchestrators.length })}
              {orchestrators.length > 0 && (
                <Chip size="sm">{orchestrators.length}</Chip>
              )}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agents">
          <div className="pt-4">
            <EntityList
              items={individualAgents}
              loading={loading}
              getKey={(a) => `${a.name}-${a.type}`}
              getSearchText={(a) => `${a.name} ${a.purpose ?? ''} ${a.skills ?? ''}`}
              searchPlaceholder={t('page.agents.searchAgents')}
              emptyMessage={t('page.agents.noAgents')}
              columns={3}
              renderItem={(agent) => (
                <AgentCard
                  agent={agent}
                  onPress={() => navigate(`/agents/${agentSlug(agent.name)}`)}
                />
              )}
            />
          </div>
        </TabsContent>

        <TabsContent value="orchestrators">
          <div className="pt-4">
            <EntityList
              items={orchestrators}
              loading={loading}
              getKey={(a) => `${a.name}-${a.type}`}
              getSearchText={(a) => `${a.name} ${a.purpose ?? ''} ${a.skills ?? ''}`}
              searchPlaceholder={t('page.agents.searchOrchestrators')}
              emptyMessage={t('page.agents.noOrchestrators')}
              columns={3}
              renderItem={(agent) => (
                <AgentCard
                  agent={agent}
                  onPress={() => navigate(`/agents/${agentSlug(agent.name)}`)}
                />
              )}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
