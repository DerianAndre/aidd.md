import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
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
      className={`border bg-muted/50 transition-colors hover:border-primary ${onPress ? 'cursor-pointer' : ''}`}
    >
      <CardHeader className="flex-col items-start gap-1">
        <div className="flex w-full items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {chips && chips.length > 0 && (
            <div className="flex gap-1">
              {chips.map((chip) => (
                <Chip
                  key={chip.label}
                  size="sm"
                  color={chip.color ?? 'default'}
                >
                  {chip.label}
                </Chip>
              ))}
            </div>
          )}
        </div>
        {description && (
          <CardDescription className="text-xs">
            {truncate(description, 120)}
          </CardDescription>
        )}
      </CardHeader>
      {meta && (
        <CardFooter className="pt-0">
          <span className="text-[10px] text-muted-foreground">{meta}</span>
        </CardFooter>
      )}
    </Card>
  );
}
