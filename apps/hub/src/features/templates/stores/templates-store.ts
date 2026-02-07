import { createEntityStore, defaultTransform } from '../../../stores/create-entity-store';
import { CONTENT_PATHS } from '../../../lib/constants';
import type { TemplateEntity } from '../lib/types';

export const useTemplatesStore = createEntityStore<TemplateEntity>({
  basePath: CONTENT_PATHS.templates,
  recursive: false,
  transform: (raw) => defaultTransform(raw) as TemplateEntity,
});
