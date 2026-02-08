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
import type { DraftEntry, DraftCategory } from '@/lib/types';

const DRAFT_CATEGORIES: DraftCategory[] = ['rules', 'knowledge', 'skills', 'workflows'];

interface DraftFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: DraftEntry;
  onSubmit: (category: DraftCategory, title: string, filename: string, content: string, confidence: number) => Promise<void>;
}

export function DraftFormDialog({ open, onOpenChange, initial, onSubmit }: DraftFormDialogProps) {
  const { t } = useTranslation();
  const [category, setCategory] = useState<DraftCategory>('rules');
  const [title, setTitle] = useState('');
  const [filename, setFilename] = useState('');
  const [content, setContent] = useState('');
  const [confidence, setConfidence] = useState('50');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setCategory(initial?.category ?? 'rules');
      setTitle(initial?.title ?? '');
      setFilename(initial?.filename ?? '');
      setContent(initial?.content ?? '');
      setConfidence(String(initial?.confidence ?? 50));
    }
  }, [open, initial]);

  const handleSubmit = async () => {
    if (!title.trim() || !filename.trim()) return;
    setLoading(true);
    try {
      const conf = Math.min(100, Math.max(0, Number(confidence) || 50));
      await onSubmit(category, title.trim(), filename.trim(), content.trim(), conf);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const isValid = title.trim() && filename.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {initial ? t('page.drafts.editDraft') : t('page.drafts.addDraft')}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="category">{t('page.drafts.categoryLabel')}</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as DraftCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DRAFT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">{t('page.drafts.titleLabel')}</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('page.drafts.titlePlaceholder')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="filename">{t('page.drafts.filenameLabel')}</Label>
              <Input id="filename" value={filename} onChange={(e) => setFilename(e.target.value)} placeholder={t('page.drafts.filenamePlaceholder')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confidence">{t('page.drafts.confidenceLabel')}</Label>
              <Input id="confidence" type="number" min={0} max={100} value={confidence} onChange={(e) => setConfidence(e.target.value)} placeholder="0-100" />
            </div>
            <div className="grid gap-2">
              <Label>{t('page.drafts.contentLabel')}</Label>
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
