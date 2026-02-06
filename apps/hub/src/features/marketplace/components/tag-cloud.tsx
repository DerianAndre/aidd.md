import { Chip } from '@/components/ui/chip';

export interface TagCloudProps {
  tags: string[];
  /** Currently active/selected tags */
  activeTags?: string[];
  /** Called when a tag is clicked */
  onTagClick?: (tag: string) => void;
}

export function TagCloud({ tags, activeTags = [], onTagClick }: TagCloudProps) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const isActive = activeTags.includes(tag);
        return (
          <Chip
            key={tag}
            size="sm"
            color={isActive ? 'accent' : 'default'}
            className={onTagClick ? 'cursor-pointer' : undefined}
            onClick={onTagClick ? () => onTagClick(tag) : undefined}
          >
            {tag}
          </Chip>
        );
      })}
    </div>
  );
}
