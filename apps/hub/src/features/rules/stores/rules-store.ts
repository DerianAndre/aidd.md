import { createEntityStore, defaultTransform } from '../../../stores/create-entity-store';
import { CONTENT_PATHS } from '../../../lib/constants';
import type { RuleEntity } from '../lib/types';

export const useRulesStore = createEntityStore<RuleEntity>({
  basePath: CONTENT_PATHS.rules,
  recursive: false,
  transform: (raw) => defaultTransform(raw) as RuleEntity,
});
