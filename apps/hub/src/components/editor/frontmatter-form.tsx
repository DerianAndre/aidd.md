import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Field definition types
// ---------------------------------------------------------------------------

interface BaseField {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}

interface TextFieldDef extends BaseField {
  type: 'text';
}

interface NumberFieldDef extends BaseField {
  type: 'number';
  min?: number;
  max?: number;
}

interface SelectFieldDef extends BaseField {
  type: 'select';
  options: Array<{ label: string; value: string }>;
}

interface SwitchFieldDef extends BaseField {
  type: 'switch';
}

interface ReadonlyFieldDef extends BaseField {
  type: 'readonly';
}

export type FieldDefinition =
  | TextFieldDef
  | NumberFieldDef
  | SelectFieldDef
  | SwitchFieldDef
  | ReadonlyFieldDef;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface FrontmatterFormProps {
  fields: FieldDefinition[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  disabled?: boolean;
  children?: ReactNode;
}

export function FrontmatterForm({
  fields,
  values,
  onChange,
  disabled = false,
  children,
}: FrontmatterFormProps) {
  return (
    <Card>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((field) => {
            const value = values[field.key] ?? '';

            // Readonly — always renders as plain text
            if (field.type === 'readonly') {
              return (
                <div key={field.key} className="space-y-1.5">
                  <Label className="text-muted-foreground">{field.label}</Label>
                  <p className="text-sm font-medium text-foreground">{value || '—'}</p>
                </div>
              );
            }

            // Disabled mode — render all editable fields as static text
            if (disabled) {
              if (field.type === 'switch') {
                return (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-muted-foreground">{field.label}</Label>
                    <p className="text-sm font-medium text-foreground">
                      {value === 'true' ? 'Yes' : 'No'}
                    </p>
                  </div>
                );
              }
              if (field.type === 'select') {
                const opt = field.options.find((o) => o.value === value);
                return (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-muted-foreground">{field.label}</Label>
                    <p className="text-sm font-medium text-foreground">{(opt?.label ?? value) || '—'}</p>
                  </div>
                );
              }
              return (
                <div key={field.key} className="space-y-1.5">
                  <Label className="text-muted-foreground">{field.label}</Label>
                  <p className="text-sm font-medium text-foreground">{value || '—'}</p>
                </div>
              );
            }

            // Switch
            if (field.type === 'switch') {
              return (
                <div key={field.key} className="flex items-center justify-between gap-2 sm:col-span-1">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Switch
                    id={field.key}
                    checked={value === 'true'}
                    onCheckedChange={(v) => onChange(field.key, String(v))}
                  />
                </div>
              );
            }

            // Number
            if (field.type === 'number') {
              return (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Input
                    id={field.key}
                    type="number"
                    value={value}
                    min={field.min}
                    max={field.max}
                    required={field.required}
                    placeholder={field.placeholder}
                    onChange={(e) => onChange(field.key, e.target.value)}
                  />
                </div>
              );
            }

            // Select
            if (field.type === 'select') {
              return (
                <div key={field.key} className="space-y-1.5">
                  <Label>{field.label}</Label>
                  <Select
                    value={value}
                    onValueChange={(v) => onChange(field.key, v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            }

            // Text (default)
            return (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  value={value}
                  required={field.required}
                  placeholder={field.placeholder}
                  onChange={(e) => onChange(field.key, e.target.value)}
                />
              </div>
            );
          })}
        </div>
        {children && <div className="mt-4">{children}</div>}
      </CardContent>
    </Card>
  );
}
