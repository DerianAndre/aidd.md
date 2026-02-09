import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';

interface TagFieldProps {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagField({ label, tags, onChange }: TagFieldProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput('');
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <Chip key={tag} size="sm" color="accent">
            <span className="flex items-center gap-1">
              {tag}
              <button
                type="button"
                className="ml-0.5 rounded hover:bg-accent"
                onClick={() => removeTag(tag)}
                aria-label={`${t('common.remove')} ${tag}`}
              >
                <X size={12} />
              </button>
            </span>
          </Chip>
        ))}
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="max-w-[160px] text-xs"
          placeholder={t('common.addTag')}
          aria-label={`${t('common.addTag')} ${label}`}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag();
            }
          }}
        />
      </div>
    </div>
  );
}
