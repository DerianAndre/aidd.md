import { useMemo } from 'react';
import { Tabs } from '@heroui/react';
import { Wrench, BookOpen, MessageSquare } from 'lucide-react';
import { PageHeader } from '../../../components/layout/page-header';
import { ToolExplorer } from '../components/tool-explorer';
import { ResourceDetail, PromptDetail } from '../components/tool-detail';
import { getAllResources, getAllPrompts, getCatalogStats } from '../lib/mcp-catalog';

export function McpPlaygroundPage() {
  const resources = useMemo(() => getAllResources(), []);
  const prompts = useMemo(() => getAllPrompts(), []);
  const stats = getCatalogStats();

  return (
    <div>
      <PageHeader title="MCP Playground" description="Browse tools, resources, and prompts across all AIDD MCP packages" />

      <Tabs>
        <Tabs.ListContainer>
          <Tabs.List aria-label="MCP catalog">
            <Tabs.Tab id="tools">
              <span className="flex items-center gap-1.5">
                <Wrench size={14} /> Tools ({stats.totalTools})
              </span>
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="resources">
              <span className="flex items-center gap-1.5">
                <BookOpen size={14} /> Resources ({stats.totalResources})
              </span>
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="prompts">
              <span className="flex items-center gap-1.5">
                <MessageSquare size={14} /> Prompts ({stats.totalPrompts})
              </span>
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        {/* Tools */}
        <Tabs.Panel id="tools" className="pt-4">
          <ToolExplorer />
        </Tabs.Panel>

        {/* Resources */}
        <Tabs.Panel id="resources" className="pt-4">
          <div className="space-y-3">
            {resources.length === 0 ? (
              <p className="py-8 text-center text-sm text-default-400">No resources registered.</p>
            ) : (
              resources.map((r) => <ResourceDetail key={r.uri} resource={r} />)
            )}
          </div>
        </Tabs.Panel>

        {/* Prompts */}
        <Tabs.Panel id="prompts" className="pt-4">
          <div className="space-y-3">
            {prompts.length === 0 ? (
              <p className="py-8 text-center text-sm text-default-400">No prompts registered.</p>
            ) : (
              prompts.map((p) => <PromptDetail key={p.name} prompt={p} />)
            )}
          </div>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
