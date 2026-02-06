import { Chip } from '@heroui/react';
import { BlockEditor } from '../../../components/editor';
import type { KnowledgeEntity } from '../lib/types';

interface KnowledgeContentProps {
  entity: KnowledgeEntity;
}

export function KnowledgeContent({ entity }: KnowledgeContentProps) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-lg font-semibold text-foreground">{entity.name}</h2>
      </div>

      {(entity.category || entity.maturity) && (
        <div className="mb-3 flex gap-2">
          {entity.category && (
            <Chip size="sm" variant="soft" color="default">{entity.category}</Chip>
          )}
          {entity.maturity && (
            <Chip
              size="sm"
              variant="soft"
              color={entity.maturity === 'stable' ? 'success' : entity.maturity === 'emerging' ? 'warning' : 'default'}
            >
              {entity.maturity}
            </Chip>
          )}
        </div>
      )}

      {entity.description && (
        <p className="mb-3 text-sm text-default-500">{entity.description}</p>
      )}

      <div className="rounded-xl border border-default-200">
        <BlockEditor initialMarkdown={entity.content} editable={false} />
      </div>
    </div>
  );
}
