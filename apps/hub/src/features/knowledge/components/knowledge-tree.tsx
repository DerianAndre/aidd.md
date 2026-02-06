import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FileText } from 'lucide-react';
import type { TreeNode } from '../lib/types';

interface KnowledgeTreeProps {
  nodes: TreeNode[];
  selectedPath: string | null;
  onSelect: (node: TreeNode) => void;
}

export function KnowledgeTree({ nodes, selectedPath, onSelect }: KnowledgeTreeProps) {
  return (
    <div className="space-y-0.5 text-sm">
      {nodes.map((node) => (
        <TreeItem key={node.path} node={node} selectedPath={selectedPath} onSelect={onSelect} depth={0} />
      ))}
    </div>
  );
}

interface TreeItemProps {
  node: TreeNode;
  selectedPath: string | null;
  onSelect: (node: TreeNode) => void;
  depth: number;
}

function TreeItem({ node, selectedPath, onSelect, depth }: TreeItemProps) {
  const [expanded, setExpanded] = useState(depth < 1);
  const isSelected = selectedPath === node.path;

  const handleClick = () => {
    if (node.isDir) {
      setExpanded(!expanded);
    } else {
      onSelect(node);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-accent ${
          isSelected ? 'bg-primary/10 text-primary' : 'text-foreground'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {node.isDir ? (
          expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
        ) : (
          <span className="w-3.5" />
        )}
        {node.isDir ? (
          <Folder size={14} className="shrink-0 text-muted-foreground" />
        ) : (
          <FileText size={14} className="shrink-0 text-muted-foreground" />
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {node.isDir && expanded && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              selectedPath={selectedPath}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
