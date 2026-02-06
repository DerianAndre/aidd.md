import type { BaseEntity } from '../../../stores/create-entity-store';

export interface SkillEntity extends BaseEntity {
  model: string;
  version: string;
  license: string;
  compatibility: string;
  /** Directory path containing SKILL.md and scripts */
  dirPath: string;
}
