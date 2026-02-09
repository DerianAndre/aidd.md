import { useEffect, useState, useCallback } from 'react';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Field, FieldLabel, FieldDescription, FieldGroup, FieldContent,
} from '@/components/ui/field';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Save, RotateCcw, Languages, Palette, Dna, BrainCircuit, Activity, ShieldCheck, FileStack,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/layout/page-header';
import { useTheme } from '@/components/theme/theme-provider';
import { showSuccess, showError } from '@/lib/toast';
import { useConfigStore } from '../stores/config-store';
import { useProjectStore } from '@/stores/project-store';
import type { AiddConfig } from '@/lib/types';
import { DEFAULT_CONFIG } from '@/lib/types';
import { TagField } from '../components/tag-field';

export function ConfigPage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const activeProject = useProjectStore((s) => s.activeProject);
  const { config, loading, stale, saving, fetch, save, reset } = useConfigStore();
  const [local, setLocal] = useState<AiddConfig>(config);

  useEffect(() => {
    if (activeProject?.path && stale) {
      void fetch(activeProject.path);
    }
  }, [activeProject?.path, stale, fetch]);

  useEffect(() => {
    setLocal(config);
  }, [config]);

  const isDirty = JSON.stringify(local) !== JSON.stringify(config);
  const isDefault = JSON.stringify(local) === JSON.stringify(DEFAULT_CONFIG);

  const handleSave = useCallback(async () => {
    if (!activeProject?.path) return;
    const ok = await save(activeProject.path, local);
    if (ok) {
      showSuccess(t('page.config.saveSuccess'));
    } else {
      showError(t('page.config.saveError'));
    }
  }, [activeProject?.path, local, save, t]);

  const handleReset = useCallback(() => {
    reset();
    setLocal({ ...DEFAULT_CONFIG });
    showSuccess(t('page.config.resetSuccess'));
  }, [reset, t]);

  const update = <S extends keyof AiddConfig, K extends keyof AiddConfig[S]>(
    section: S,
    key: K,
    value: AiddConfig[S][K],
  ) => {
    setLocal((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  // Ctrl+S / Cmd+S save shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty && !saving && activeProject?.path) {
          void handleSave();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isDirty, saving, activeProject?.path, handleSave]);

  if (loading) {
    return (
      <div>
        <PageHeader title={t('page.config.title')} description={t('page.config.description')} />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t('page.config.title')}
        description={t('page.config.description')}
        actions={
          <>
            <Button
              variant="default"
              size="sm"
              disabled={!isDirty || saving}
              onClick={() => void handleSave()}
            >
              <Save size={14} /> {saving ? t('common.saving') : t('common.save')}
            </Button>
            <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground sm:inline-block">
              Ctrl+S
            </kbd>
            <Button
              variant="outline"
              size="sm"
              disabled={isDefault}
              onClick={handleReset}
            >
              <RotateCcw size={14} /> {t('common.resetToDefaults')}
            </Button>
            {isDirty && (
              <Chip size="sm" color="warning">{t('common.unsavedChanges')}</Chip>
            )}
          </>
        }
      />

      <div className="space-y-4">
        {/* Row 1: Language + Theme + Content */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Language */}
          <Card className="border border-border bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Languages size={16} className="text-muted-foreground" />
                {t('page.config.language.title')}
              </CardTitle>
              <CardDescription>{t('page.config.language.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Field>
                <Select
                  value={i18n.language}
                  onValueChange={(lng) => i18n.changeLanguage(lng)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </CardContent>
          </Card>

          {/* Theme */}
          <Card className="border border-border bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette size={16} className="text-muted-foreground" />
                {t('page.config.theme.title')}
              </CardTitle>
              <CardDescription>{t('page.config.theme.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Field>
                <Select
                  value={theme}
                  onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">{t('page.config.theme.light')}</SelectItem>
                    <SelectItem value="dark">{t('page.config.theme.dark')}</SelectItem>
                    <SelectItem value="system">{t('page.config.theme.system')}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </CardContent>
          </Card>

          {/* Content */}
          <Card className="border border-border bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileStack size={16} className="text-muted-foreground" />
                {t('page.config.content.title')}
              </CardTitle>
              <CardDescription>{t('page.config.content.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Field>
                <FieldLabel>{t('page.config.content.overrideMode')}</FieldLabel>
                <Select
                  value={local.content.overrideMode}
                  onValueChange={(value) => {
                    update('content', 'overrideMode', value as AiddConfig['content']['overrideMode']);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="merge">
                      {t('page.config.content.merge')}
                    </SelectItem>
                    <SelectItem value="project_only">
                      {t('page.config.content.projectOnly')}
                    </SelectItem>
                    <SelectItem value="bundled_only">
                      {t('page.config.content.bundledOnly')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </CardContent>
          </Card>
        </div>

        {/* Evolution (full width) */}
        <Card className="border border-border bg-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dna size={16} className="text-muted-foreground" />
              {t('page.config.evolution.title')}
            </CardTitle>
            <CardDescription>{t('page.config.evolution.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="evolution-enabled">{t('common.enabled')}</FieldLabel>
                </FieldContent>
                <Switch
                  id="evolution-enabled"
                  size="sm"
                  checked={local.evolution.enabled}
                  onCheckedChange={(v) => update('evolution', 'enabled', v)}
                />
              </Field>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="evolution-kill-switch">{t('page.config.evolution.killSwitch')}</FieldLabel>
                </FieldContent>
                <Switch
                  id="evolution-kill-switch"
                  size="sm"
                  checked={local.evolution.killSwitch}
                  onCheckedChange={(v) => update('evolution', 'killSwitch', v)}
                />
              </Field>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                <Field>
                  <FieldLabel>{t('page.config.evolution.autoApplyThreshold')}</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={local.evolution.autoApplyThreshold}
                      onChange={(e) => update('evolution', 'autoApplyThreshold', Number(e.target.value) || 90)}
                      min={0}
                      max={100}
                      className="w-24"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                  <FieldDescription>
                    {t('page.config.evolution.autoApplyThresholdHint')}
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel>{t('page.config.evolution.draftThreshold')}</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={local.evolution.draftThreshold}
                      onChange={(e) => update('evolution', 'draftThreshold', Number(e.target.value) || 70)}
                      min={0}
                      max={100}
                      className="w-24"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                  <FieldDescription>
                    {t('page.config.evolution.draftThresholdHint')}
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel>{t('page.config.evolution.learningPeriod')}</FieldLabel>
                  <Input
                    type="number"
                    value={local.evolution.learningPeriodSessions}
                    onChange={(e) => update('evolution', 'learningPeriodSessions', Number(e.target.value) || 5)}
                    min={1}
                    max={100}
                    className="w-24"
                  />
                  <FieldDescription>
                    {t('page.config.evolution.learningPeriodHint')}
                  </FieldDescription>
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Row 3: Memory + Model Tracking */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Memory */}
          <Card className="border border-border bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit size={16} className="text-muted-foreground" />
                {t('page.config.memory.title')}
              </CardTitle>
              <CardDescription>{t('page.config.memory.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor="memory-auto-promote">{t('page.config.memory.autoPromote')}</FieldLabel>
                  </FieldContent>
                  <Switch
                    id="memory-auto-promote"
                    size="sm"
                    checked={local.memory.autoPromoteBranchDecisions}
                    onCheckedChange={(v) => update('memory', 'autoPromoteBranchDecisions', v)}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t('page.config.memory.maxSessionHistory')}</FieldLabel>
                  <Input
                    type="number"
                    value={local.memory.maxSessionHistory}
                    onChange={(e) => update('memory', 'maxSessionHistory', Number(e.target.value) || 100)}
                    min={10}
                    max={10000}
                    step={10}
                    className="w-28"
                  />
                  <FieldDescription>
                    {t('page.config.memory.maxSessionHistoryHint')}
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel>{t('page.config.memory.pruneAfterDays')}</FieldLabel>
                  <Input
                    type="number"
                    value={local.memory.pruneAfterDays}
                    onChange={(e) => update('memory', 'pruneAfterDays', Number(e.target.value) || 90)}
                    min={7}
                    max={365}
                    className="w-24"
                  />
                  <FieldDescription>
                    {t('page.config.memory.pruneAfterDaysHint')}
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          {/* Model Tracking */}
          <Card className="border border-border bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity size={16} className="text-muted-foreground" />
                {t('page.config.modelTracking.title')}
              </CardTitle>
              <CardDescription>{t('page.config.modelTracking.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor="model-tracking-enabled">{t('common.enabled')}</FieldLabel>
                  </FieldContent>
                  <Switch
                    id="model-tracking-enabled"
                    size="sm"
                    checked={local.modelTracking.enabled}
                    onCheckedChange={(v) => update('modelTracking', 'enabled', v)}
                  />
                </Field>
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor="model-tracking-cross-project">{t('page.config.modelTracking.crossProject')}</FieldLabel>
                  </FieldContent>
                  <Switch
                    id="model-tracking-cross-project"
                    size="sm"
                    checked={local.modelTracking.crossProject}
                    onCheckedChange={(v) => update('modelTracking', 'crossProject', v)}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        </div>

        {/* CI Rules (full width) */}
        <Card className="border border-border bg-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-muted-foreground" />
              {t('page.config.ci.title')}
            </CardTitle>
            <CardDescription>{t('page.config.ci.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <TagField
                label={t('page.config.ci.blockOn')}
                tags={local.ci.blockOn}
                onChange={(tags) => update('ci', 'blockOn', tags)}
              />
              <TagField
                label={t('page.config.ci.warnOn')}
                tags={local.ci.warnOn}
                onChange={(tags) => update('ci', 'warnOn', tags)}
              />
              <TagField
                label={t('page.config.ci.ignore')}
                tags={local.ci.ignore}
                onChange={(tags) => update('ci', 'ignore', tags)}
              />
            </FieldGroup>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
