import { useMemo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Wrench, BookOpen, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '../../../components/layout/page-header';
import { ToolExplorer } from '../components/tool-explorer';
import { ResourceDetail, PromptDetail } from '../components/tool-detail';
import { getAllResources, getAllPrompts, getCatalogStats, getAllTools } from '../lib/mcp-catalog';
import { callMcpTool, listMcpTools } from '../../../lib/tauri';
import type { McpToolInfo } from '../lib/mcp-catalog';

export function McpPlaygroundPage() {
  const { t } = useTranslation();
  const allTools = useMemo(() => getAllTools(), []);
  const resources = useMemo(() => getAllResources(), []);
  const prompts = useMemo(() => getAllPrompts(), []);
  const fallbackStats = getCatalogStats();

  const [runtimeTools, setRuntimeTools] = useState<(McpToolInfo & { packageName: string })[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [toolError, setToolError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string>('@aidd.md/mcp-engine');
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [toolArguments, setToolArguments] = useState<string>('{}');
  const [runningTool, setRunningTool] = useState(false);
  const [toolOutput, setToolOutput] = useState<string>('');
  const [runnerError, setRunnerError] = useState<string | null>(null);

  const refreshTools = async () => {
    setLoadingTools(true);
    setToolError(null);
    try {
      const tools = await withTimeout(
        listMcpTools('engine'),
        12_000,
        t('page.mcpPlayground.toolsTimeout'),
      );
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

  const toolOptions = useMemo(() => {
    const source = runtimeTools.length > 0 ? runtimeTools : allTools;
    return source.filter((tool) => tool.packageName === selectedPackage);
  }, [allTools, runtimeTools, selectedPackage]);

  useEffect(() => {
    // Defer runtime discovery until after first paint to keep navigation responsive.
    const timer = window.setTimeout(() => {
      void refreshTools();
    }, 250);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const source = runtimeTools.length > 0 ? runtimeTools : allTools;
    const packages = [...new Set(source.map((tool) => tool.packageName))];
    const nextPackage = packages[0];
    if (!nextPackage) return;
    if (!packages.includes(selectedPackage)) {
      setSelectedPackage(nextPackage);
    }
  }, [allTools, runtimeTools, selectedPackage]);

  useEffect(() => {
    const nextTool = toolOptions[0];
    if (!nextTool) {
      setSelectedTool('');
      return;
    }
    const stillExists = toolOptions.some((tool) => tool.name === selectedTool);
    if (!stillExists) {
      setSelectedTool(nextTool.name);
    }
  }, [toolOptions, selectedTool]);

  const runSelectedTool = async () => {
    if (!selectedTool) return;
    setRunnerError(null);
    setRunningTool(true);
    setToolOutput('');
    try {
      const parsed = parseRunnerArgs(toolArguments);
      const result = await withTimeout(
        callMcpTool<unknown>(
          selectedPackage,
          selectedTool,
          parsed,
        ),
        20_000,
        t('page.mcpPlayground.executionTimeout'),
      );
      setToolOutput(JSON.stringify(result, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('page.mcpPlayground.executionFailed');
      setRunnerError(message);
    } finally {
      setRunningTool(false);
    }
  };

  const toolCount = runtimeTools.length > 0 ? runtimeTools.length : fallbackStats.totalTools;
  const packageOptions = useMemo(() => {
    const source = runtimeTools.length > 0 ? runtimeTools : allTools;
    return [...new Set(source.map((tool) => tool.packageName))];
  }, [allTools, runtimeTools]);

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
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-sm">{t('page.mcpPlayground.runTool')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>{t('page.mcpPlayground.package')}</Label>
                  <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('page.mcpPlayground.selectPackage')} />
                    </SelectTrigger>
                    <SelectContent>
                      {packageOptions.map((pkg) => (
                        <SelectItem key={pkg} value={pkg}>
                          {pkg}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>{t('page.mcpPlayground.tool')}</Label>
                  <Select value={selectedTool} onValueChange={setSelectedTool}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('page.mcpPlayground.selectTool')} />
                    </SelectTrigger>
                    <SelectContent>
                      {toolOptions.map((tool) => (
                        <SelectItem key={tool.name} value={tool.name}>
                          {tool.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>{t('page.mcpPlayground.arguments')}</Label>
                <Textarea
                  value={toolArguments}
                  onChange={(event) => setToolArguments(event.target.value)}
                  rows={6}
                  className="font-mono text-xs"
                  placeholder={t('page.mcpPlayground.argumentsPlaceholder')}
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => void runSelectedTool()}
                  disabled={runningTool || !selectedTool}
                >
                  {runningTool ? t('page.mcpPlayground.executing') : t('page.mcpPlayground.execute')}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {t('page.mcpPlayground.targetServer')}
                </p>
              </div>

              {runnerError && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                  {runnerError}
                </p>
              )}

              {toolOutput && (
                <div className="space-y-1">
                  <Label>{t('page.mcpPlayground.result')}</Label>
                  <pre className="max-h-[380px] overflow-auto rounded-md bg-muted p-3 text-xs">
                    {toolOutput}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

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

function parseRunnerArgs(rawArgs: string): Record<string, unknown> {
  const parsed = JSON.parse(rawArgs.trim() || '{}');
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('Tool arguments must be a JSON object.');
  }
  return parsed as Record<string, unknown>;
}

function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(errorMessage));
    }, ms);

    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}
