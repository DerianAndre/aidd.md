import { useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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

      <Tabs defaultValue="tools">
        <TabsList aria-label="MCP catalog">
          <TabsTrigger value="tools">
            <span className="flex items-center gap-1.5">
              <Wrench size={14} /> Tools ({stats.totalTools})
            </span>
          </TabsTrigger>
          <TabsTrigger value="resources">
            <span className="flex items-center gap-1.5">
              <BookOpen size={14} /> Resources ({stats.totalResources})
            </span>
          </TabsTrigger>
          <TabsTrigger value="prompts">
            <span className="flex items-center gap-1.5">
              <MessageSquare size={14} /> Prompts ({stats.totalPrompts})
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Tools */}
        <TabsContent value="tools" className="pt-4">
          <ToolExplorer />
        </TabsContent>

        {/* Resources */}
        <TabsContent value="resources" className="pt-4">
          <div className="space-y-3">
            {resources.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No resources registered.</p>
            ) : (
              resources.map((r) => <ResourceDetail key={r.uri} resource={r} />)
            )}
          </div>
        </TabsContent>

        {/* Prompts */}
        <TabsContent value="prompts" className="pt-4">
          <div className="space-y-3">
            {prompts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No prompts registered.</p>
            ) : (
              prompts.map((p) => <PromptDetail key={p.name} prompt={p} />)
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
