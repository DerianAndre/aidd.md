import { Circle, CircleDot, CircleDashed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { ArtifactEntry, SessionState } from '@/lib/types';

interface PhaseStepperProps {
  artifacts: ArtifactEntry[];
  fastTrack: boolean;
  session?: SessionState;
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}

const PHASES = [
  { id: 'brainstorm', label: 'B', name: 'Brainstorm', artifactTypes: ['brainstorm', 'research'] },
  { id: 'plan', label: 'P', name: 'Plan', artifactTypes: ['plan', 'adr', 'diagram', 'spec'] },
  { id: 'execute', label: 'E', name: 'Execute', artifactTypes: ['issue', 'spec'] },
  { id: 'test', label: 'T', name: 'Test', artifactTypes: ['checklist'] },
  { id: 'review', label: 'R', name: 'Review', artifactTypes: [] },
  { id: 'ship', label: 'S', name: 'Ship', artifactTypes: ['retro'] },
] as const;

const FAST_TRACK_SKIPPED = ['brainstorm']; // brainstorming can be skipped in fast-track mode

export function PhaseStepper({ artifacts, fastTrack, session, orientation = 'vertical', className }: PhaseStepperProps) {
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

  const hasExecutionSignal =
    (session?.filesModified?.length ?? 0) > 0 ||
    (session?.tasksCompleted?.length ?? 0) > 0;
  if (hasExecutionSignal) {
    completedPhases.add('execute');
  }

  if (session?.endedAt) {
    completedPhases.add('review');
  }

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
        const status = isCompleted
          ? 'Completed'
          : isSkipped
            ? 'Skipped (Fast-Track)'
            : 'Missing';
        const detail =
          phase.id === 'ship' && !!session?.endedAt && !isCompleted
            ? 'Retro artifact is still required.'
            : undefined;

        return (
          <Tooltip key={phase.id}>
            <TooltipTrigger asChild>
              <span
                className="relative flex items-center justify-center"
                aria-label={`${phase.name}: ${status}`}
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
              </span>
            </TooltipTrigger>
            <TooltipContent sideOffset={6}>
              <p className="font-semibold">{phase.name}</p>
              <p>{status}</p>
              {detail && <p>{detail}</p>}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
