import { useEffect, useState } from 'react';
import { Tabs, Skeleton } from '@heroui/react';
import { PageHeader } from '../../../components/layout/page-header';
import { BlockEditor } from '../../../components/editor';
import { readFile, fileExists } from '../../../lib/tauri';
import { useProjectStore } from '../../../stores/project-store';

const ADAPTERS = [
  { id: 'claude', label: 'Claude Code', file: 'README.md' },
  { id: 'cursor', label: 'Cursor', file: 'README.md' },
  { id: 'gemini', label: 'Gemini', file: 'README.md' },
  { id: 'warp', label: 'Warp', file: 'README.md' },
] as const;

export function AdaptersPage() {
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
      <PageHeader title="Adapters" description="IDE integration guides (read-only)" />

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-10 w-64 rounded-lg" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )}

      {!loading && (
        <Tabs>
          <Tabs.ListContainer>
            <Tabs.List aria-label="IDE Adapters">
              {ADAPTERS.map((adapter) => (
                <Tabs.Tab key={adapter.id} id={adapter.id}>
                  {adapter.label}
                  <Tabs.Indicator />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>

          {ADAPTERS.map((adapter) => (
            <Tabs.Panel key={adapter.id} id={adapter.id}>
              {contents[adapter.id] ? (
                <div className="mt-2 rounded-xl border border-default-200">
                  <BlockEditor
                    initialMarkdown={contents[adapter.id]}
                    editable={false}
                  />
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-default-400">
                  No README.md found for {adapter.label} adapter.
                </p>
              )}
            </Tabs.Panel>
          ))}
        </Tabs>
      )}
    </div>
  );
}
