import { Chip } from '@heroui/react';
import type { SkillEntity } from '../lib/types';

const MODEL_COLORS: Record<string, 'accent' | 'success' | 'warning' | 'default'> = {
  'claude-opus-4-6': 'accent',
  'claude-sonnet-4-5-20250929': 'success',
  'claude-haiku-4-5-20251001': 'warning',
};

interface SkillMetadataProps {
  skill: SkillEntity;
}

export function SkillMetadata({ skill }: SkillMetadataProps) {
  const modelColor = MODEL_COLORS[skill.model] ?? 'default';
  const modelLabel = skill.model
    .replace('claude-', '')
    .replace(/-\d{8}$/, '')
    .replace(/-/g, ' ');

  return (
    <div className="flex flex-wrap gap-2">
      {skill.model && (
        <Chip size="sm" variant="soft" color={modelColor}>
          {modelLabel}
        </Chip>
      )}
      {skill.version && (
        <Chip size="sm" variant="soft" color="default">
          v{skill.version}
        </Chip>
      )}
      {skill.license && (
        <Chip size="sm" variant="soft" color="default">
          {skill.license}
        </Chip>
      )}
    </div>
  );
}
