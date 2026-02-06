import { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plug } from 'lucide-react';
import { PageHeader } from '../../../components/layout/page-header';
import { IntegrationCard } from '../components/integration-card';
import { useIntegrationsStore } from '../stores/integrations-store';
import { useProjectStore } from '../../../stores/project-store';
import type { IntegrationTool, IntegrationResult } from '../../../lib/tauri';

export function IntegrationsPage() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const integrations = useIntegrationsStore((s) => s.integrations);
  const loading = useIntegrationsStore((s) => s.loading);
  const fetchStatus = useIntegrationsStore((s) => s.fetchStatus);
  const integrate = useIntegrationsStore((s) => s.integrate);
  const remove = useIntegrationsStore((s) => s.remove);
  const lastResult = useIntegrationsStore((s) => s.lastResult);
  const clearResult = useIntegrationsStore((s) => s.clearResult);

  const [busyTool, setBusyTool] = useState<IntegrationTool | null>(null);

  useEffect(() => {
    if (activeProject?.path) {
      void fetchStatus(activeProject.path);
    }
  }, [activeProject?.path, fetchStatus]);

  const handleIntegrate = useCallback(async (tool: IntegrationTool) => {
    if (!activeProject?.path) return;
    setBusyTool(tool);
    try {
      await integrate(activeProject.path, tool);
    } finally {
      setBusyTool(null);
    }
  }, [activeProject?.path, integrate]);

  const handleRemove = useCallback(async (tool: IntegrationTool) => {
    if (!activeProject?.path) return;
    setBusyTool(tool);
    try {
      await remove(activeProject.path, tool);
    } finally {
      setBusyTool(null);
    }
  }, [activeProject?.path, remove]);

  if (!activeProject) {
    return (
      <div>
        <PageHeader title="Integrations" description="1-click AI tool integration" />
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <Plug size={40} className="mb-3" />
          <p className="text-sm">Select a project first to manage integrations</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Integrations"
        description={`AI tool integrations for ${activeProject.name}`}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="text-sm text-muted-foreground">Loading integration status...</div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {integrations.map((config) => (
            <IntegrationCard
              key={config.integration_type}
              config={config}
              onIntegrate={() => void handleIntegrate(config.integration_type)}
              onRemove={() => void handleRemove(config.integration_type)}
              busy={busyTool === config.integration_type}
            />
          ))}
        </div>
      )}

      {/* Result dialog */}
      <ResultDialog result={lastResult} onClose={clearResult} />
    </div>
  );
}

function ResultDialog({ result, onClose }: { result: IntegrationResult | null; onClose: () => void }) {
  const hasCreated = result ? result.files_created.length > 0 : false;
  const hasModified = result ? result.files_modified.length > 0 : false;
  const hasMessages = result ? result.messages.length > 0 : false;

  return (
    <Dialog open={!!result} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Integration Result</DialogTitle>
        </DialogHeader>
        {result && (
          <div>
            {hasCreated && (
              <div className="mb-3">
                <p className="text-xs font-medium text-emerald-600">Files created:</p>
                {result.files_created.map((f) => (
                  <p key={f} className="truncate text-xs text-muted-foreground" title={f}>{f}</p>
                ))}
              </div>
            )}
            {hasModified && (
              <div className="mb-3">
                <p className="text-xs font-medium text-amber-600">Files modified:</p>
                {result.files_modified.map((f) => (
                  <p key={f} className="truncate text-xs text-muted-foreground" title={f}>{f}</p>
                ))}
              </div>
            )}
            {hasMessages && (
              <div>
                <p className="text-xs font-medium text-foreground">Messages:</p>
                {result.messages.map((m, i) => (
                  <p key={i} className="whitespace-pre-wrap text-xs text-muted-foreground">{m}</p>
                ))}
              </div>
            )}
            {!hasCreated && !hasModified && !hasMessages && (
              <p className="text-xs text-muted-foreground">No changes were made.</p>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="default" size="sm" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
