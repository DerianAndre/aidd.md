import { Card, Button, Chip } from '@heroui/react';
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
  { key: 'spec', label: 'Spec' },
  { key: 'aidd_dir', label: '.aidd/' },
  { key: 'memory', label: 'Memory' },
];

export function ProjectCard({ project, isActive, onSetActive, onRemove }: ProjectCardProps) {
  return (
    <Card className={isActive ? 'border-2 border-primary' : ''}>
      <Card.Header>
        <div className="flex w-full items-start justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen size={18} className="shrink-0 text-default-500" />
            <div>
              <Card.Title>{project.name}</Card.Title>
              <Card.Description className="break-all text-xs">
                {project.path}
              </Card.Description>
            </div>
          </div>
          {isActive && (
            <Chip size="sm" variant="soft" color="success">Active</Chip>
          )}
        </div>
      </Card.Header>
      <Card.Content>
        <div className="flex flex-wrap gap-1">
          {MARKER_LABELS.map(({ key, label }) => (
            <Chip
              key={key}
              size="sm"
              variant="soft"
              color={project.markers[key] ? 'success' : 'default'}
            >
              <span className="flex items-center gap-0.5">
                {project.markers[key] ? <Check size={12} /> : <X size={12} />}
                {label}
              </span>
            </Chip>
          ))}
        </div>
      </Card.Content>
      <Card.Footer className="flex justify-between">
        {!isActive ? (
          <Button size="sm" variant="primary" onPress={onSetActive}>
            Set Active
          </Button>
        ) : (
          <span className="text-xs text-success">Currently active</span>
        )}
        <Button
          size="sm"
          variant="ghost"
          onPress={onRemove}
          className="text-danger"
        >
          <Trash2 size={14} />
          Remove
        </Button>
      </Card.Footer>
    </Card>
  );
}
