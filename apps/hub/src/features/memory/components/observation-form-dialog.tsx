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
import { BlockEditor } from '../../../components/editor';
import type { SessionObservation, ObservationType } from '@/lib/types';

const OBSERVATION_TYPES: ObservationType[] = [
  'decision', 'mistake', 'convention', 'pattern',
  'preference', 'insight', 'tool_outcome', 'workflow_outcome',
];

interface ObservationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: SessionObservation;
  onSubmit: (obsType: ObservationType, title: string, narrative?: string, facts?: string, concepts?: string, filesRead?: string, filesModified?: string, discoveryTokens?: number) => Promise<void>;
}

export function ObservationFormDialog({ open, onOpenChange, initial, onSubmit }: ObservationFormDialogProps) {
  const { t } = useTranslation();
  const [obsType, setObsType] = useState<ObservationType>('insight');
  const [title, setTitle] = useState('');
  const [narrative, setNarrative] = useState('');
  const [facts, setFacts] = useState('');
  const [concepts, setConcepts] = useState('');
  const [filesRead, setFilesRead] = useState('');
  const [filesModified, setFilesModified] = useState('');
  const [discoveryTokens, setDiscoveryTokens] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setObsType(initial?.type ?? 'insight');
      setTitle(initial?.title ?? '');
      setNarrative(initial?.narrative ?? '');
      setFacts(initial?.facts?.join('\n') ?? '');
      setConcepts(initial?.concepts?.join('\n') ?? '');
      setFilesRead(initial?.filesRead?.join('\n') ?? '');
      setFilesModified(initial?.filesModified?.join('\n') ?? '');
      setDiscoveryTokens(initial?.discoveryTokens != null ? String(initial.discoveryTokens) : '');
    }
  }, [open, initial]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const tokens = discoveryTokens.trim() ? Number(discoveryTokens) : undefined;
      await onSubmit(
        obsType,
        title.trim(),
        narrative.trim() || undefined,
        facts.trim() || undefined,
        concepts.trim() || undefined,
        filesRead.trim() || undefined,
        filesModified.trim() || undefined,
        tokens,
      );
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {initial ? t('page.observations.editObservation') : t('page.observations.addObservation')}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="obsType">{t('page.observations.typeLabel')}</Label>
              <Select value={obsType} onValueChange={(v) => setObsType(v as ObservationType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OBSERVATION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">{t('page.observations.titleLabel')}</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('page.observations.titlePlaceholder')} />
            </div>
            <div className="grid gap-2">
              <Label>{t('page.observations.narrativeLabel')}</Label>
              <div className="rounded-md border border-input">
                <BlockEditor initialMarkdown={narrative} editable onChange={setNarrative} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="facts">{t('page.observations.factsLabel')}</Label>
              <Textarea id="facts" value={facts} onChange={(e) => setFacts(e.target.value)} rows={2} placeholder={t('page.observations.factsPlaceholder')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="concepts">{t('page.observations.conceptsLabel')}</Label>
              <Textarea id="concepts" value={concepts} onChange={(e) => setConcepts(e.target.value)} rows={2} placeholder={t('page.observations.conceptsPlaceholder')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="filesRead">{t('page.observations.filesReadLabel')}</Label>
              <Textarea id="filesRead" value={filesRead} onChange={(e) => setFilesRead(e.target.value)} rows={2} placeholder={t('page.observations.filesReadPlaceholder')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="filesModified">{t('page.observations.filesModifiedLabel')}</Label>
              <Textarea id="filesModified" value={filesModified} onChange={(e) => setFilesModified(e.target.value)} rows={2} placeholder={t('page.observations.filesModifiedPlaceholder')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="discoveryTokens">{t('page.observations.discoveryTokensLabel')}</Label>
              <Input id="discoveryTokens" type="number" min={0} value={discoveryTokens} onChange={(e) => setDiscoveryTokens(e.target.value)} placeholder={t('page.observations.discoveryTokensPlaceholder')} />
            </div>
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
