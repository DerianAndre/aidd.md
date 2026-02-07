import { createEntityStore, defaultTransform } from '../../../stores/create-entity-store';
import type { TemplateEntity } from '../lib/types';

export const useTemplatesStore = createEntityStore<TemplateEntity>({
  basePath: 'content/templates',
  recursive: false,
  transform: (raw) => defaultTransform(raw) as TemplateEntity,
});
