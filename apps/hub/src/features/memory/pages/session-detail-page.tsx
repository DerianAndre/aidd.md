import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronsUpDown, Pencil, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PageHeader } from '../../../components/layout/page-header';
import { EmptyState } from '../../../components/empty-state';
import { ObservationCard } from '../components/observation-card';
import { BlockEditor } from '../../../components/editor';
import { FrontmatterForm } from '../../../components/editor/frontmatter-form';
import { EditableList, EditableStructuredList } from '../../../components/editable-list';
import { useSessionsStore } from '../stores/sessions-store';
import { useProjectStore } from '../../../stores/project-store';
import { showSuccess, showError } from '../../../lib/toast';
import { formatDuration, formatDate, scoreColor } from '../../../lib/utils';
import type { SessionState, SessionObservation, SessionUpdatePayload } from '../../../lib/types';
import type { FieldDefinition } from '../../../components/editor/frontmatter-form';

// ---------------------------------------------------------------------------
// Select options for task classification
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
  { label: 'None', value: '' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SessionDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const activeProject = useProjectStore((s) => s.activeProject);
  const { activeSessions, completedSessions, stale, fetchAll, fetchObservations, editSessionFull } = useSessionsStore();

  const [session, setSession] = useState<SessionState | null>(null);
  const [observations, setObservations] = useState<SessionObservation[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [draftInput, setDraftInput] = useState('');
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
        const obs = await fetchObservations(activeProject.path, found.id, status);
        setObservations(obs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }
      setLoading(false);
    })();
  }, [activeProject?.path, id, stale, fetchAll, activeSessions, completedSessions, fetchObservations]);

  // Build flat draft values from session whenever session changes or we enter edit mode
  const populateDraft = useCallback((s: SessionState) => {
    setDraft({
      branch: s.branch ?? '',
      provider: `${s.aiProvider?.provider ?? '—'} / ${(s.aiProvider?.model ?? '').replace('claude-', '').replace(/-\d{8}$/, '')}`,
      duration: s.endedAt
        ? formatDuration(new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime())
        : 'In progress',
      taskDomain: s.taskClassification?.domain ?? '',
      taskNature: s.taskClassification?.nature ?? '',
      taskComplexity: s.taskClassification?.complexity ?? '',
      testsPassing: String(s.outcome?.testsPassing ?? false),
      complianceScore: String(s.outcome?.complianceScore ?? 0),
      reverts: String(s.outcome?.reverts ?? 0),
      reworks: String(s.outcome?.reworks ?? 0),
      userFeedback: s.outcome?.userFeedback ?? '',
    });
    setDraftInput(s.input ?? '');
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
        branch: draft.branch,
        input: draftInput,
        output: draftOutput,
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
          userFeedback: (draft.userFeedback || undefined) as SessionUpdatePayload['outcome'] extends { userFeedback?: infer U } ? U : never,
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
  }, [session, draft, draftInput, draftOutput, draftTasksCompleted, draftTasksPending, draftFilesModified, draftDecisions, draftErrors, editSessionFull, t]);

  // Escape key cancels
  useEffect(() => {
    if (!editing) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editing, handleCancel]);

  // Field definitions
  const metadataFields: FieldDefinition[] = useMemo(() => [
    { type: 'text', key: 'branch', label: t('page.sessionDetail.branch') },
    { type: 'readonly', key: 'provider', label: t('page.sessionDetail.provider') },
    { type: 'readonly', key: 'duration', label: t('page.sessionDetail.duration') },
    { type: 'select', key: 'taskDomain', label: t('page.sessionDetail.classification') + ' — Domain', options: DOMAIN_OPTIONS },
    { type: 'select', key: 'taskNature', label: t('page.sessionDetail.classification') + ' — Nature', options: NATURE_OPTIONS },
    { type: 'select', key: 'taskComplexity', label: t('page.sessionDetail.classification') + ' — Complexity', options: COMPLEXITY_OPTIONS },
  ], [t]);

  const outcomeFields: FieldDefinition[] = useMemo(() => [
    { type: 'switch', key: 'testsPassing', label: t('page.sessionDetail.testsPassing').replace('Tests: ', '') },
    { type: 'number', key: 'complianceScore', label: 'Compliance Score', min: 0, max: 100 },
    { type: 'number', key: 'reverts', label: 'Reverts', min: 0 },
    { type: 'number', key: 'reworks', label: 'Reworks', min: 0 },
    { type: 'select', key: 'userFeedback', label: 'User Feedback', options: FEEDBACK_OPTIONS },
  ], [t]);

  const handleDraftChange = useCallback((key: string, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

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

  const modelLabel = (session.aiProvider?.model ?? '').replace('claude-', '').replace(/-\d{8}$/, '');

  return (
    <div>
      <PageHeader
        title={editing ? t('page.sessions.editSession') : t('page.sessionDetail.title', { branch: session.branch })}
        description={`${modelLabel} · ${formatDate(session.startedAt)}`}
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
              <Button size="sm" variant="ghost" onClick={handleEdit}>
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
        <CollapsibleSection label={t('page.sessionDetail.branch')} defaultOpen>
          <FrontmatterForm
            disabled={!editing}
            fields={metadataFields}
            values={draft}
            onChange={handleDraftChange}
          />
        </CollapsibleSection>

        {/* Section: Input / Output */}
        <CollapsibleSection label={`${t('page.sessionDetail.input')} / ${t('page.sessionDetail.output')}`} defaultOpen>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <Card className="gap-0 py-0 overflow-hidden">
              <CardContent className="p-0">
                <p className="px-4 pt-3 text-[10px] font-medium uppercase text-muted-foreground">{t('page.sessionDetail.input')}</p>
                <BlockEditor
                  initialMarkdown={draftInput}
                  editable={editing}
                  onChange={editing ? setDraftInput : undefined}
                />
              </CardContent>
            </Card>
            <Card className="gap-0 py-0 overflow-hidden">
              <CardContent className="p-0">
                <p className="px-4 pt-3 text-[10px] font-medium uppercase text-muted-foreground">{t('page.sessionDetail.output')}</p>
                <BlockEditor
                  initialMarkdown={draftOutput}
                  editable={editing}
                  onChange={editing ? setDraftOutput : undefined}
                />
              </CardContent>
            </Card>
          </div>
        </CollapsibleSection>

        {/* Section: Outcome */}
        <CollapsibleSection label={t('page.sessionDetail.outcome')} defaultOpen>
          {!editing && session.outcome ? (
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
          ) : editing ? (
            <FrontmatterForm
              disabled={false}
              fields={outcomeFields}
              values={draft}
              onChange={handleDraftChange}
            />
          ) : (
            <p className="text-xs text-muted-foreground">No outcome recorded.</p>
          )}
        </CollapsibleSection>

        {/* Section: Tasks */}
        <CollapsibleSection label={t('page.sessionDetail.completedTasks', { count: draftTasksCompleted.length })}>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div>
              <EditableList
                label="Completed Tasks"
                items={draftTasksCompleted}
                onChange={setDraftTasksCompleted}
                editing={editing}
                placeholder="Add completed task..."
              />
            </div>
            <div>
              <EditableList
                label="Pending Tasks"
                items={draftTasksPending}
                onChange={setDraftTasksPending}
                editing={editing}
                placeholder="Add pending task..."
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Section: Files Modified */}
        {(draftFilesModified.length > 0 || editing) && (
          <CollapsibleSection label={`Files Modified (${draftFilesModified.length})`}>
            <EditableList
              items={draftFilesModified}
              onChange={setDraftFilesModified}
              editing={editing}
              placeholder="Add file path..."
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
                { key: 'decision', label: 'Decision', placeholder: 'Decision...' },
                { key: 'reasoning', label: 'Reasoning', placeholder: 'Reasoning...', multiline: true },
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
                { key: 'error', label: 'Error', placeholder: 'Error description...' },
                { key: 'fix', label: 'Fix', placeholder: 'How it was fixed...', multiline: true },
              ]}
            />
          </CollapsibleSection>
        )}

        {/* Section: Observations — always read-only */}
        <CollapsibleSection label={t('page.sessionDetail.observations', { count: observations.length })} defaultOpen>
          {observations.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('page.sessionDetail.noObservations')}</p>
          ) : (
            <div className="space-y-2">
              {observations.map((obs) => (
                <ObservationCard key={obs.id} observation={obs} />
              ))}
            </div>
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible Section wrapper
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
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-2 text-sm font-semibold text-foreground transition-colors duration-200 hover:text-accent-foreground">
        <ChevronsUpDown size={14} className="text-muted-foreground" />
        {label}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
