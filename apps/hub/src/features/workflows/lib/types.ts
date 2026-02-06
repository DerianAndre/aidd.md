import type { BaseEntity } from '../../../stores/create-entity-store';

export interface WorkflowEntity extends BaseEntity {
  isOrchestrator: boolean;
}
