import { useEffect, useState, useCallback } from 'react';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Save, RotateCcw, X } from 'lucide-react';
import { PageHeader } from '../../../components/layout/page-header';
import { useConfigStore } from '../stores/config-store';
import { useProjectStore } from '../../../stores/project-store';
import type { AiddConfig } from '../../../lib/types';
import { DEFAULT_CONFIG } from '../../../lib/types';

export function ConfigPage() {
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

  const handleSave = useCallback(() => {
    if (activeProject?.path) void save(activeProject.path, local);
  }, [activeProject?.path, local, save]);

  const handleReset = useCallback(() => {
    reset();
    setLocal({ ...DEFAULT_CONFIG });
  }, [reset]);

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

  if (loading) {
    return (
      <div>
        <PageHeader title="Configuration" description="AIDD framework configuration" />
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
      <PageHeader title="Configuration" description="AIDD framework configuration" />

      {/* Action bar */}
      <div className="mb-6 flex items-center gap-2">
        <Button
          variant="default"
          size="sm"
          disabled={!isDirty || saving}
          onClick={handleSave}
        >
          <Save size={14} /> {saving ? 'Saving...' : 'Save'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={isDefault}
          onClick={handleReset}
        >
          <RotateCcw size={14} /> Reset to defaults
        </Button>
        {isDirty && (
          <Chip size="sm" color="warning">Unsaved changes</Chip>
        )}
      </div>

      <div className="space-y-4">
        {/* Evolution */}
        <Card className="border border-border bg-muted/50">
          <CardHeader>
            <CardTitle>Evolution</CardTitle>
            <CardDescription>Auto-framework mutation settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={local.evolution.enabled}
                onChange={(e) => update('evolution', 'enabled', e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label className="text-sm">Enabled</Label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={local.evolution.killSwitch}
                onChange={(e) => update('evolution', 'killSwitch', e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label className="text-sm">Kill switch (disable all mutations)</Label>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <div>
                <Label>Auto-apply threshold</Label>
                <Input
                  type="number"
                  value={local.evolution.autoApplyThreshold}
                  onChange={(e) => update('evolution', 'autoApplyThreshold', Number(e.target.value) || 90)}
                  min={0}
                  max={100}
                  className="w-24"
                />
              </div>
              <div>
                <Label>Draft threshold</Label>
                <Input
                  type="number"
                  value={local.evolution.draftThreshold}
                  onChange={(e) => update('evolution', 'draftThreshold', Number(e.target.value) || 70)}
                  min={0}
                  max={100}
                  className="w-24"
                />
              </div>
              <div>
                <Label>Learning period (sessions)</Label>
                <Input
                  type="number"
                  value={local.evolution.learningPeriodSessions}
                  onChange={(e) => update('evolution', 'learningPeriodSessions', Number(e.target.value) || 5)}
                  min={1}
                  max={100}
                  className="w-24"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Memory */}
        <Card className="border border-border bg-muted/50">
          <CardHeader>
            <CardTitle>Memory</CardTitle>
            <CardDescription>Session history and pruning settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={local.memory.autoPromoteBranchDecisions}
                onChange={(e) => update('memory', 'autoPromoteBranchDecisions', e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label className="text-sm">Auto-promote branch decisions</Label>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div>
                <Label>Max session history</Label>
                <Input
                  type="number"
                  value={local.memory.maxSessionHistory}
                  onChange={(e) => update('memory', 'maxSessionHistory', Number(e.target.value) || 100)}
                  min={10}
                  max={10000}
                  step={10}
                  className="w-28"
                />
              </div>
              <div>
                <Label>Prune after (days)</Label>
                <Input
                  type="number"
                  value={local.memory.pruneAfterDays}
                  onChange={(e) => update('memory', 'pruneAfterDays', Number(e.target.value) || 90)}
                  min={7}
                  max={365}
                  className="w-24"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Model Tracking */}
        <Card className="border border-border bg-muted/50">
          <CardHeader>
            <CardTitle>Model Tracking</CardTitle>
            <CardDescription>AI model performance tracking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={local.modelTracking.enabled}
                onChange={(e) => update('modelTracking', 'enabled', e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label className="text-sm">Enabled</Label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={local.modelTracking.crossProject}
                onChange={(e) => update('modelTracking', 'crossProject', e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label className="text-sm">Cross-project tracking</Label>
            </div>
          </CardContent>
        </Card>

        {/* CI */}
        <Card className="border border-border bg-muted/50">
          <CardHeader>
            <CardTitle>CI Rules</CardTitle>
            <CardDescription>Rule categories for CI/CD enforcement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TagField
              label="Block on"
              tags={local.ci.blockOn}
              onChange={(tags) => update('ci', 'blockOn', tags)}
            />
            <TagField
              label="Warn on"
              tags={local.ci.warnOn}
              onChange={(tags) => update('ci', 'warnOn', tags)}
            />
            <TagField
              label="Ignore"
              tags={local.ci.ignore}
              onChange={(tags) => update('ci', 'ignore', tags)}
            />
          </CardContent>
        </Card>

        {/* Content */}
        <Card className="border border-border bg-muted/50">
          <CardHeader>
            <CardTitle>Content</CardTitle>
            <CardDescription>How bundled and project content are merged</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label>Override mode</Label>
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
                    Merge — combine bundled + project content
                  </SelectItem>
                  <SelectItem value="project_only">
                    Project only — ignore bundled content
                  </SelectItem>
                  <SelectItem value="bundled_only">
                    Bundled only — ignore project overrides
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Simple tag input: list of chips + text field to add new ones. */
function TagField({
  label,
  tags,
  onChange,
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState('');

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput('');
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <Chip key={tag} size="sm" color="accent">
            <span className="flex items-center gap-1">
              {tag}
              <button
                type="button"
                className="ml-0.5 rounded hover:bg-accent"
                onClick={() => removeTag(tag)}
                aria-label={`Remove ${tag}`}
              >
                <X size={12} />
              </button>
            </span>
          </Chip>
        ))}
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="max-w-[160px] text-xs"
          placeholder="Add tag..."
          aria-label={`Add ${label}`}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag();
            }
          }}
        />
      </div>
    </div>
  );
}
