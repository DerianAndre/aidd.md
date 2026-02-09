import { useState, useRef, useEffect, useOptimistic } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineEditFieldProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export function InlineEditField({ value, onSave, placeholder = '', maxLength, className }: InlineEditFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [optimisticValue, setOptimisticValue] = useOptimistic(value);
  const [isSaving, setIsSaving] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync editValue when value changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (editValue === value || !editValue.trim()) {
      setIsEditing(false);
      setEditValue(value);
      return;
    }

    setIsSaving(true);
    setOptimisticValue(editValue);

    try {
      await onSave(editValue.trim());
      setIsEditing(false);
    } catch (error) {
      // Revert to original value on error
      setEditValue(value);
      setOptimisticValue(value);
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isSaving) {
      void handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isEditing) {
    return (
      <span
        onClick={() => setIsEditing(true)}
        className={cn(
          'inline-flex items-center gap-1 cursor-pointer hover:opacity-70 transition-opacity',
          className
        )}
        title="Click to edit"
      >
        {optimisticValue || placeholder}
        {isSaving && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      maxLength={maxLength}
      disabled={isSaving}
      className={cn(
        'inline-flex items-center bg-background border border-primary rounded px-2 py-0.5',
        'text-sm focus:outline-none focus:ring-1 focus:ring-primary',
        'disabled:opacity-50 disabled:cursor-wait',
        className
      )}
    />
  );
}
