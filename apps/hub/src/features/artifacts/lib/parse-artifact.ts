import type { ArtifactEntry, ArtifactStatus, ArtifactType } from '@/lib/types';
import { ARTIFACT_TYPES } from '@/lib/types';
import type { MarkdownEntity } from '@/lib/tauri';
import { extractTitle, extractDescription, parseFrontmatter } from '@/lib/markdown';
import { normalizePath } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Filename parsing
// ---------------------------------------------------------------------------

const DATE_RE = /^(\d{4}\.\d{2}\.\d{2})-(.+)$/;

/**
 * Parse an artifact filename into date, feature slug, and type.
 * Pattern: `<YYYY.MM.DD>-<feature>[-<type>].md`
 * Type suffix is optional — defaults to `plan`.
 */
export function parseArtifactFilename(
  filename: string,
): { date: string; feature: string; type: ArtifactType } | null {
  const base = filename.replace(/\.md$/i, '');
  const m = DATE_RE.exec(base);
  if (!m) return null;

  const date = m[1]!;
  const rest = m[2]!;

  // Check for known type suffix (longest match first isn't needed — all unique)
  for (const t of ARTIFACT_TYPES) {
    if (rest.endsWith(`-${t}`)) {
      return {
        date,
        feature: rest.slice(0, -(t.length + 1)),
        type: t,
      };
    }
  }

  // No known suffix → default to plan
  return { date, feature: rest, type: 'plan' };
}

// ---------------------------------------------------------------------------
// Status derivation
// ---------------------------------------------------------------------------

/** Derive artifact status from its file path. */
export function deriveStatus(path: string): ArtifactStatus {
  const normalized = normalizePath(path);
  if (normalized.includes('/done/') || normalized.includes('\\done\\')) {
    return 'done';
  }
  return 'active';
}

// ---------------------------------------------------------------------------
// Entity → ArtifactEntry conversion
// ---------------------------------------------------------------------------

/** Convert a MarkdownEntity from `listMarkdownEntities` to an ArtifactEntry. */
export function toArtifactEntry(entity: MarkdownEntity): ArtifactEntry | null {
  const filename = entity.name.endsWith('.md') ? entity.name : `${entity.name}.md`;
  const parsed = parseArtifactFilename(filename);
  if (!parsed) return null;

  const { frontmatter } = parseFrontmatter(entity.content);
  const title = extractTitle(entity.content) ?? parsed.feature;
  const description = extractDescription(entity.content) ?? '';

  return {
    path: entity.path,
    filename,
    date: parsed.date,
    feature: parsed.feature,
    type: parsed.type,
    status: deriveStatus(entity.path),
    title,
    description,
    frontmatter: { ...entity.frontmatter, ...frontmatter },
    lastModified: entity.last_modified,
  };
}

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
