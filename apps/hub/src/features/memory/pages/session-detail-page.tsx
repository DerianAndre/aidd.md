import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Chip } from '@heroui/react';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '../../../components/layout/page-header';
import { EmptyState } from '../../../components/empty-state';
import { ObservationCard } from '../components/observation-card';
import { useSessionsStore } from '../stores/sessions-store';
import { useProjectStore } from '../../../stores/project-store';
import { formatDuration, formatDate, scoreColor } from '../../../lib/utils';
import type { SessionState, SessionObservation } from '../../../lib/types';

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const activeProject = useProjectStore((s) => s.activeProject);
  const { activeSessions, completedSessions, stale, fetchAll, fetchObservations } = useSessionsStore();

  const [session, setSession] = useState<SessionState | null>(null);
  const [observations, setObservations] = useState<SessionObservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProject?.path || !id) return;

    void (async () => {
      setLoading(true);
      if (stale) await fetchAll(activeProject.path);

      const found =
        activeSessions.find((s) => s.id === id) ??
        completedSessions.find((s) => s.id === id) ??
        null;
      setSession(found);

      if (found) {
        const status = found.endedAt ? 'completed' : 'active';
        const obs = await fetchObservations(activeProject.path, found.id, status);
        setObservations(obs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }
      setLoading(false);
    })();
  }, [activeProject?.path, id, stale, fetchAll, activeSessions, completedSessions, fetchObservations]);

  if (loading) {
    return <div className="p-4 text-default-400">Loading session...</div>;
  }

  if (!session) {
    return (
      <div>
        <PageHeader
          title="Session Not Found"
          actions={
            <Button variant="ghost" size="sm" onPress={() => navigate('/sessions')}>
              <ArrowLeft size={16} /> Back
            </Button>
          }
        />
        <EmptyState message="This session could not be found." />
      </div>
    );
  }

  const duration = session.endedAt
    ? formatDuration(new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime())
    : 'In progress';

  const modelLabel = session.aiProvider.model.replace('claude-', '').replace(/-\d{8}$/, '');

  return (
    <div>
      <PageHeader
        title={`Session: ${session.branch}`}
        description={`${modelLabel} · ${formatDate(session.startedAt)}`}
        actions={
          <Button variant="ghost" size="sm" onPress={() => navigate('/sessions')}>
            <ArrowLeft size={16} /> Back
          </Button>
        }
      />

      {/* Metadata Grid */}
      <div className="mb-6 grid gap-3 grid-cols-2 sm:grid-cols-4">
        <MetaItem label="Provider" value={`${session.aiProvider.provider} / ${modelLabel}`} />
        <MetaItem label="Duration" value={duration} />
        <MetaItem label="Branch" value={session.branch} />
        <MetaItem label="Classification" value={`${session.taskClassification?.domain ?? '—'} / ${session.taskClassification?.nature ?? '—'}`} />
      </div>

      {/* Outcome */}
      {session.outcome && (
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-semibold text-default-600">Outcome</h3>
          <div className="flex flex-wrap gap-2">
            <Chip size="sm" variant="soft" color={session.outcome.testsPassing ? 'success' : 'danger'}>
              Tests: {session.outcome.testsPassing ? 'Passing' : 'Failing'}
            </Chip>
            <Chip size="sm" variant="soft" color={scoreColor(session.outcome.complianceScore)}>
              Compliance: {session.outcome.complianceScore}%
            </Chip>
            {session.outcome.reverts > 0 && (
              <Chip size="sm" variant="soft" color="warning">Reverts: {session.outcome.reverts}</Chip>
            )}
            {session.outcome.userFeedback && (
              <Chip size="sm" variant="soft" color={session.outcome.userFeedback === 'positive' ? 'success' : session.outcome.userFeedback === 'negative' ? 'danger' : 'default'}>
                Feedback: {session.outcome.userFeedback}
              </Chip>
            )}
          </div>
        </div>
      )}

      {/* Tasks */}
      <div className="mb-6 grid gap-4 grid-cols-1 sm:grid-cols-2">
        {session.tasksCompleted.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-default-600">Completed Tasks ({session.tasksCompleted.length})</h3>
            <ul className="list-inside list-disc text-xs text-default-500">
              {session.tasksCompleted.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        )}
        {session.decisions.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-default-600">Decisions ({session.decisions.length})</h3>
            <ul className="space-y-1">
              {session.decisions.map((d, i) => (
                <li key={i} className="text-xs text-default-500">
                  <span className="font-medium text-foreground">{d.decision}</span>
                  <br />
                  <span className="text-default-400">{d.reasoning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Errors Resolved */}
      {session.errorsResolved.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-semibold text-default-600">Errors Resolved ({session.errorsResolved.length})</h3>
          <ul className="space-y-1">
            {session.errorsResolved.map((e, i) => (
              <li key={i} className="text-xs text-default-500">
                <span className="font-medium text-danger">{e.error}</span>
                <br />
                <span className="text-default-400">Fix: {e.fix}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Observations Timeline */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-default-600">Observations ({observations.length})</h3>
        {observations.length === 0 ? (
          <p className="text-xs text-default-400">No observations recorded for this session.</p>
        ) : (
          <div className="space-y-2">
            {observations.map((obs) => (
              <ObservationCard key={obs.id} observation={obs} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-default-200 bg-default-50 p-3">
      <p className="text-[10px] font-medium uppercase text-default-400">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
