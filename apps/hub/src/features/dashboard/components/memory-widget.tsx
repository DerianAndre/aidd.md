import { useEffect } from 'react';
import { Skeleton } from '@heroui/react';
import { usePermanentMemoryStore } from '../../memory/stores/permanent-memory-store';
import { useProjectStore } from '../../../stores/project-store';

export function MemoryWidget() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const { decisions, mistakes, conventions, loading, stale, fetch } = usePermanentMemoryStore();

  useEffect(() => {
    if (activeProject?.path && stale) {
      void fetch(activeProject.path);
    }
  }, [activeProject?.path, stale, fetch]);

  if (loading) {
    return <Skeleton className="h-12 rounded-lg" />;
  }

  const items = [
    { label: 'Decisions', count: decisions.length },
    { label: 'Mistakes', count: mistakes.length },
    { label: 'Conventions', count: conventions.length },
  ];

  return (
    <div className="flex gap-4">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col items-center">
          <span className="text-lg font-bold text-foreground">{item.count}</span>
          <span className="text-[10px] text-default-400">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
