import { TextField, Input, Select, Label, ListBox } from '@heroui/react';
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
    <div className="rounded-xl border border-default-200 bg-default-50 p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((field) => {
          if (field.type === 'select') {
            return (
              <div key={field.key}>
                <Select
                  isDisabled={disabled}
                  selectedKey={values[field.key] ?? null}
                  onSelectionChange={(key) => {
                    if (key) onChange(field.key, String(key));
                  }}
                >
                  <Label>{field.label}</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {field.options.map((opt) => (
                        <ListBox.Item key={opt.value} id={opt.value} textValue={opt.label}>
                          {opt.label}
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>
            );
          }

          return (
            <TextField
              key={field.key}
              value={values[field.key] ?? ''}
              isDisabled={disabled}
              isRequired={field.required}
              onChange={(v: string) => onChange(field.key, v)}
            >
              <Label>{field.label}</Label>
              <Input placeholder={field.placeholder} />
            </TextField>
          );
        })}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
