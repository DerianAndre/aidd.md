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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { EvolutionCandidate, EvolutionType } from '@/lib/types';

const EVOLUTION_TYPES: EvolutionType[] = [
  'routing_weight', 'skill_combo', 'rule_elevation', 'compound_workflow',
  'tkb_promotion', 'new_convention', 'model_recommendation',
];

interface EvolutionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: EvolutionCandidate;
  onSubmit: (evoType: EvolutionType, title: string, confidence: number, description: string, suggestedAction: string, modelScope?: string) => Promise<void>;
}

export function EvolutionFormDialog({ open, onOpenChange, initial, onSubmit }: EvolutionFormDialogProps) {
  const { t } = useTranslation();
  const [evoType, setEvoType] = useState<EvolutionType>('new_convention');
  const [title, setTitle] = useState('');
  const [confidence, setConfidence] = useState('50');
  const [description, setDescription] = useState('');
  const [suggestedAction, setSuggestedAction] = useState('');
  const [modelScope, setModelScope] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setEvoType(initial?.type ?? 'new_convention');
      setTitle(initial?.title ?? '');
      setConfidence(String(initial?.confidence ?? 50));
      setDescription(initial?.description ?? '');
      setSuggestedAction(initial?.suggestedAction ?? '');
      setModelScope(initial?.modelScope ?? '');
    }
  }, [open, initial]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const conf = Math.min(100, Math.max(0, Number(confidence) || 50));
      await onSubmit(evoType, title.trim(), conf, description.trim(), suggestedAction.trim(), modelScope.trim() || undefined);
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
            {initial ? t('page.evolution.editCandidate') : t('page.evolution.addCandidate')}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="evoType">{t('page.evolution.typeLabel')}</Label>
            <Select value={evoType} onValueChange={(v) => setEvoType(v as EvolutionType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVOLUTION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="title">{t('page.evolution.titleLabel')}</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('page.evolution.titlePlaceholder')} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confidence">{t('page.evolution.confidenceLabel')}</Label>
            <Input id="confidence" type="number" min={0} max={100} value={confidence} onChange={(e) => setConfidence(e.target.value)} placeholder="0-100" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">{t('page.evolution.descriptionLabel')}</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder={t('page.evolution.descriptionPlaceholder')} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="suggestedAction">{t('page.evolution.suggestedActionLabel')}</Label>
            <Input id="suggestedAction" value={suggestedAction} onChange={(e) => setSuggestedAction(e.target.value)} placeholder={t('page.evolution.suggestedActionPlaceholder')} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="modelScope">{t('page.evolution.modelScopeLabel')}</Label>
            <Input id="modelScope" value={modelScope} onChange={(e) => setModelScope(e.target.value)} placeholder={t('page.evolution.modelScopePlaceholder')} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !title.trim()}>
            {loading ? t('common.saving') : initial ? t('common.save') : t('common.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
