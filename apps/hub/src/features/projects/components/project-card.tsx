import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Check, X, Trash2, FolderOpen } from 'lucide-react';
import type { ProjectInfo } from '../../../lib/tauri';

interface ProjectCardProps {
  project: ProjectInfo;
  isActive: boolean;
  onSetActive: () => void;
  onRemove: () => void;
}

const MARKER_LABELS: { key: keyof ProjectInfo['markers']; label: string }[] = [
  { key: 'agents_md', label: 'AGENTS.md' },
  { key: 'rules', label: 'Rules' },
  { key: 'skills', label: 'Skills' },
  { key: 'workflows', label: 'Workflows' },
  { key: 'templates', label: 'Templates' },
  { key: 'knowledge', label: 'Knowledge' },
  { key: 'specs', label: 'Specs' },
  { key: 'aidd_dir', label: '.aidd/' },
  { key: 'memory', label: 'Memory' },
];

export function ProjectCard({
  project,
  isActive,
  onSetActive,
  onRemove,
}: ProjectCardProps) {
  const { t } = useTranslation();
  return (
    <Card className={isActive ? 'border-2 border-primary' : ''}>
      <CardHeader>
        <div className="flex w-full items-start justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen size={18} className="shrink-0 text-muted-foreground" />
            <div>
              <CardTitle>{project.name}</CardTitle>
              <CardDescription className="break-all text-xs">
                {project.path}
              </CardDescription>
            </div>
          </div>
          {isActive && (
            <Chip size="sm" color="success">
              {t('page.projects.active')}
            </Chip>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1">
          {MARKER_LABELS.map(({ key, label }) => (
            <Chip
              key={key}
              size="sm"
              color={project.markers[key] ? 'success' : 'default'}
            >
              <span className="flex items-center gap-0.5">
                {project.markers[key] ? <Check size={12} /> : <X size={12} />}
                {label}
              </span>
            </Chip>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        {!isActive ? (
          <Button size="sm" variant="default" onClick={onSetActive}>
            {t('page.projects.setActive')}
          </Button>
        ) : (
          <span className="text-xs text-success">{t('page.projects.currentlyActive')}</span>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={onRemove}
          className="text-danger"
        >
          <Trash2 size={14} />
          {t('common.remove')}
        </Button>
      </CardFooter>
    </Card>
  );
}
