import { useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@heroui/react';
import { PageHeader } from '../../../components/layout/page-header';
import { EmptyState } from '../../../components/empty-state';
import { KnowledgeTree } from '../components/knowledge-tree';
import { KnowledgeContent } from '../components/knowledge-content';
import { useKnowledgeStore } from '../stores/knowledge-store';
import { useProjectStore } from '../../../stores/project-store';
import { buildTree } from '../lib/build-tree';
import type { TreeNode } from '../lib/types';

export function KnowledgePage() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const { items, loading, stale, fetchAll } = useKnowledgeStore();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  useEffect(() => {
    if (activeProject?.path && stale) {
      void fetchAll(activeProject.path);
    }
  }, [activeProject?.path, stale, fetchAll]);

  const tree = useMemo(() => buildTree(items), [items]);

  const selectedEntity = useMemo(() => {
    if (!selectedPath) return null;
    return items.find((e) => e.relativePath === selectedPath) ?? null;
  }, [items, selectedPath]);

  const handleSelect = (node: TreeNode) => {
    if (!node.isDir && node.entity) {
      setSelectedPath(node.path);
    }
  };

  return (
    <div>
      <PageHeader
        title="Knowledge Base"
        description={`Technology Knowledge Base — ${items.length} entries`}
      />

      {loading && (
        <div className="flex gap-4">
          <Skeleton className="h-96 w-64 rounded-xl" />
          <Skeleton className="h-96 flex-1 rounded-xl" />
        </div>
      )}

      {!loading && items.length === 0 && (
        <EmptyState message="No knowledge entries found in this project." />
      )}

      {!loading && items.length > 0 && (
        <div className="flex gap-4">
          {/* Tree panel */}
          <div className="w-64 shrink-0 overflow-y-auto rounded-xl border border-default-200 bg-default-50 p-2" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            <KnowledgeTree
              nodes={tree}
              selectedPath={selectedPath}
              onSelect={handleSelect}
            />
          </div>

          {/* Content panel */}
          <div className="min-w-0 flex-1">
            {selectedEntity ? (
              <KnowledgeContent entity={selectedEntity} />
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-default-400">
                Select an entry from the tree to view its content.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
