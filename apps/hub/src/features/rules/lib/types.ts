import type { BaseEntity } from '../../../stores/create-entity-store';

export interface RuleEntity extends BaseEntity {
  /** No extra fields — rules are simple markdown files. */
}
