import { createEntityStore } from '../../../stores/create-entity-store';
import { listDirectory, readFile } from '../../../lib/tauri';
import { CONTENT_PATHS, contentDir } from '../../../lib/constants';
import { normalizePath } from '../../../lib/utils';
import { parseSkillContent } from '../lib/parse-skill';
import type { SkillEntity } from '../lib/types';

export const useSkillsStore = createEntityStore<SkillEntity>({
  basePath: CONTENT_PATHS.skills,
  recursive: false,
  transform: () => null, // Not used — customFetch overrides
  customFetch: async (projectRoot: string) => {
    const basePath = contentDir(projectRoot, 'skills');
    const entries = await listDirectory(basePath);
    const skills: SkillEntity[] = [];

    for (const entry of entries) {
      if (!entry.is_dir) continue;

      const skillFile = `${normalizePath(entry.path)}/SKILL.md`;
      try {
        const content = await readFile(skillFile);
        skills.push(parseSkillContent(content, skillFile, entry.path));
      } catch {
        // Skip directories without SKILL.md
      }
    }

    return skills;
  },
});
