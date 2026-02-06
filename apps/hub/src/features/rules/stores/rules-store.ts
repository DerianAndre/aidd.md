import { createEntityStore, defaultTransform } from '../../../stores/create-entity-store';
import type { RuleEntity } from '../lib/types';

export const useRulesStore = createEntityStore<RuleEntity>({
  basePath: 'rules',
  recursive: false,
  transform: (raw) => defaultTransform(raw) as RuleEntity,
});
