import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '../../../components/layout/page-header';
import { BlockEditor } from '../../../components/editor';
import { readFile } from '../../../lib/tauri';
import { useProjectStore } from '../../../stores/project-store';
import { parseAgents, agentSlug, type AgentEntry } from '../lib/parse-agents';

export function AgentDetailPage() {
  const { t } = useTranslation();
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const activeProject = useProjectStore((s) => s.activeProject);
  const [agent, setAgent] = useState<AgentEntry | null>(null);
  const [rawContent, setRawContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProject?.path || !name) return;
    void (async () => {
      setLoading(true);
      try {
        const content = await readFile(`${activeProject.path}/AGENTS.md`);
        setRawContent(content);
        const agents = parseAgents(content);
        const found = agents.find((a) => agentSlug(a.name) === name);
        setAgent(found ?? null);
      } catch {
        setAgent(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeProject?.path, name]);

  if (loading) {
    return <div className="p-4 text-muted-foreground">Loading...</div>;
  }

  if (!agent) {
    return (
      <div>
        <PageHeader title="Agent Not Found" />
        <Button variant="ghost" size="sm" onClick={() => navigate('/agents')}>
          <ArrowLeft size={16} /> {t('common.back')}
        </Button>
      </div>
    );
  }

  // Extract the section of AGENTS.md for this agent (from heading to next heading of same level or higher)
  const agentSection = extractSection(rawContent, agent.name);

  return (
    <div>
      <PageHeader
        title={`${agent.emoji} ${agent.name}`}
        description={agent.purpose}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/agents')}>
            <ArrowLeft size={16} /> {t('common.back')}
          </Button>
        }
      />

      {/* Metadata chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Chip size="sm" color={agent.type === 'orchestrator' ? 'accent' : 'default'}>
          {agent.type === 'orchestrator' ? t('page.agents.orchestrator') : t('page.agents.agent')}
        </Chip>
        {agent.skills && (
          <Chip size="sm" color="default">{agent.skills}</Chip>
        )}
        {agent.activation && (
          <Chip size="sm" color="default">{agent.activation}</Chip>
        )}
        {agent.complexity && (
          <Chip size="sm" color="warning">{agent.complexity}</Chip>
        )}
        {agent.duration && (
          <Chip size="sm" color="default">{agent.duration}</Chip>
        )}
        {agent.cost && (
          <Chip size="sm" color="success">{agent.cost}</Chip>
        )}
      </div>

      {/* Workflow steps for orchestrators */}
      {agent.workflow && agent.workflow.length > 0 && (
        <div className="mb-4 rounded-xl border border-border bg-muted/50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">{t('page.agents.workflowSteps')}</h3>
          <ol className="list-inside list-decimal space-y-1 text-xs text-muted-foreground">
            {agent.workflow.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Raw section rendered in BlockNote read-only */}
      {agentSection && (
        <div className="rounded-xl border border-border">
          <BlockEditor initialMarkdown={agentSection} editable={false} />
        </div>
      )}
    </div>
  );
}

/** Extract a markdown section by heading name. */
function extractSection(markdown: string, agentName: string): string {
  const lines = markdown.split('\n');
  let startIdx = -1;
  let startLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (line.includes(agentName) && /^#{2,4}\s/.test(line)) {
      startIdx = i;
      startLevel = (line.match(/^#+/) ?? [''])[0].length;
      break;
    }
  }

  if (startIdx === -1) return '';

  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const headingMatch = line.match(/^(#{2,4})\s/);
    if (headingMatch?.[1] && headingMatch[1].length <= startLevel) {
      endIdx = i;
      break;
    }
  }

  return lines.slice(startIdx, endIdx).join('\n').trim();
}
