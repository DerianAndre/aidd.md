import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Chip } from '@heroui/react';
import { FolderOpen, Check, X, Rocket } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { useProjectStore } from '../../../stores/project-store';
import type { ProjectInfo } from '../../../lib/tauri';

type Step = 'select' | 'detect' | 'ready';

export function OnboardingPage() {
  const [step, setStep] = useState<Step>('select');
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const addAndDetect = useProjectStore((s) => s.addAndDetect);
  const navigate = useNavigate();

  const handleSelectFolder = async () => {
    const selected = await open({ directory: true, title: 'Select AIDD Project' });
    if (!selected) return;

    const info = await addAndDetect(selected);
    setProjectInfo(info);
    setStep('detect');
  };

  const handleContinue = () => {
    navigate('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">aidd.md Hub</h1>
          <p className="mt-2 text-default-500">
            Centralized AI management for your development framework
          </p>
        </div>

        {step === 'select' && (
          <Card>
            <Card.Header>
              <Card.Title>Select Project</Card.Title>
              <Card.Description>
                Choose a directory with AIDD framework files
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <Button
                variant="primary"
                size="lg"
                onPress={handleSelectFolder}
                className="w-full"
              >
                <FolderOpen size={20} />
                Open Project Folder
              </Button>
            </Card.Content>
          </Card>
        )}

        {step === 'detect' && projectInfo && (
          <Card>
            <Card.Header>
              <Card.Title>{projectInfo.name}</Card.Title>
              <Card.Description>{projectInfo.path}</Card.Description>
            </Card.Header>
            <Card.Content className="space-y-4">
              <div>
                <h3 className="mb-2 text-sm font-medium text-default-700">
                  AIDD Markers Detected
                </h3>
                <div className="flex flex-wrap gap-2">
                  <MarkerChip label="AGENTS.md" found={projectInfo.markers.agents_md} />
                  <MarkerChip label="Rules" found={projectInfo.markers.rules} />
                  <MarkerChip label="Skills" found={projectInfo.markers.skills} />
                  <MarkerChip label="Workflows" found={projectInfo.markers.workflows} />
                  <MarkerChip label="Templates" found={projectInfo.markers.templates} />
                  <MarkerChip label="Knowledge" found={projectInfo.markers.knowledge} />
                  <MarkerChip label="Spec" found={projectInfo.markers.spec} />
                  <MarkerChip label=".aidd/" found={projectInfo.markers.aidd_dir} />
                  <MarkerChip label="Memory" found={projectInfo.markers.memory} />
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                onPress={handleContinue}
                className="w-full"
              >
                <Rocket size={20} />
                {projectInfo.detected ? 'Open Hub' : 'Continue Anyway'}
              </Button>
            </Card.Content>
          </Card>
        )}
      </div>
    </div>
  );
}

function MarkerChip({ label, found }: { label: string; found: boolean }) {
  return (
    <Chip
      size="sm"
      variant="soft"
      color={found ? 'success' : 'default'}
    >
      <span className="flex items-center gap-1">
        {found ? <Check size={14} /> : <X size={14} />}
        {label}
      </span>
    </Chip>
  );
}
