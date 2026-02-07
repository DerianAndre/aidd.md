import { createEntityStore, defaultTransform } from '../../../stores/create-entity-store';
import { listMarkdownEntities } from '../../../lib/tauri';
import { CONTENT_PATHS, contentDir } from '../../../lib/constants';
import type { WorkflowEntity } from '../lib/types';

/** Workflows that coordinate multiple skills (formerly in orchestrators/) */
const ORCHESTRATOR_NAMES = new Set(['orchestrator', 'full-stack-feature']);

export const useWorkflowsStore = createEntityStore<WorkflowEntity>({
  basePath: CONTENT_PATHS.workflows,
  recursive: true,
  transform: () => null, // Not used — customFetch overrides
  customFetch: async (projectRoot: string) => {
    const basePath = contentDir(projectRoot, 'workflows');

    // All workflows are now at top-level (orchestrators flattened)
    const entries = await listMarkdownEntities(basePath, false);
    return entries.map((raw) => {
      const entity = defaultTransform(raw);
      return {
        ...entity,
        isOrchestrator: ORCHESTRATOR_NAMES.has(entity.name),
      };
    });
  },
});
