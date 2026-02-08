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
import { BlockEditor } from '../../../components/editor';
import type { SessionState } from '@/lib/types';

interface SessionEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session?: SessionState;
  onSubmit: (branch?: string, input?: string, output?: string) => Promise<void>;
}

export function SessionEditDialog({ open, onOpenChange, session, onSubmit }: SessionEditDialogProps) {
  const { t } = useTranslation();
  const [branch, setBranch] = useState('');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && session) {
      setBranch(session.branch ?? '');
      setInput(session.input ?? '');
      setOutput(session.output ?? '');
    }
  }, [open, session]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit(
        branch.trim() || undefined,
        input.trim() || undefined,
        output.trim() || undefined,
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
          <DialogTitle>{t('page.sessions.editSession')}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="branch">{t('page.sessions.branchLabel')}</Label>
              <Input id="branch" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder={t('page.sessions.branchPlaceholder')} />
            </div>
            <div className="grid gap-2">
              <Label>{t('page.sessions.inputLabel')}</Label>
              <div className="rounded-md border border-input">
                <BlockEditor initialMarkdown={input} editable onChange={setInput} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t('page.sessions.outputLabel')}</Label>
              <div className="rounded-md border border-input">
                <BlockEditor initialMarkdown={output} editable onChange={setOutput} />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t('common.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
