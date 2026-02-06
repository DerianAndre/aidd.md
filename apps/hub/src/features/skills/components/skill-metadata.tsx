import { Chip } from '@/components/ui/chip';
import type { SkillEntity } from '../lib/types';

const TIER_COLORS: Record<number, 'accent' | 'success' | 'warning' | 'default'> = {
  1: 'accent',
  2: 'success',
  3: 'warning',
};

const TIER_LABELS: Record<number, string> = {
  1: 'Tier 1 (HIGH)',
  2: 'Tier 2 (STANDARD)',
  3: 'Tier 3 (LOW)',
};

interface SkillMetadataProps {
  skill: SkillEntity;
}

export function SkillMetadata({ skill }: SkillMetadataProps) {
  const tierColor = TIER_COLORS[skill.tier] ?? 'default';
  const tierLabel = TIER_LABELS[skill.tier] ?? `Tier ${skill.tier}`;

  return (
    <div className="flex flex-wrap gap-2">
      {skill.tier > 0 && (
        <Chip size="sm" color={tierColor}>
          {tierLabel}
        </Chip>
      )}
      {skill.version && (
        <Chip size="sm" color="default">
          v{skill.version}
        </Chip>
      )}
      {skill.license && (
        <Chip size="sm" color="default">
          {skill.license}
        </Chip>
      )}
    </div>
  );
}
