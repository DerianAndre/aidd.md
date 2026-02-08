import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseEditableEntityOptions<T> {
  initial: T;
  onSave: (updated: T) => Promise<void>;
}

export interface UseEditableEntityResult<T> {
  draft: T;
  setField: <K extends keyof T>(key: K, value: T[K]) => void;
  editing: boolean;
  setEditing: (v: boolean) => void;
  save: () => Promise<void>;
  cancel: () => void;
  saving: boolean;
  dirty: boolean;
}

export function useEditableEntity<T extends Record<string, unknown>>({
  initial,
  onSave,
}: UseEditableEntityOptions<T>): UseEditableEntityResult<T> {
  const [draft, setDraft] = useState<T>({ ...initial });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const snapshotRef = useRef<T>(initial);

  // Sync when initial changes externally (e.g. after refetch)
  useEffect(() => {
    snapshotRef.current = initial;
    if (!editing) {
      setDraft({ ...initial });
    }
  }, [initial, editing]);

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const cancel = useCallback(() => {
    setDraft({ ...snapshotRef.current });
    setEditing(false);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(draft);
      snapshotRef.current = { ...draft };
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [draft, onSave]);

  // Shallow compare for dirty detection
  const dirty = Object.keys(draft).some((key) => {
    const draftVal = draft[key];
    const snapVal = snapshotRef.current[key];
    if (Array.isArray(draftVal) && Array.isArray(snapVal)) {
      return JSON.stringify(draftVal) !== JSON.stringify(snapVal);
    }
    return draftVal !== snapVal;
  });

  return { draft, setField, editing, setEditing, save, cancel, saving, dirty };
}
