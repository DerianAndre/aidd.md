import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb, AlertTriangle, BookMarked, ArrowRight } from 'lucide-react';
import { usePermanentMemoryStore } from '../../memory/stores/permanent-memory-store';
import { useProjectStore } from '../../../stores/project-store';
import { ROUTES } from '../../../lib/constants';

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
    { label: 'Decisions', count: decisions.length, icon: Lightbulb, color: 'text-accent' },
    { label: 'Mistakes', count: mistakes.length, icon: AlertTriangle, color: 'text-warning' },
    { label: 'Conventions', count: conventions.length, icon: BookMarked, color: 'text-success' },
  ];

  return (
    <div>
      <div className="flex gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
              <Icon size={14} className={item.color} />
              <span className="text-lg font-bold text-foreground">{item.count}</span>
              <span className="text-[10px] text-muted-foreground">{item.label}</span>
            </div>
          );
        })}
      </div>
      <Link
        to={ROUTES.MEMORY}
        className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        View Memory <ArrowRight size={12} />
      </Link>
    </div>
  );
}
