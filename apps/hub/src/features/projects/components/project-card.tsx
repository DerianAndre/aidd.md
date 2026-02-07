import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Check, X, Trash2, FolderOpen, RefreshCw } from 'lucide-react';
import type { ProjectInfo } from '../../../lib/tauri';
import { MARKER_KEYS } from '../../../lib/constants';

interface ProjectCardProps {
  project: ProjectInfo;
  isActive: boolean;
  onSetActive: () => void;
  onRemove: () => void;
  onRefresh: () => void;
  refreshing?: boolean;
}

export function ProjectCard({
  project,
  isActive,
  onSetActive,
  onRemove,
  onRefresh,
  refreshing,
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
          {MARKER_KEYS.map(({ key, label }) => {
            const active = project.markers[key as keyof ProjectInfo['markers']];
            return (
              <Chip
                key={key}
                size="sm"
                color={active ? 'success' : 'default'}
              >
                <span className="flex items-center gap-0.5">
                  {active ? <Check size={12} /> : <X size={12} />}
                  {label}
                </span>
              </Chip>
            );
          })}
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
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label={t('common.refresh')}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onRemove}
            className="text-danger"
          >
            <Trash2 size={14} />
            {t('common.remove')}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
