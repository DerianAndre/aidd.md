import type { KnowledgeEntity, TreeNode } from './types';

/**
 * Build a nested tree structure from a flat list of knowledge entries.
 * Each entry's relativePath is split by '/' to determine its position.
 */
export function buildTree(entities: KnowledgeEntity[]): TreeNode[] {
  const root: TreeNode = { name: 'root', path: '', isDir: true, children: [] };

  for (const entity of entities) {
    const parts = entity.relativePath.split('/').filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      const isLast = i === parts.length - 1;

      let child = current.children.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          isDir: !isLast,
          children: [],
          entity: isLast ? entity : undefined,
        };
        current.children.push(child);
      }

      if (isLast && !child.entity) {
        child.entity = entity;
        child.isDir = false;
      }

      current = child;
    }
  }

  // Sort: directories first, then alphabetically
  sortTree(root);
  return root.children;
}

function sortTree(node: TreeNode) {
  node.children.sort((a, b) => {
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;
    return a.name.localeCompare(b.name);
  });
  for (const child of node.children) {
    sortTree(child);
  }
}
