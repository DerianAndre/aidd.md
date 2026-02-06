import { useEffect, useState, useCallback } from 'react';
import { Modal, Button } from '@heroui/react';
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
        <div className="flex flex-col items-center py-16 text-default-400">
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
          <div className="text-sm text-default-400">Loading integration status...</div>
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

      {/* Result modal */}
      <ResultModal result={lastResult} onClose={clearResult} />
    </div>
  );
}

function ResultModal({ result, onClose }: { result: IntegrationResult | null; onClose: () => void }) {
  const hasCreated = result ? result.files_created.length > 0 : false;
  const hasModified = result ? result.files_modified.length > 0 : false;
  const hasMessages = result ? result.messages.length > 0 : false;

  return (
    <Modal>
      <Modal.Backdrop isOpen={!!result} onOpenChange={(open) => { if (!open) onClose(); }}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[480px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Integration Result</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              {result && (
                <>
                  {hasCreated && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-success-600">Files created:</p>
                      {result.files_created.map((f) => (
                        <p key={f} className="truncate text-xs text-default-500" title={f}>{f}</p>
                      ))}
                    </div>
                  )}
                  {hasModified && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-warning-600">Files modified:</p>
                      {result.files_modified.map((f) => (
                        <p key={f} className="truncate text-xs text-default-500" title={f}>{f}</p>
                      ))}
                    </div>
                  )}
                  {hasMessages && (
                    <div>
                      <p className="text-xs font-medium text-default-600">Messages:</p>
                      {result.messages.map((m, i) => (
                        <p key={i} className="whitespace-pre-wrap text-xs text-default-500">{m}</p>
                      ))}
                    </div>
                  )}
                  {!hasCreated && !hasModified && !hasMessages && (
                    <p className="text-xs text-default-400">No changes were made.</p>
                  )}
                </>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="primary" size="sm" slot="close">
                Done
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
