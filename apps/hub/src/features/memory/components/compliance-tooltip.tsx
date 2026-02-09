import type { LifecycleProgress } from '../lib/lifecycle-progress';
import type { WorkflowCompliance } from '../lib/workflow-compliance';

interface ComplianceTooltipProps {
  lifecycle?: LifecycleProgress;
  compliance?: WorkflowCompliance;
  isActive: boolean;
}

export function ComplianceTooltip({ lifecycle, compliance, isActive }: ComplianceTooltipProps) {
  const completedCount = lifecycle?.phases.filter((p) => p.status === 'completed').length ?? 0;
  const totalCount = lifecycle?.phases.length ?? 6;
  const activePhase = lifecycle?.phases.find((p) => p.status === 'active');
  const missingPhases = lifecycle?.phases
    .filter((p) => p.status === 'pending')
    .map((p) => p.name) ?? [];
  const earnedMilestones = lifecycle?.milestones.filter((m) => m.present) ?? [];

  return (
    <div className="space-y-1 text-xs max-w-52">
      {activePhase ? (
        <p className="font-semibold">
          Phase: {activePhase.name} ({completedCount}/{totalCount})
        </p>
      ) : (
        <p className="font-semibold">
          Phases: {completedCount}/{totalCount}
        </p>
      )}

      {missingPhases.length > 0 && (
        <p className="text-red-400">Missing: {missingPhases.join(', ')}</p>
      )}

      <p>Lifecycle: {lifecycle?.score ?? 0}%</p>

      {earnedMilestones.length > 0 && (
        <p className="text-teal-400">
          Milestones: {earnedMilestones.map((m) => `${m.label} +${m.points}`).join(', ')}
        </p>
      )}

      {!isActive && compliance && (
        <p>Compliance: {compliance.status === 'compliant' ? 'Compliant' : 'Non-Compliant'}</p>
      )}

      {lifecycle?.isFastTrack && (
        <p className="text-amber-400">Fast-Track</p>
      )}
    </div>
  );
}
