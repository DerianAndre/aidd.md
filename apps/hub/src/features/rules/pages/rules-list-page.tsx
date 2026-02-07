import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../../components/layout/page-header';
import { EntityList, EntityCard } from '../../../components/entity';
import { useRulesStore } from '../stores/rules-store';
import { useProjectStore } from '../../../stores/project-store';
import { filenameFromPath } from '../../../lib/utils';

export function RulesListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const activeProject = useProjectStore((s) => s.activeProject);
  const { items, loading, stale, fetchAll } = useRulesStore();

  useEffect(() => {
    if (activeProject?.path && stale) {
      void fetchAll(activeProject.path);
    }
  }, [activeProject?.path, stale, fetchAll]);

  return (
    <div>
      <PageHeader title={t('page.rules.title')} description={t('page.rules.description')} />
      <EntityList
        items={items}
        loading={loading}
        getKey={(r) => r.id}
        getSearchText={(r) => `${r.name} ${r.description}`}
        searchPlaceholder={t('page.rules.searchPlaceholder')}
        emptyMessage={t('page.rules.noRules')}
        renderItem={(rule) => (
          <EntityCard
            title={rule.name}
            description={rule.description}
            onPress={() => navigate(`/rules/${encodeURIComponent(filenameFromPath(rule.path))}`)}
          />
        )}
      />
    </div>
  );
}
