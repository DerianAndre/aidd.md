import { createEntityStore, defaultTransform } from '../../../stores/create-entity-store';
import { normalizePath } from '../../../lib/utils';
import { parseFrontmatter } from '../../../lib/markdown';
import { readFile, listMarkdownEntities } from '../../../lib/tauri';
import type { KnowledgeEntity } from '../lib/types';

export const useKnowledgeStore = createEntityStore<KnowledgeEntity>({
  basePath: 'knowledge',
  recursive: true,
  transform: () => null, // Not used — customFetch overrides
  customFetch: async (projectRoot: string) => {
    const basePath = `${normalizePath(projectRoot)}/knowledge`;
    const raws = await listMarkdownEntities(basePath, true);
    const entities: KnowledgeEntity[] = [];

    for (const raw of raws) {
      const base = defaultTransform(raw);
      const normalizedBase = normalizePath(basePath);
      const relativePath = normalizePath(raw.path)
        .replace(normalizedBase + '/', '')
        .replace(/\.md$/, '');

      // Client-side parse for richer frontmatter
      let category = '';
      let maturity = '';
      try {
        const content = await readFile(raw.path);
        const { frontmatter } = parseFrontmatter(content);
        category = frontmatter['category'] ?? '';
        maturity = frontmatter['maturity'] ?? '';
      } catch {
        // Use Rust-parsed frontmatter as fallback
        category = String(raw.frontmatter?.['category'] ?? '');
        maturity = String(raw.frontmatter?.['maturity'] ?? '');
      }

      entities.push({
        ...base,
        category,
        maturity,
        relativePath,
      });
    }

    return entities;
  },
});
