import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '../../../components/layout/page-header';
import { BlockEditor } from '../../../components/editor';
import { readFile, fileExists } from '../../../lib/tauri';
import { useProjectStore } from '../../../stores/project-store';

const ADAPTERS = [
  { id: 'claude', labelKey: 'page.adapters.claudeCode' as const, file: 'README.md' },
  { id: 'cursor', labelKey: 'page.adapters.cursor' as const, file: 'README.md' },
  { id: 'gemini', labelKey: 'page.adapters.gemini' as const, file: 'README.md' },
  { id: 'warp', labelKey: 'page.adapters.warp' as const, file: 'README.md' },
] as const;

export function AdaptersPage() {
  const { t } = useTranslation();
  const activeProject = useProjectStore((s) => s.activeProject);
  const [contents, setContents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProject?.path) return;
    void (async () => {
      setLoading(true);
      const result: Record<string, string> = {};
      for (const adapter of ADAPTERS) {
        const path = `${activeProject.path}/adapters/${adapter.id}/${adapter.file}`;
        try {
          const exists = await fileExists(path);
          if (exists) {
            result[adapter.id] = await readFile(path);
          }
        } catch {
          // Skip missing adapters
        }
      }
      setContents(result);
      setLoading(false);
    })();
  }, [activeProject?.path]);

  return (
    <div>
      <PageHeader title={t('page.adapters.title')} description={t('page.adapters.description')} />

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-10 w-64 rounded-lg" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )}

      {!loading && (
        <Tabs defaultValue={ADAPTERS[0].id}>
          <TabsList>
            {ADAPTERS.map((adapter) => (
              <TabsTrigger key={adapter.id} value={adapter.id}>
                {t(adapter.labelKey)}
              </TabsTrigger>
            ))}
          </TabsList>

          {ADAPTERS.map((adapter) => (
            <TabsContent key={adapter.id} value={adapter.id}>
              {contents[adapter.id] ? (
                <div className="mt-2 rounded-xl border">
                  <BlockEditor
                    initialMarkdown={contents[adapter.id]}
                    editable={false}
                  />
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t('page.adapters.noReadme', { adapter: t(adapter.labelKey) })}
                </p>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
