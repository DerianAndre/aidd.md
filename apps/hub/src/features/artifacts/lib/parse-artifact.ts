import type { ArtifactEntry, ArtifactType } from '@/lib/types';

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

/** Group artifacts by feature slug. */
export function groupByFeature(
  artifacts: ArtifactEntry[],
): Map<string, ArtifactEntry[]> {
  const map = new Map<string, ArtifactEntry[]>();
  for (const a of artifacts) {
    const group = map.get(a.feature) ?? [];
    group.push(a);
    map.set(a.feature, group);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Type → chip color mapping
// ---------------------------------------------------------------------------

export const TYPE_COLORS: Record<ArtifactType, string> = {
  plan: 'accent',
  brainstorm: 'info',
  research: 'info',
  adr: 'success',
  diagram: 'warning',
  issue: 'danger',
  spec: 'accent',
  checklist: 'success',
  retro: 'default',
};
