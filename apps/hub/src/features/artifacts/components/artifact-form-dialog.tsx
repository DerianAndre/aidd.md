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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BlockEditor } from '../../../components/editor';
import { ARTIFACT_TYPES } from '@/lib/types';
import type { ArtifactEntry, ArtifactType } from '@/lib/types';

const ARTIFACT_STATUSES = ['active', 'done'] as const;

interface ArtifactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ArtifactEntry;
  onSubmit: (type: string, feature: string, title: string, description: string, content: string, status?: string) => Promise<void>;
}

export function ArtifactFormDialog({ open, onOpenChange, initial, onSubmit }: ArtifactFormDialogProps) {
  const { t } = useTranslation();
  const [type, setType] = useState<ArtifactType>('plan');
  const [feature, setFeature] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('active');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setType(initial?.type ?? 'plan');
      setFeature(initial?.feature ?? '');
      setTitle(initial?.title ?? '');
      setDescription(initial?.description ?? '');
      setContent(initial?.content ?? '');
      setStatus(initial?.status ?? 'active');
    }
  }, [open, initial]);

  const handleSubmit = async () => {
    if (!title.trim() || !feature.trim()) return;
    setLoading(true);
    try {
      await onSubmit(type, feature.trim(), title.trim(), description.trim(), content.trim(), initial ? status : undefined);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const isValid = title.trim() && feature.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {initial ? t('page.artifacts.editArtifact') : t('page.artifacts.createArtifact')}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="artifact-type">{t('page.artifacts.typeLabel')}</Label>
              <Select value={type} onValueChange={(v) => setType(v as ArtifactType)}>
                <SelectTrigger id="artifact-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ARTIFACT_TYPES.map((at) => (
                    <SelectItem key={at} value={at}>{at}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {initial && (
              <div className="grid gap-2">
                <Label htmlFor="artifact-status">{t('page.artifacts.statusLabel')}</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="artifact-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ARTIFACT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="artifact-feature">{t('page.artifacts.featureLabel')}</Label>
              <Input
                id="artifact-feature"
                value={feature}
                onChange={(e) => setFeature(e.target.value)}
                placeholder={t('page.artifacts.featurePlaceholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="artifact-title">{t('page.artifacts.titleLabel')}</Label>
              <Input
                id="artifact-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('page.artifacts.titlePlaceholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="artifact-description">{t('page.artifacts.descriptionLabel')}</Label>
              <Input
                id="artifact-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('page.artifacts.descriptionPlaceholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t('page.artifacts.contentLabel')}</Label>
              <div className="rounded-md border border-input">
                <BlockEditor initialMarkdown={content} editable onChange={setContent} />
              </div>
            </div>
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
