import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { MistakeEntry } from '@/lib/types';

interface MistakeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: MistakeEntry;
  onSubmit: (error: string, rootCause: string, fix: string, prevention: string) => Promise<void>;
}

export function MistakeFormDialog({ open, onOpenChange, initial, onSubmit }: MistakeFormDialogProps) {
  const { t } = useTranslation();
  const [error, setError] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [fix, setFix] = useState('');
  const [prevention, setPrevention] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setError(initial?.error ?? '');
      setRootCause(initial?.rootCause ?? '');
      setFix(initial?.fix ?? '');
      setPrevention(initial?.prevention ?? '');
    }
  }, [open, initial]);

  const handleSubmit = async () => {
    if (!error.trim() || !rootCause.trim() || !fix.trim() || !prevention.trim()) return;
    setLoading(true);
    try {
      await onSubmit(error.trim(), rootCause.trim(), fix.trim(), prevention.trim());
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const isValid = error.trim() && rootCause.trim() && fix.trim() && prevention.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {initial ? t('page.memory.editMistake') : t('page.memory.addMistake')}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="error">{t('page.memory.errorLabel')}</Label>
            <Input id="error" value={error} onChange={(e) => setError(e.target.value)} placeholder={t('page.memory.errorPlaceholder')} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rootCause">{t('page.memory.rootCauseLabel')}</Label>
            <Textarea id="rootCause" value={rootCause} onChange={(e) => setRootCause(e.target.value)} rows={2} placeholder={t('page.memory.rootCausePlaceholder')} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fix">{t('page.memory.fixLabel')}</Label>
            <Textarea id="fix" value={fix} onChange={(e) => setFix(e.target.value)} rows={2} placeholder={t('page.memory.fixPlaceholder')} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prevention">{t('page.memory.preventionLabel')}</Label>
            <Textarea id="prevention" value={prevention} onChange={(e) => setPrevention(e.target.value)} rows={2} placeholder={t('page.memory.preventionPlaceholder')} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !isValid}>
            {loading ? t('common.saving') : initial ? t('common.save') : t('common.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
