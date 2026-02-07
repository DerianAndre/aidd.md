import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../../components/layout/page-header';
import { EntityList, EntityCard } from '../../../components/entity';
import { useTemplatesStore } from '../stores/templates-store';
import { useProjectStore } from '../../../stores/project-store';
import { filenameFromPath } from '../../../lib/utils';

export function TemplatesListPage() {
  const { t } = useTranslation();
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
      <PageHeader title={t('page.templates.title')} description={t('page.templates.description')} />
      <EntityList
        items={items}
        loading={loading}
        getKey={(tmpl) => tmpl.id}
        getSearchText={(tmpl) => `${tmpl.name} ${tmpl.description}`}
        searchPlaceholder={t('page.templates.searchPlaceholder')}
        emptyMessage={t('page.templates.noTemplates')}
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
