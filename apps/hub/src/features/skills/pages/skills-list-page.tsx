import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../../components/layout/page-header';
import { EntityList, EntityCard } from '../../../components/entity';
import { useSkillsStore } from '../stores/skills-store';
import { useProjectStore } from '../../../stores/project-store';

export function SkillsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const activeProject = useProjectStore((s) => s.activeProject);
  const { items, loading, stale, fetchAll } = useSkillsStore();

  useEffect(() => {
    if (activeProject?.path && stale) {
      void fetchAll(activeProject.path);
    }
  }, [activeProject?.path, stale, fetchAll]);

  return (
    <div>
      <PageHeader title={t('page.skills.title')} description={t('page.skills.description')} />
      <EntityList
        items={items}
        loading={loading}
        getKey={(s) => s.id}
        getSearchText={(s) => `${s.name} ${s.description} tier ${s.tier}`}
        searchPlaceholder={t('page.skills.searchPlaceholder')}
        emptyMessage={t('page.skills.noSkills')}
        renderItem={(skill) => (
          <EntityCard
            title={skill.name}
            description={skill.description}
            chips={skill.tier > 0 ? [{ label: `Tier ${skill.tier}`, color: skill.tier === 1 ? 'accent' as const : skill.tier === 2 ? 'success' as const : 'warning' as const }] : undefined}
            meta={skill.version ? `v${skill.version}` : undefined}
            onPress={() => {
              const slug = skill.dirPath.split('/').pop() ?? '';
              navigate(`/skills/${encodeURIComponent(slug)}`);
            }}
          />
        )}
      />
    </div>
  );
}
