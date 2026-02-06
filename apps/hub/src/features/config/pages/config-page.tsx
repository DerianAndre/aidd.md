import { useEffect, useState, useCallback } from 'react';
import {
  Card, Button, Switch, NumberField, Select, ListBox, Label, Chip, Skeleton, TextField, Input,
} from '@heroui/react';
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
          variant="primary"
          size="sm"
          isDisabled={!isDirty || saving}
          onPress={handleSave}
        >
          <Save size={14} /> {saving ? 'Saving...' : 'Save'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          isDisabled={isDefault}
          onPress={handleReset}
        >
          <RotateCcw size={14} /> Reset to defaults
        </Button>
        {isDirty && (
          <Chip size="sm" variant="soft" color="warning">Unsaved changes</Chip>
        )}
      </div>

      <div className="space-y-4">
        {/* Evolution */}
        <Card className="border border-default-200 bg-default-50">
          <Card.Header>
            <Card.Title>Evolution</Card.Title>
            <Card.Description>Auto-framework mutation settings</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-4">
            <Switch
              isSelected={local.evolution.enabled}
              onChange={(val) => update('evolution', 'enabled', val)}
            >
              <Switch.Control><Switch.Thumb /></Switch.Control>
              <Label className="text-sm">Enabled</Label>
            </Switch>
            <Switch
              isSelected={local.evolution.killSwitch}
              onChange={(val) => update('evolution', 'killSwitch', val)}
            >
              <Switch.Control><Switch.Thumb /></Switch.Control>
              <Label className="text-sm">Kill switch (disable all mutations)</Label>
            </Switch>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <NumberField
                value={local.evolution.autoApplyThreshold}
                onChange={(val) => update('evolution', 'autoApplyThreshold', val ?? 90)}
                minValue={0}
                maxValue={100}
              >
                <Label>Auto-apply threshold</Label>
                <NumberField.Group>
                  <NumberField.DecrementButton />
                  <NumberField.Input className="w-20" />
                  <NumberField.IncrementButton />
                </NumberField.Group>
              </NumberField>
              <NumberField
                value={local.evolution.draftThreshold}
                onChange={(val) => update('evolution', 'draftThreshold', val ?? 70)}
                minValue={0}
                maxValue={100}
              >
                <Label>Draft threshold</Label>
                <NumberField.Group>
                  <NumberField.DecrementButton />
                  <NumberField.Input className="w-20" />
                  <NumberField.IncrementButton />
                </NumberField.Group>
              </NumberField>
              <NumberField
                value={local.evolution.learningPeriodSessions}
                onChange={(val) => update('evolution', 'learningPeriodSessions', val ?? 5)}
                minValue={1}
                maxValue={100}
              >
                <Label>Learning period (sessions)</Label>
                <NumberField.Group>
                  <NumberField.DecrementButton />
                  <NumberField.Input className="w-20" />
                  <NumberField.IncrementButton />
                </NumberField.Group>
              </NumberField>
            </div>
          </Card.Content>
        </Card>

        {/* Memory */}
        <Card className="border border-default-200 bg-default-50">
          <Card.Header>
            <Card.Title>Memory</Card.Title>
            <Card.Description>Session history and pruning settings</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-4">
            <Switch
              isSelected={local.memory.autoPromoteBranchDecisions}
              onChange={(val) => update('memory', 'autoPromoteBranchDecisions', val)}
            >
              <Switch.Control><Switch.Thumb /></Switch.Control>
              <Label className="text-sm">Auto-promote branch decisions</Label>
            </Switch>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <NumberField
                value={local.memory.maxSessionHistory}
                onChange={(val) => update('memory', 'maxSessionHistory', val ?? 100)}
                minValue={10}
                maxValue={10000}
                step={10}
              >
                <Label>Max session history</Label>
                <NumberField.Group>
                  <NumberField.DecrementButton />
                  <NumberField.Input className="w-24" />
                  <NumberField.IncrementButton />
                </NumberField.Group>
              </NumberField>
              <NumberField
                value={local.memory.pruneAfterDays}
                onChange={(val) => update('memory', 'pruneAfterDays', val ?? 90)}
                minValue={7}
                maxValue={365}
              >
                <Label>Prune after (days)</Label>
                <NumberField.Group>
                  <NumberField.DecrementButton />
                  <NumberField.Input className="w-20" />
                  <NumberField.IncrementButton />
                </NumberField.Group>
              </NumberField>
            </div>
          </Card.Content>
        </Card>

        {/* Model Tracking */}
        <Card className="border border-default-200 bg-default-50">
          <Card.Header>
            <Card.Title>Model Tracking</Card.Title>
            <Card.Description>AI model performance tracking</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-3">
            <Switch
              isSelected={local.modelTracking.enabled}
              onChange={(val) => update('modelTracking', 'enabled', val)}
            >
              <Switch.Control><Switch.Thumb /></Switch.Control>
              <Label className="text-sm">Enabled</Label>
            </Switch>
            <Switch
              isSelected={local.modelTracking.crossProject}
              onChange={(val) => update('modelTracking', 'crossProject', val)}
            >
              <Switch.Control><Switch.Thumb /></Switch.Control>
              <Label className="text-sm">Cross-project tracking</Label>
            </Switch>
          </Card.Content>
        </Card>

        {/* CI */}
        <Card className="border border-default-200 bg-default-50">
          <Card.Header>
            <Card.Title>CI Rules</Card.Title>
            <Card.Description>Rule categories for CI/CD enforcement</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-4">
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
          </Card.Content>
        </Card>

        {/* Content */}
        <Card className="border border-default-200 bg-default-50">
          <Card.Header>
            <Card.Title>Content</Card.Title>
            <Card.Description>How bundled and project content are merged</Card.Description>
          </Card.Header>
          <Card.Content>
            <Select
              selectedKey={local.content.overrideMode}
              onSelectionChange={(key) => {
                if (key) update('content', 'overrideMode', String(key) as AiddConfig['content']['overrideMode']);
              }}
            >
              <Label>Override mode</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item key="merge" id="merge" textValue="Merge">
                    Merge — combine bundled + project content
                  </ListBox.Item>
                  <ListBox.Item key="project_only" id="project_only" textValue="Project only">
                    Project only — ignore bundled content
                  </ListBox.Item>
                  <ListBox.Item key="bundled_only" id="bundled_only" textValue="Bundled only">
                    Bundled only — ignore project overrides
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
          </Card.Content>
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
      <span className="mb-1 block text-xs font-medium text-default-500">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <Chip key={tag} size="sm" variant="soft" color="accent">
            <span className="flex items-center gap-1">
              {tag}
              <button
                type="button"
                className="ml-0.5 rounded hover:bg-default-200"
                onClick={() => removeTag(tag)}
                aria-label={`Remove ${tag}`}
              >
                <X size={12} />
              </button>
            </span>
          </Chip>
        ))}
        <TextField
          value={input}
          onChange={setInput}
          className="max-w-[160px]"
          aria-label={`Add ${label}`}
        >
          <Input
            placeholder="Add tag..."
            className="text-xs"
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
          />
        </TextField>
      </div>
    </div>
  );
}
