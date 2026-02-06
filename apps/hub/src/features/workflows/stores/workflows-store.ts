import { createEntityStore, defaultTransform } from '../../../stores/create-entity-store';
import { listMarkdownEntities } from '../../../lib/tauri';
import { normalizePath } from '../../../lib/utils';
import type { WorkflowEntity } from '../lib/types';

export const useWorkflowsStore = createEntityStore<WorkflowEntity>({
  basePath: 'workflows',
  recursive: true,
  transform: () => null, // Not used — customFetch overrides
  customFetch: async (projectRoot: string) => {
    const basePath = `${normalizePath(projectRoot)}/workflows`;

    // Get top-level workflows
    const topLevel = await listMarkdownEntities(basePath, false);
    const workflows: WorkflowEntity[] = topLevel.map((raw) => ({
      ...defaultTransform(raw),
      isOrchestrator: false,
    }));

    // Get orchestrators from subdirectory
    try {
      const orchestrators = await listMarkdownEntities(`${basePath}/orchestrators`, false);
      for (const raw of orchestrators) {
        workflows.push({
          ...defaultTransform(raw),
          isOrchestrator: true,
        });
      }
    } catch {
      // orchestrators/ may not exist
    }

    return workflows;
  },
});
