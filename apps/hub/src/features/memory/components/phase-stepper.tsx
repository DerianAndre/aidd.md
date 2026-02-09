import { Circle, CircleDot, CircleDashed } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ArtifactEntry } from '@/lib/types';

interface PhaseStepperProps {
  artifacts: ArtifactEntry[];
  fastTrack: boolean;
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}

const PHASES = [
  { id: 'understand', label: 'U', artifactTypes: ['brainstorm', 'research'] },
  { id: 'plan', label: 'P', artifactTypes: ['plan'] },
  { id: 'spec', label: 'S', artifactTypes: ['spec', 'adr'] },
  { id: 'build', label: 'B', artifactTypes: ['issue'] },
  { id: 'verify', label: 'V', artifactTypes: ['checklist'] },
  { id: 'ship', label: 'S', artifactTypes: ['retro'] },
] as const;

const FAST_TRACK_SKIPPED = ['understand']; // brainstorm can be skipped in fast-track mode

export function PhaseStepper({ artifacts, fastTrack, orientation = 'vertical', className }: PhaseStepperProps) {
  // Map which phases have artifacts
  const completedPhases = new Set<string>();
  artifacts.forEach(artifact => {
    const artifactType = artifact.type as string;
    PHASES.forEach(phase => {
      if (phase.artifactTypes.some((type) => type === artifactType)) {
        completedPhases.add(phase.id);
      }
    });
  });

  const isVertical = orientation === 'vertical';

  return (
    <div
      className={cn(
        'flex items-center gap-2',
        isVertical ? 'flex-col' : 'flex-row',
        className
      )}
    >
      {PHASES.map((phase) => {
        const isCompleted = completedPhases.has(phase.id);
        const isSkipped = fastTrack && FAST_TRACK_SKIPPED.includes(phase.id);
        const isMissing = !isCompleted && !isSkipped;

        return (
          <div
            key={phase.id}
            className="relative flex items-center justify-center"
            title={`${phase.id.toUpperCase()}: ${isCompleted ? 'Completed' : isSkipped ? 'Skipped (Fast-Track)' : 'Missing'}`}
          >
            {isCompleted && (
              <CircleDot size={16} className="text-teal-500" />
            )}
            {isSkipped && (
              <CircleDashed size={16} className="text-muted-foreground opacity-50" />
            )}
            {isMissing && (
              <Circle size={16} className="text-red-500 opacity-70" />
            )}
            {/* Phase label overlay */}
            <span className="absolute text-[7px] font-mono font-bold text-foreground pointer-events-none">
              {phase.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
