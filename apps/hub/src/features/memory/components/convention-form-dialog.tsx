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
import type { ConventionEntry } from '@/lib/types';

interface ConventionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ConventionEntry;
  onSubmit: (convention: string, example: string, rationale?: string) => Promise<void>;
}

export function ConventionFormDialog({ open, onOpenChange, initial, onSubmit }: ConventionFormDialogProps) {
  const { t } = useTranslation();
  const [convention, setConvention] = useState('');
  const [example, setExample] = useState('');
  const [rationale, setRationale] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setConvention(initial?.convention ?? '');
      setExample(initial?.example ?? '');
      setRationale(initial?.rationale ?? '');
    }
  }, [open, initial]);

  const handleSubmit = async () => {
    if (!convention.trim() || !example.trim()) return;
    setLoading(true);
    try {
      await onSubmit(convention.trim(), example.trim(), rationale.trim() || undefined);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {initial ? t('page.memory.editConvention') : t('page.memory.addConvention')}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="convention">{t('page.memory.conventionLabel')}</Label>
            <Input id="convention" value={convention} onChange={(e) => setConvention(e.target.value)} placeholder={t('page.memory.conventionPlaceholder')} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="example">{t('page.memory.exampleLabel')}</Label>
            <Textarea id="example" value={example} onChange={(e) => setExample(e.target.value)} rows={3} placeholder={t('page.memory.examplePlaceholder')} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rationale">{t('page.memory.rationaleLabel')}</Label>
            <Textarea id="rationale" value={rationale} onChange={(e) => setRationale(e.target.value)} rows={2} placeholder={t('page.memory.rationalePlaceholder')} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !convention.trim() || !example.trim()}>
            {loading ? t('common.saving') : initial ? t('common.save') : t('common.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
