import { useMemo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Wrench, BookOpen, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../../../components/layout/page-header';
import { ToolExplorer } from '../components/tool-explorer';
import { ResourceDetail, PromptDetail } from '../components/tool-detail';
import { getAllResources, getAllPrompts, getCatalogStats } from '../lib/mcp-catalog';
import { listMcpTools } from '../../../lib/tauri';
import type { McpToolInfo } from '../lib/mcp-catalog';

export function McpPlaygroundPage() {
  const { t } = useTranslation();
  const resources = useMemo(() => getAllResources(), []);
  const prompts = useMemo(() => getAllPrompts(), []);
  const fallbackStats = getCatalogStats();

  const [runtimeTools, setRuntimeTools] = useState<(McpToolInfo & { packageName: string })[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [toolError, setToolError] = useState<string | null>(null);

  const refreshTools = async () => {
    setLoadingTools(true);
    setToolError(null);
    try {
      const tools = await listMcpTools('engine');
      const mapped = tools.map((t) => ({
        name: t.name,
        description: t.description ?? '',
        packageName: '@aidd.md/mcp-engine',
      }));
      setRuntimeTools(mapped);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load runtime tools; using static catalog.';
      setToolError(msg);
      setRuntimeTools([]);
    } finally {
      setLoadingTools(false);
    }
  };

  useEffect(() => {
    void refreshTools();
  }, []);

  const toolCount = runtimeTools.length > 0 ? runtimeTools.length : fallbackStats.totalTools;

  return (
    <div>
      <PageHeader
        title={t('page.mcpPlayground.title')}
        description={t('page.mcpPlayground.description')}
        actions={(
          <Button size="sm" variant="ghost" onClick={() => void refreshTools()} disabled={loadingTools}>
            {loadingTools ? 'Refreshing...' : 'Refresh Tools'}
          </Button>
        )}
      />

      <Tabs defaultValue="tools">
        <TabsList aria-label="MCP catalog">
          <TabsTrigger value="tools">
            <span className="flex items-center gap-1.5">
              <Wrench size={14} /> {t('page.mcpPlayground.tools')} ({toolCount})
            </span>
          </TabsTrigger>
          <TabsTrigger value="resources">
            <span className="flex items-center gap-1.5">
              <BookOpen size={14} /> {t('page.mcpPlayground.resources')} ({fallbackStats.totalResources})
            </span>
          </TabsTrigger>
          <TabsTrigger value="prompts">
            <span className="flex items-center gap-1.5">
              <MessageSquare size={14} /> {t('page.mcpPlayground.prompts')} ({fallbackStats.totalPrompts})
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Tools */}
        <TabsContent value="tools" className="pt-4">
          <ToolExplorer
            tools={runtimeTools.length > 0 ? runtimeTools : undefined}
            loading={loadingTools}
            error={toolError}
          />
        </TabsContent>

        {/* Resources */}
        <TabsContent value="resources" className="pt-4">
          <div className="space-y-3">
            {resources.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('page.mcpPlayground.noResources')}</p>
            ) : (
              resources.map((r) => <ResourceDetail key={r.uri} resource={r} />)
            )}
          </div>
        </TabsContent>

        {/* Prompts */}
        <TabsContent value="prompts" className="pt-4">
          <div className="space-y-3">
            {prompts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('page.mcpPlayground.noPrompts')}</p>
            ) : (
              prompts.map((p) => <PromptDetail key={p.name} prompt={p} />)
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
