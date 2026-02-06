import { useState } from 'react';
import { Download, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { INSTALL_TARGETS } from '../lib/constants';

interface InstallDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  configSnippet: Record<string, unknown>;
  entryName: string;
}

export function InstallDialog({
  isOpen,
  onOpenChange,
  configSnippet,
  entryName,
}: InstallDialogProps) {
  const [selectedTargetId, setSelectedTargetId] = useState<string>(INSTALL_TARGETS[0].id);
  const [installed, setInstalled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);

  const selectedTarget = INSTALL_TARGETS.find((t) => t.id === selectedTargetId) ?? INSTALL_TARGETS[0];

  const handleInstall = async () => {
    setInstalling(true);
    setError(null);
    try {
      // TODO: Replace with Tauri invoke when command is ready
      // await invoke('write_mcp_config', { target: selectedTarget, config: configSnippet });
      console.log('Install to:', selectedTarget, configSnippet);
      await new Promise((resolve) => setTimeout(resolve, 800));
      setInstalled(true);
      setTimeout(() => {
        onOpenChange(false);
        setTimeout(() => {
          setInstalled(false);
          setError(null);
        }, 300);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Installation failed');
    } finally {
      setInstalling(false);
    }
  };

  const handleClose = () => {
    if (!installing) {
      onOpenChange(false);
      setTimeout(() => {
        setError(null);
        setInstalled(false);
      }, 300);
    }
  };

  const configPreview = JSON.stringify(configSnippet, null, 2);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <Download size={18} />
              <span>Install {entryName}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Target Selector */}
          <div className="flex flex-col gap-2">
            <Label>Target</Label>
            <Select
              value={selectedTargetId}
              onValueChange={(value) => setSelectedTargetId(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INSTALL_TARGETS.map((target) => (
                  <SelectItem key={target.id} value={target.id}>
                    {target.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-sm text-muted-foreground">
            This will merge the configuration into <code className="rounded bg-muted px-1 text-xs">{selectedTarget.configPath}</code>
          </p>

          {/* Preview */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Configuration Preview</span>
            <pre className="max-h-[300px] overflow-auto rounded-lg bg-muted p-3 text-xs text-foreground">
              {configPreview}
            </pre>
          </div>

          {/* Success */}
          {installed && (
            <div className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-success">
              <Check size={18} />
              <span className="font-medium">Installed!</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-danger/10 p-3 text-danger">
              <AlertCircle size={18} />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={installing || installed}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleInstall()}
            disabled={installing || installed}
          >
            {installing ? <Spinner size="sm" /> : null}
            {installed ? 'Installed' : 'Install'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
