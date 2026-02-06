import { useState } from 'react';
import { Modal, Button, Select, ListBox, Label, Spinner } from '@heroui/react';
import { Download, Check, AlertCircle } from 'lucide-react';
import type { Key } from '@heroui/react';
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
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Header>
        <div className="flex items-center gap-2">
          <Download size={18} />
          <span>Install {entryName}</span>
        </div>
      </Modal.Header>

      <Modal.Body>
        <div className="flex flex-col gap-4">
          {/* Target Selector */}
          <div className="flex flex-col gap-2">
            <Select
              aria-label="Select installation target"
              value={selectedTargetId}
              onChange={(value: Key | null) => {
                if (value) setSelectedTargetId(String(value));
              }}
            >
              <Label>Target</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {INSTALL_TARGETS.map((target) => (
                    <ListBox.Item key={target.id} id={target.id} textValue={target.label}>
                      {target.label}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          <p className="text-sm text-default-500">
            This will merge the configuration into <code className="rounded bg-default-100 px-1 text-xs">{selectedTarget.configPath}</code>
          </p>

          {/* Preview */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Configuration Preview</span>
            <pre className="max-h-[300px] overflow-auto rounded-lg bg-default-100 p-3 text-xs text-default-700">
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
      </Modal.Body>

      <Modal.Footer>
        <Button variant="ghost" onPress={handleClose} isDisabled={installing || installed}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onPress={() => void handleInstall()}
          isDisabled={installing || installed}
        >
          {installing ? <Spinner size="sm" /> : null}
          {installed ? 'Installed' : 'Install'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
