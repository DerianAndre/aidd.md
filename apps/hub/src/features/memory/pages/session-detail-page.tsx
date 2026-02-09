import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronDown, ChevronRight, Clock, GitBranch, Pencil, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '../../../components/layout/page-header';
import { EmptyState } from '../../../components/empty-state';
import { ObservationCard } from '../components/observation-card';
import { ArtifactPreviewCard } from '../components/artifact-preview-card';
import { BlockEditor } from '../../../components/editor';
import { FrontmatterForm } from '../../../components/editor/frontmatter-form';
import { EditableList, EditableStructuredList } from '../../../components/editable-list';
import { useSessionsStore } from '../stores/sessions-store';
import { useProjectStore } from '../../../stores/project-store';
import { showSuccess, showError } from '../../../lib/toast';
import { formatDuration, formatDate, scoreColor } from '../../../lib/utils';
import { listArtifacts } from '../../../lib/tauri';
import type { SessionState, SessionObservation, SessionUpdatePayload, ArtifactEntry } from '../../../lib/types';
import type { FieldDefinition } from '../../../components/editor/frontmatter-form';

// ---------------------------------------------------------------------------
// Select options
// ---------------------------------------------------------------------------

const DOMAIN_OPTIONS = [
  { label: 'Frontend', value: 'frontend' },
  { label: 'Backend', value: 'backend' },
  { label: 'Fullstack', value: 'fullstack' },
  { label: 'Database', value: 'database' },
  { label: 'Infrastructure', value: 'infrastructure' },
  { label: 'Docs', value: 'docs' },
  { label: 'Other', value: 'other' },
];

const NATURE_OPTIONS = [
  { label: 'New Feature', value: 'new-feature' },
  { label: 'Enhancement', value: 'enhancement' },
  { label: 'Bug Fix', value: 'bugfix' },
  { label: 'Refactor', value: 'refactor' },
  { label: 'Analysis', value: 'analysis' },
  { label: 'Planning', value: 'planning' },
  { label: 'Testing', value: 'testing' },
];

const COMPLEXITY_OPTIONS = [
  { label: 'Trivial', value: 'trivial' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Complex', value: 'complex' },
];

const FEEDBACK_OPTIONS = [
  { label: 'Positive', value: 'positive' },
  { label: 'Neutral', value: 'neutral' },
  { label: 'Negative', value: 'negative' },
  { label: 'None', value: 'none' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SessionDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const activeProject = useProjectStore((s) => s.activeProject);
  const {
    activeSessions,
    completedSessions,
    complianceBySessionId,
    stale,
    fetchAll,
    fetchObservations,
    editSessionFull,
  } = useSessionsStore();

  const [session, setSession] = useState<SessionState | null>(null);
  const [observations, setObservations] = useState<SessionObservation[]>([]);
  const [artifacts, setArtifacts] = useState<ArtifactEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [draftOutput, setDraftOutput] = useState('');
  const [draftTasksCompleted, setDraftTasksCompleted] = useState<string[]>([]);
  const [draftTasksPending, setDraftTasksPending] = useState<string[]>([]);
  const [draftFilesModified, setDraftFilesModified] = useState<string[]>([]);
  const [draftDecisions, setDraftDecisions] = useState<Array<Record<string, string>>>([]);
  const [draftErrors, setDraftErrors] = useState<Array<Record<string, string>>>([]);

  // Load session
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
        const [obs, arts] = await Promise.all([
          fetchObservations(activeProject.path, found.id, status),
          listArtifacts(undefined, undefined, 500),
        ]);
        setObservations(obs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

        // Filter artifacts for this session
        const sessionArtifacts = (arts as unknown as ArtifactEntry[])
          .filter(a => a.sessionId === found.id || a.feature.toLowerCase() === found.branch.toLowerCase())
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setArtifacts(sessionArtifacts);
      }
      setLoading(false);
    })();
  }, [activeProject?.path, id, stale, fetchAll, activeSessions, completedSessions, fetchObservations]);

  // Build flat draft values from session
  const populateDraft = useCallback((s: SessionState) => {
    setDraft({
      sessionName: s.name ?? s.input ?? '',
      sessionInput: s.input ?? '',
      branch: s.branch ?? '',
      startedAt: s.startedAt ?? '',
      endedAt: s.endedAt ?? '',
      provider: s.aiProvider?.provider ?? '',
      model: s.aiProvider?.model ?? '',
      modelId: s.aiProvider?.modelId ?? '',
      client: s.aiProvider?.client ?? '',
      taskDomain: s.taskClassification?.domain ?? '',
      taskNature: s.taskClassification?.nature ?? '',
      taskComplexity: s.taskClassification?.complexity ?? '',
      testsPassing: String(s.outcome?.testsPassing ?? false),
      complianceScore: String(s.outcome?.complianceScore ?? 0),
      reverts: String(s.outcome?.reverts ?? 0),
      reworks: String(s.outcome?.reworks ?? 0),
      userFeedback: s.outcome?.userFeedback || 'none',
    });
    setDraftOutput(s.output ?? '');
    setDraftTasksCompleted([...(s.tasksCompleted ?? [])]);
    setDraftTasksPending([...(s.tasksPending ?? [])]);
    setDraftFilesModified([...(s.filesModified ?? [])]);
    setDraftDecisions((s.decisions ?? []).map((d) => ({ decision: d.decision, reasoning: d.reasoning })));
    setDraftErrors((s.errorsResolved ?? []).map((e) => ({ error: e.error, fix: e.fix })));
  }, []);

  useEffect(() => {
    if (session && !editing) populateDraft(session);
  }, [session, editing, populateDraft]);

  const handleEdit = useCallback(() => {
    if (session) populateDraft(session);
    setEditing(true);
  }, [session, populateDraft]);

  const handleCancel = useCallback(() => {
    if (session) populateDraft(session);
    setEditing(false);
  }, [session, populateDraft]);

  const handleSave = useCallback(async () => {
    if (!session) return;
    setSaving(true);
    try {
      const updates: SessionUpdatePayload = {
        name: draft.sessionName || undefined,
        branch: draft.branch,
        input: draft.sessionInput || undefined,
        output: draftOutput,
        aiProvider: {
          provider: draft.provider || undefined,
          model: draft.model || undefined,
          modelId: draft.modelId || undefined,
          client: draft.client || undefined,
        },
        startedAt: draft.startedAt || undefined,
        endedAt: draft.endedAt || null,
        taskClassification: {
          domain: draft.taskDomain || undefined,
          nature: draft.taskNature || undefined,
          complexity: draft.taskComplexity || undefined,
        },
        outcome: {
          testsPassing: draft.testsPassing === 'true',
          complianceScore: Number(draft.complianceScore) || 0,
          reverts: Number(draft.reverts) || 0,
          reworks: Number(draft.reworks) || 0,
          userFeedback: (draft.userFeedback === 'none' ? undefined : draft.userFeedback || undefined) as SessionUpdatePayload['outcome'] extends { userFeedback?: infer U } ? U : never,
        },
        tasksCompleted: draftTasksCompleted,
        tasksPending: draftTasksPending,
        filesModified: draftFilesModified,
        decisions: draftDecisions.map((d) => ({
          decision: d.decision ?? '',
          reasoning: d.reasoning ?? '',
          timestamp: new Date().toISOString(),
        })),
        errorsResolved: draftErrors.map((e) => ({
          error: e.error ?? '',
          fix: e.fix ?? '',
          timestamp: new Date().toISOString(),
        })),
      };
      await editSessionFull(session.id, updates);
      showSuccess(t('page.sessions.editSuccess'));
      setEditing(false);
    } catch {
      showError(t('page.sessions.editError'));
    } finally {
      setSaving(false);
    }
  }, [session, draft, draftOutput, draftTasksCompleted, draftTasksPending, draftFilesModified, draftDecisions, draftErrors, editSessionFull, t]);

  // Escape key cancels
  useEffect(() => {
    if (!editing) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editing, handleCancel]);

  // Derived values
  const isActive = session && !session.endedAt;
  const compliance = session ? complianceBySessionId[session.id] : undefined;
  const durationMs = session?.endedAt
    ? new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()
    : session
      ? Date.now() - new Date(session.startedAt).getTime()
      : null;

  // ---------------------------------------------------------------------------
  // Field definitions
  // ---------------------------------------------------------------------------

  const metadataFields: FieldDefinition[] = useMemo(() => [
    { type: 'separator', key: 'sep-session', label: t('page.sessionDetail.metadata') },
    { type: 'readonly', key: 'sessionId', label: t('page.sessionDetail.sessionId') },
    { type: 'text', key: 'sessionName', label: t('page.sessionDetail.sessionName'), placeholder: t('page.sessionDetail.sessionNamePlaceholder') },
    { type: 'text', key: 'sessionInput', label: t('page.sessionDetail.input') },
    { type: 'text', key: 'branch', label: t('page.sessionDetail.branch') },
    { type: 'readonly', key: '_status', label: t('page.sessionDetail.status') },
    { type: 'datetime', key: 'startedAt', label: t('page.sessionDetail.startedAt') },
    { type: 'datetime', key: 'endedAt', label: t('page.sessionDetail.endedAt') },
    { type: 'separator', key: 'sep-provider', label: t('page.sessionDetail.provider') },
    { type: 'text', key: 'provider', label: t('page.sessionDetail.provider'), placeholder: 'e.g. anthropic' },
    { type: 'text', key: 'model', label: t('page.sessionDetail.model'), placeholder: 'e.g. claude-opus-4-6' },
    { type: 'text', key: 'modelId', label: 'Model ID', placeholder: 'e.g. claude-opus-4-6' },
    { type: 'text', key: 'client', label: t('page.sessionDetail.client'), placeholder: 'e.g. claude-code' },
    { type: 'separator', key: 'sep-classification', label: t('page.sessionDetail.classification') },
    { type: 'select', key: 'taskDomain', label: t('page.sessionDetail.domain'), options: DOMAIN_OPTIONS },
    { type: 'select', key: 'taskNature', label: t('page.sessionDetail.nature'), options: NATURE_OPTIONS },
    { type: 'select', key: 'taskComplexity', label: t('page.sessionDetail.complexity'), options: COMPLEXITY_OPTIONS },
  ], [t]);

  const outcomeFields: FieldDefinition[] = useMemo(() => [
    { type: 'switch', key: 'testsPassing', label: t('page.sessionDetail.testsPassing').replace('Tests: ', '') },
    { type: 'number', key: 'complianceScore', label: t('page.sessionDetail.complianceLabel'), min: 0, max: 100 },
    { type: 'number', key: 'reverts', label: t('page.sessionDetail.revertsLabel'), min: 0 },
    { type: 'number', key: 'reworks', label: t('page.sessionDetail.reworksLabel'), min: 0 },
    { type: 'select', key: 'userFeedback', label: t('page.sessionDetail.feedbackLabel'), options: FEEDBACK_OPTIONS },
  ], [t]);

  const handleDraftChange = useCallback((key: string, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const draftWithComputed = useMemo(() => ({
    ...draft,
    sessionId: session?.id ?? '',
    _status: draft.endedAt
      ? t('page.sessionDetail.statusCompleted')
      : t('page.sessionDetail.statusActive'),
  }), [draft, session?.id, t]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

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

  // Header title: session name > branch
  const headerTitle = editing
    ? t('page.sessions.editSession')
    : session.name
      ? session.name.length > 80
        ? session.name.slice(0, 80) + '...'
        : session.name
      : session.input
        ? session.input.length > 80
          ? session.input.slice(0, 80) + '...'
          : session.input
      : t('page.sessionDetail.title', { branch: session.branch });

  return (
    <div>
      <PageHeader
        title={headerTitle}
        description={
          <div className="flex items-center gap-2 flex-wrap">
            <Chip size="sm" color={isActive ? 'accent' : 'success'}>
              {isActive ? t('page.sessionDetail.statusActive') : t('page.sessionDetail.statusCompleted')}
            </Chip>
            {!isActive && compliance && (
              <Chip
                size="sm"
                color={compliance.status === 'compliant' ? 'success' : 'danger'}
                title={
                  compliance.status === 'non-compliant'
                    ? `${t('page.sessions.missingArtifacts')}: ${compliance.missing.join(', ')}`
                    : undefined
                }
              >
                {compliance.status === 'compliant'
                  ? t('page.sessions.compliant')
                  : t('page.sessions.nonCompliant')}
              </Chip>
            )}
            {session.branch && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <GitBranch size={12} />
                {session.branch}
              </span>
            )}
            <span className="text-muted-foreground">
              ID: <code className="font-mono">{session.id}</code>
            </span>
            <span className="text-muted-foreground">
              {session.aiProvider?.provider}/{session.aiProvider?.model}
            </span>
            {durationMs != null && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Clock size={12} />
                {formatDuration(durationMs)}
              </span>
            )}
            <span className="text-muted-foreground">{formatDate(session.startedAt)}</span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button size="sm" disabled={saving} onClick={handleSave}>
                  <Save size={14} /> {saving ? t('common.saving') : t('common.save')}
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving}>
                  {t('common.cancel')}
                </Button>
              </>
            ) : (
              <Button size="sm" variant="ghost" onClick={handleEdit} aria-label="Edit session">
                <Pencil size={14} /> {t('common.edit')}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate('/sessions')}>
              <ArrowLeft size={16} /> {t('common.back')}
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Section: Metadata */}
        <CollapsibleSection label={t('page.sessionDetail.metadata')} defaultOpen>
          <FrontmatterForm
            disabled={!editing}
            fields={metadataFields}
            values={draftWithComputed}
            onChange={handleDraftChange}
          />
        </CollapsibleSection>

        {/* Section: Output */}
        <CollapsibleSection label={t('page.sessionDetail.output')} defaultOpen>
          <Card className="gap-0 py-0 overflow-hidden">
            <CardContent className="p-0">
              {!editing && !draftOutput ? (
                <p className="p-4 text-xs text-muted-foreground italic">{t('page.sessionDetail.noOutput')}</p>
              ) : (
                <BlockEditor
                  initialMarkdown={draftOutput}
                  editable={editing}
                  onChange={editing ? setDraftOutput : undefined}
                />
              )}
            </CardContent>
          </Card>
        </CollapsibleSection>

        {/* Section: Outcome */}
        <CollapsibleSection label={t('page.sessionDetail.outcome')} defaultOpen>
          {editing ? (
            <FrontmatterForm
              disabled={false}
              fields={outcomeFields}
              values={draft}
              onChange={handleDraftChange}
            />
          ) : session.outcome ? (
            <Card>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  <OutcomeStat
                    label={t('page.sessionDetail.testsLabel')}
                    value={session.outcome.testsPassing ? t('page.sessionDetail.passing') : t('page.sessionDetail.failing')}
                    color={session.outcome.testsPassing ? 'success' : 'danger'}
                  />
                  <OutcomeStat
                    label={t('page.sessionDetail.complianceLabel')}
                    value={`${session.outcome.complianceScore}%`}
                    color={scoreColor(session.outcome.complianceScore)}
                  />
                  <OutcomeStat
                    label={t('page.sessionDetail.revertsLabel')}
                    value={String(session.outcome.reverts)}
                    color={session.outcome.reverts > 0 ? 'warning' : 'default'}
                  />
                  <OutcomeStat
                    label={t('page.sessionDetail.reworksLabel')}
                    value={String(session.outcome.reworks)}
                    color={session.outcome.reworks > 0 ? 'warning' : 'default'}
                  />
                  {session.outcome.userFeedback && (
                    <OutcomeStat
                      label={t('page.sessionDetail.feedbackLabel')}
                      value={session.outcome.userFeedback}
                      color={session.outcome.userFeedback === 'positive' ? 'success' : session.outcome.userFeedback === 'negative' ? 'danger' : 'default'}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <p className="text-xs text-muted-foreground italic">{t('page.sessionDetail.noOutcome')}</p>
          )}
        </CollapsibleSection>

        {/* Section: Tasks */}
        <CollapsibleSection label={t('page.sessionDetail.tasksLabel', { completed: draftTasksCompleted.length, pending: draftTasksPending.length })}>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div>
              <EditableList
                label={t('page.sessionDetail.completedTasksLabel')}
                items={draftTasksCompleted}
                onChange={setDraftTasksCompleted}
                editing={editing}
                placeholder={t('page.sessionDetail.addTaskPlaceholder')}
              />
            </div>
            <div>
              <EditableList
                label={t('page.sessionDetail.pendingTasksLabel')}
                items={draftTasksPending}
                onChange={setDraftTasksPending}
                editing={editing}
                placeholder={t('page.sessionDetail.addTaskPlaceholder')}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Section: Files Modified */}
        {(draftFilesModified.length > 0 || editing) && (
          <CollapsibleSection label={t('page.sessionDetail.filesModified', { count: draftFilesModified.length })}>
            <EditableList
              items={draftFilesModified}
              onChange={setDraftFilesModified}
              editing={editing}
              placeholder={t('page.sessionDetail.addFilePlaceholder')}
            />
          </CollapsibleSection>
        )}

        {/* Section: Decisions */}
        {(draftDecisions.length > 0 || editing) && (
          <CollapsibleSection label={t('page.sessionDetail.decisions', { count: draftDecisions.length })}>
            <EditableStructuredList
              items={draftDecisions}
              onChange={setDraftDecisions}
              editing={editing}
              fields={[
                { key: 'decision', label: t('page.sessionDetail.decisionLabel'), placeholder: t('page.sessionDetail.decisionPlaceholder') },
                { key: 'reasoning', label: t('page.sessionDetail.reasoningLabel'), placeholder: t('page.sessionDetail.reasoningPlaceholder'), multiline: true },
              ]}
            />
          </CollapsibleSection>
        )}

        {/* Section: Errors Resolved */}
        {(draftErrors.length > 0 || editing) && (
          <CollapsibleSection label={t('page.sessionDetail.errorsResolved', { count: draftErrors.length })}>
            <EditableStructuredList
              items={draftErrors}
              onChange={setDraftErrors}
              editing={editing}
              fields={[
                { key: 'error', label: t('page.sessionDetail.errorLabel'), placeholder: t('page.sessionDetail.errorPlaceholder') },
                { key: 'fix', label: t('page.sessionDetail.fixLabel'), placeholder: t('page.sessionDetail.fixPlaceholder'), multiline: true },
              ]}
            />
          </CollapsibleSection>
        )}

        {/* Section: Observations */}
        <CollapsibleSection label={t('page.sessionDetail.observations', { count: observations.length })} defaultOpen>
          {observations.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">{t('page.sessionDetail.noObservations')}</p>
          ) : (
            <div className="space-y-2">
              {observations.map((obs) => (
                <ObservationCard key={obs.id} observation={obs} />
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* Section: Artifacts */}
        <CollapsibleSection label={`Artifacts (${artifacts.length})`} defaultOpen={artifacts.length > 0}>
          {artifacts.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No artifacts generated for this session</p>
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {artifacts.map((artifact) => (
                <ArtifactPreviewCard key={artifact.id} artifact={artifact} />
              ))}
            </div>
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Outcome stat — structured view of a single outcome metric
// ---------------------------------------------------------------------------

function OutcomeStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: 'success' | 'warning' | 'danger' | 'default';
}) {
  const colorClasses = {
    success: 'text-green-700 dark:text-green-400',
    warning: 'text-yellow-700 dark:text-yellow-400',
    danger: 'text-red-700 dark:text-red-400',
    default: 'text-foreground',
  };

  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold capitalize ${colorClasses[color]}`}>{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible Section — improved with chevron rotation
// ---------------------------------------------------------------------------

function CollapsibleSection({
  label,
  defaultOpen = false,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full cursor-pointer items-center gap-2 text-sm font-semibold text-foreground transition-colors duration-200 hover:text-primary"
      >
        {open ? (
          <ChevronDown size={14} className="text-muted-foreground transition-transform duration-200" />
        ) : (
          <ChevronRight size={14} className="text-muted-foreground transition-transform duration-200" />
        )}
        {label}
      </button>
      {open && (
        <div className="mt-3">
          {children}
        </div>
      )}
      {!open && <Separator className="mt-2" />}
    </div>
  );
}
