import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../../components/layout/page-header';
import { EntityList, EntityCard } from '../../../components/entity';
import { useWorkflowsStore } from '../stores/workflows-store';
import { useProjectStore } from '../../../stores/project-store';
import { filenameFromPath } from '../../../lib/utils';

export function WorkflowsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const activeProject = useProjectStore((s) => s.activeProject);
  const { items, loading, stale, fetchAll } = useWorkflowsStore();

  useEffect(() => {
    if (activeProject?.path && stale) {
      void fetchAll(activeProject.path);
    }
  }, [activeProject?.path, stale, fetchAll]);

  const workflows = items.filter((w) => !w.isOrchestrator);
  const orchestrators = items.filter((w) => w.isOrchestrator);

  return (
    <div>
      <PageHeader title={t('page.workflows.title')} description={t('page.workflows.description')} />

      {/* Workflows section */}
      {!loading && workflows.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            {t('page.workflows.workflows', { count: workflows.length })}
          </h2>
          <EntityList
            items={workflows}
            loading={false}
            getKey={(w) => w.id}
            getSearchText={(w) => `${w.name} ${w.description}`}
            searchPlaceholder={t('page.workflows.searchWorkflows')}
            renderItem={(w) => (
              <EntityCard
                title={w.name}
                description={w.description}
                onPress={() => navigate(`/workflows/${encodeURIComponent(filenameFromPath(w.path))}`)}
              />
            )}
          />
        </section>
      )}

      {/* Orchestrators section */}
      {!loading && orchestrators.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            {t('page.workflows.orchestrators', { count: orchestrators.length })}
          </h2>
          <EntityList
            items={orchestrators}
            loading={false}
            getKey={(o) => o.id}
            getSearchText={(o) => `${o.name} ${o.description}`}
            searchPlaceholder={t('page.workflows.searchOrchestrators')}
            renderItem={(o) => (
              <EntityCard
                title={o.name}
                description={o.description}
                chips={[{ label: t('page.agents.orchestrator'), color: 'accent' }]}
                onPress={() => navigate(`/workflows/${encodeURIComponent(filenameFromPath(o.path))}`)}
              />
            )}
          />
        </section>
      )}

      {loading && (
        <EntityList
          items={[]}
          loading={true}
          getKey={() => ''}
          getSearchText={() => ''}
          renderItem={() => null}
        />
      )}
    </div>
  );
}
