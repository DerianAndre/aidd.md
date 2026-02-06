import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/layout/page-header';
import { EntityList, EntityCard } from '../../../components/entity';
import { useTemplatesStore } from '../stores/templates-store';
import { useProjectStore } from '../../../stores/project-store';
import { filenameFromPath } from '../../../lib/utils';

export function TemplatesListPage() {
  const navigate = useNavigate();
  const activeProject = useProjectStore((s) => s.activeProject);
  const { items, loading, stale, fetchAll } = useTemplatesStore();

  useEffect(() => {
    if (activeProject?.path && stale) {
      void fetchAll(activeProject.path);
    }
  }, [activeProject?.path, stale, fetchAll]);

  return (
    <div>
      <PageHeader title="Templates" description="Task-specific development guides" />
      <EntityList
        items={items}
        loading={loading}
        getKey={(t) => t.id}
        getSearchText={(t) => `${t.name} ${t.description}`}
        searchPlaceholder="Search templates..."
        emptyMessage="No templates found in this project."
        renderItem={(template) => (
          <EntityCard
            title={template.name}
            description={template.description}
            onPress={() => navigate(`/templates/${encodeURIComponent(filenameFromPath(template.path))}`)}
          />
        )}
      />
    </div>
  );
}
