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

interface SelectFieldDef extends BaseField {
  type: 'select';
  options: Array<{ label: string; value: string }>;
}

export type FieldDefinition = TextFieldDef | SelectFieldDef;

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
            if (field.type === 'select') {
              return (
                <div key={field.key} className="space-y-1.5">
                  <Label>{field.label}</Label>
                  <Select
                    disabled={disabled}
                    value={values[field.key] ?? ''}
                    onValueChange={(value) => onChange(field.key, value)}
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

            return (
              <div key={field.key} className="space-y-1.5">
                <Label>{field.label}</Label>
                <Input
                  value={values[field.key] ?? ''}
                  disabled={disabled}
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
