import { parseFrontmatter, extractTitle } from '../../../lib/markdown';
import { normalizePath } from '../../../lib/utils';
import type { SkillEntity } from './types';

/**
 * Parse a SKILL.md file content into a SkillEntity.
 * Uses client-side parsing to handle multiline YAML values.
 */
export function parseSkillContent(
  content: string,
  filePath: string,
  dirPath: string,
): SkillEntity {
  const { frontmatter, body } = parseFrontmatter(content);
  const normalizedPath = normalizePath(filePath);
  const normalizedDir = normalizePath(dirPath);

  const name = frontmatter['name'] ?? extractTitle(body) ?? normalizedDir.split('/').pop() ?? '';
  const description = frontmatter['description'] ?? '';

  return {
    id: normalizedPath,
    name,
    description,
    path: normalizedPath,
    content: body,
    frontmatter,
    lastModified: new Date().toISOString(),
    tier: parseInt(frontmatter['tier'] ?? '2', 10),
    version: frontmatter['version'] ?? '',
    license: frontmatter['license'] ?? '',
    compatibility: frontmatter['compatibility'] ?? '',
    dirPath: normalizedDir,
  };
}
