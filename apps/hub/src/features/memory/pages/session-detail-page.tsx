import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '../../../components/layout/page-header';
import { EmptyState } from '../../../components/empty-state';
import { ObservationCard } from '../components/observation-card';
import { useSessionsStore } from '../stores/sessions-store';
import { useProjectStore } from '../../../stores/project-store';
import { formatDuration, formatDate, scoreColor } from '../../../lib/utils';
import type { SessionState, SessionObservation } from '../../../lib/types';

export function SessionDetailPage() {
  const { t } = useTranslation();
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
    return <div className="p-4 text-muted-foreground">Loading session...</div>;
  }

  if (!session) {
    return (
      <div>
        <PageHeader
          title={t('page.sessionDetail.notFound')}
          actions={
            <Button variant="ghost" size="sm" onClick={() => navigate('/sessions')}>
              <ArrowLeft size={16} /> {t('common.back')}
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
        title={t('page.sessionDetail.title', { branch: session.branch })}
        description={`${modelLabel} · ${formatDate(session.startedAt)}`}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/sessions')}>
            <ArrowLeft size={16} /> {t('common.back')}
          </Button>
        }
      />

      {/* Input / Output */}
      {(session.input || session.output) && (
        <div className="mb-6 grid gap-4 grid-cols-1 sm:grid-cols-2">
          {session.input && (
            <Card>
              <CardContent>
                <p className="text-[10px] font-medium uppercase text-muted-foreground">{t('page.sessionDetail.input')}</p>
                <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{session.input}</p>
              </CardContent>
            </Card>
          )}
          {session.output && (
            <Card>
              <CardContent>
                <p className="text-[10px] font-medium uppercase text-muted-foreground">{t('page.sessionDetail.output')}</p>
                <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{session.output}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Metadata Grid */}
      <div className="mb-6 grid gap-3 grid-cols-2 sm:grid-cols-4">
        <MetaItem label={t('page.sessionDetail.provider')} value={`${session.aiProvider.provider} / ${modelLabel}`} />
        <MetaItem label={t('page.sessionDetail.duration')} value={duration} />
        <MetaItem label={t('page.sessionDetail.branch')} value={session.branch} />
        <MetaItem label={t('page.sessionDetail.classification')} value={`${session.taskClassification?.domain ?? '—'} / ${session.taskClassification?.nature ?? '—'}`} />
      </div>

      {/* Outcome */}
      {session.outcome && (
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-semibold text-foreground">{t('page.sessionDetail.outcome')}</h3>
          <div className="flex flex-wrap gap-2">
            <Chip size="sm" color={session.outcome.testsPassing ? 'success' : 'danger'}>
              {session.outcome.testsPassing ? t('page.sessionDetail.testsPassing') : t('page.sessionDetail.testsFailing')}
            </Chip>
            <Chip size="sm" color={scoreColor(session.outcome.complianceScore)}>
              {t('page.sessionDetail.compliance', { score: session.outcome.complianceScore })}
            </Chip>
            {session.outcome.reverts > 0 && (
              <Chip size="sm" color="warning">{t('page.sessionDetail.reverts', { count: session.outcome.reverts })}</Chip>
            )}
            {session.outcome.userFeedback && (
              <Chip size="sm" color={session.outcome.userFeedback === 'positive' ? 'success' : session.outcome.userFeedback === 'negative' ? 'danger' : 'default'}>
                {t('page.sessionDetail.feedback', { type: session.outcome.userFeedback })}
              </Chip>
            )}
          </div>
        </div>
      )}

      {/* Tasks */}
      <div className="mb-6 grid gap-4 grid-cols-1 sm:grid-cols-2">
        {session.tasksCompleted.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-foreground">{t('page.sessionDetail.completedTasks', { count: session.tasksCompleted.length })}</h3>
            <ul className="list-inside list-disc text-xs text-muted-foreground">
              {session.tasksCompleted.map((task, i) => <li key={i}>{task}</li>)}
            </ul>
          </div>
        )}
        {session.decisions.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-foreground">{t('page.sessionDetail.decisions', { count: session.decisions.length })}</h3>
            <ul className="space-y-1">
              {session.decisions.map((d, i) => (
                <li key={i} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{d.decision}</span>
                  <br />
                  <span className="text-muted-foreground">{d.reasoning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Errors Resolved */}
      {session.errorsResolved.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-semibold text-foreground">{t('page.sessionDetail.errorsResolved', { count: session.errorsResolved.length })}</h3>
          <ul className="space-y-1">
            {session.errorsResolved.map((e, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                <span className="font-medium text-danger">{e.error}</span>
                <br />
                <span className="text-muted-foreground">{t('page.sessionDetail.fix')} {e.fix}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Observations Timeline */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">{t('page.sessionDetail.observations', { count: observations.length })}</h3>
        {observations.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('page.sessionDetail.noObservations')}</p>
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
    <Card className="gap-3 py-3">
      <CardContent>
        <p className="text-[10px] font-medium uppercase text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
