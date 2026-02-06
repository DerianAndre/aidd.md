import { Card, Chip } from '@heroui/react';
import { truncate } from '../../lib/utils';

export interface EntityCardProps {
  title: string;
  description?: string;
  chips?: Array<{ label: string; color?: 'default' | 'accent' | 'success' | 'warning' | 'danger' }>;
  meta?: string;
  onPress?: () => void;
}

export function EntityCard({
  title,
  description,
  chips,
  meta,
  onPress,
}: EntityCardProps) {
  return (
    <Card
      onClick={onPress}
      role={onPress ? 'button' : undefined}
      tabIndex={onPress ? 0 : undefined}
      onKeyDown={onPress ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPress(); } } : undefined}
      className={`border border-default-200 bg-default-50 transition-colors hover:border-primary-300 ${onPress ? 'cursor-pointer' : ''}`}
    >
      <Card.Header className="flex-col items-start gap-1">
        <div className="flex w-full items-center justify-between gap-2">
          <Card.Title className="text-sm font-semibold">{title}</Card.Title>
          {chips && chips.length > 0 && (
            <div className="flex gap-1">
              {chips.map((chip) => (
                <Chip
                  key={chip.label}
                  size="sm"
                  variant="soft"
                  color={chip.color ?? 'default'}
                >
                  {chip.label}
                </Chip>
              ))}
            </div>
          )}
        </div>
        {description && (
          <Card.Description className="text-xs text-default-500">
            {truncate(description, 120)}
          </Card.Description>
        )}
      </Card.Header>
      {meta && (
        <Card.Footer className="pt-0">
          <span className="text-[10px] text-default-400">{meta}</span>
        </Card.Footer>
      )}
    </Card>
  );
}
