import type { BaseEntity } from '../../../stores/create-entity-store';

export interface TemplateEntity extends BaseEntity {
  /** No extra fields — templates are simple markdown files. */
}
