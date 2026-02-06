import type { BaseEntity } from '../../../stores/create-entity-store';

export interface KnowledgeEntity extends BaseEntity {
  category: string;
  maturity: string;
  /** Relative path from knowledge/ root for tree construction. */
  relativePath: string;
}

export interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
  entity?: KnowledgeEntity;
}
