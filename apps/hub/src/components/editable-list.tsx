import { useState, useCallback } from 'react';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// ---------------------------------------------------------------------------
// EditableList — flat string arrays (facts, concepts, files, tasks)
// ---------------------------------------------------------------------------

interface EditableListProps {
  label?: string;
  items: string[];
  onChange: (items: string[]) => void;
  editing: boolean;
  placeholder?: string;
}

export function EditableList({ label, items, onChange, editing, placeholder }: EditableListProps) {
  const [draft, setDraft] = useState('');

  const add = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...items, trimmed]);
    setDraft('');
  }, [draft, items, onChange]);

  const remove = useCallback((index: number) => {
    onChange(items.filter((_, i) => i !== index));
  }, [items, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      add();
    }
    if (e.key === 'Backspace' && draft === '' && items.length > 0) {
      remove(items.length - 1);
    }
  }, [add, draft, items, remove]);

  if (!editing) {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1.5">
        {label && <Label className="text-muted-foreground">{label}</Label>}
        <div className="flex flex-wrap gap-1">
          {items.map((item, i) => (
            <Badge key={i} variant="secondary">{item}</Badge>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="flex flex-wrap gap-1">
        {items.map((item, i) => (
          <Badge key={i} variant="secondary" className="gap-1 pr-1">
            {item}
            <button
              type="button"
              className="ml-0.5 cursor-pointer rounded-full p-0.5 transition-colors hover:bg-muted-foreground/20"
              onClick={() => remove(i)}
              aria-label={`Remove ${item}`}
            >
              <X size={12} />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'Type and press Enter'}
          className="flex-1"
        />
        <Button type="button" size="sm" variant="outline" onClick={add} disabled={!draft.trim()}>
          <Plus size={14} />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EditableStructuredList — arrays of {key1, key2} objects (decisions, errors)
// ---------------------------------------------------------------------------

interface StructuredItem {
  [key: string]: string;
}

interface FieldConfig {
  key: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
}

interface EditableStructuredListProps {
  label?: string;
  items: StructuredItem[];
  onChange: (items: StructuredItem[]) => void;
  editing: boolean;
  fields: FieldConfig[];
}

export function EditableStructuredList({
  label,
  items,
  onChange,
  editing,
  fields,
}: EditableStructuredListProps) {
  const add = useCallback(() => {
    const empty: StructuredItem = {};
    for (const f of fields) empty[f.key] = '';
    onChange([...items, empty]);
  }, [items, onChange, fields]);

  const remove = useCallback((index: number) => {
    onChange(items.filter((_, i) => i !== index));
  }, [items, onChange]);

  const update = useCallback((index: number, key: string, value: string) => {
    const next = items.map((item, i) =>
      i === index ? { ...item, [key]: value } : item,
    );
    onChange(next);
  }, [items, onChange]);

  if (!editing) {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1.5">
        {label && <Label className="text-muted-foreground">{label}</Label>}
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="text-xs text-muted-foreground">
              {fields.map((f, fi) => (
                <span key={f.key}>
                  {fi === 0 ? (
                    <span className="font-medium text-foreground">{item[f.key]}</span>
                  ) : (
                    <>
                      <br />
                      <span className="text-muted-foreground">{item[f.key]}</span>
                    </>
                  )}
                </span>
              ))}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {label && <Label>{label}</Label>}
      {items.map((item, i) => (
        <div key={i} className="relative rounded-md border border-border p-3">
          <button
            type="button"
            className="absolute right-2 top-2 cursor-pointer rounded-full p-0.5 text-destructive transition-colors hover:bg-destructive/10"
            onClick={() => remove(i)}
            aria-label="Remove item"
          >
            <X size={14} />
          </button>
          <div className="grid gap-2 pr-6">
            {fields.map((f) => (
              <div key={f.key}>
                <Label className="text-xs text-muted-foreground">{f.label}</Label>
                {f.multiline ? (
                  <Textarea
                    value={item[f.key] ?? ''}
                    onChange={(e) => update(i, f.key, e.target.value)}
                    placeholder={f.placeholder}
                    rows={2}
                  />
                ) : (
                  <Input
                    value={item[f.key] ?? ''}
                    onChange={(e) => update(i, f.key, e.target.value)}
                    placeholder={f.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={add} className="w-full">
        <Plus size={14} /> Add
      </Button>
    </div>
  );
}
