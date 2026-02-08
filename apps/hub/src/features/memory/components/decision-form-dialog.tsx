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
import type { DecisionEntry } from '@/lib/types';

interface DecisionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: DecisionEntry;
  onSubmit: (decision: string, reasoning: string, alternatives?: string[], context?: string) => Promise<void>;
}

export function DecisionFormDialog({ open, onOpenChange, initial, onSubmit }: DecisionFormDialogProps) {
  const { t } = useTranslation();
  const [decision, setDecision] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [alternatives, setAlternatives] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setDecision(initial?.decision ?? '');
      setReasoning(initial?.reasoning ?? '');
      setAlternatives(initial?.alternatives?.join('\n') ?? '');
      setContext(initial?.context ?? '');
    }
  }, [open, initial]);

  const handleSubmit = async () => {
    if (!decision.trim() || !reasoning.trim()) return;
    setLoading(true);
    try {
      const alts = alternatives.trim() ? alternatives.split('\n').filter(Boolean) : undefined;
      await onSubmit(decision.trim(), reasoning.trim(), alts, context.trim() || undefined);
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
            {initial ? t('page.memory.editDecision') : t('page.memory.addDecision')}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="decision">{t('page.memory.decisionLabel')}</Label>
            <Input id="decision" value={decision} onChange={(e) => setDecision(e.target.value)} placeholder={t('page.memory.decisionPlaceholder')} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reasoning">{t('page.memory.reasoningLabel')}</Label>
            <Textarea id="reasoning" value={reasoning} onChange={(e) => setReasoning(e.target.value)} rows={3} placeholder={t('page.memory.reasoningPlaceholder')} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="alternatives">{t('page.memory.alternativesLabel')}</Label>
            <Textarea id="alternatives" value={alternatives} onChange={(e) => setAlternatives(e.target.value)} rows={2} placeholder={t('page.memory.alternativesPlaceholder')} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="context">{t('page.memory.contextLabel')}</Label>
            <Input id="context" value={context} onChange={(e) => setContext(e.target.value)} placeholder={t('page.memory.contextPlaceholder')} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !decision.trim() || !reasoning.trim()}>
            {loading ? t('common.saving') : initial ? t('common.save') : t('common.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
