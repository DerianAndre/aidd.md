import { Card, Chip, Button } from '@heroui/react';
import { Copy, Check } from 'lucide-react';
import { useState, useCallback } from 'react';
import type { McpToolInfo, McpResourceInfo, McpPromptInfo } from '../lib/mcp-catalog';

// ---------------------------------------------------------------------------
// Tool detail
// ---------------------------------------------------------------------------

interface ToolDetailProps {
  tool: McpToolInfo & { packageName: string };
}

export function ToolDetail({ tool }: ToolDetailProps) {
  const snippet = JSON.stringify(
    { method: 'tools/call', params: { name: tool.name, arguments: {} } },
    null,
    2,
  );

  return (
    <Card className="border border-default-200 bg-default-50">
      <Card.Header>
        <div className="flex items-center gap-2">
          <Card.Title className="text-sm">{tool.name}</Card.Title>
          {tool.multiAction && (
            <Chip size="sm" variant="soft" color="warning">multi-action</Chip>
          )}
        </div>
        <Card.Description>{tool.description}</Card.Description>
      </Card.Header>
      <Card.Content className="space-y-3">
        <div className="flex items-center gap-1.5 text-xs text-default-500">
          <span>Package:</span>
          <Chip size="sm" variant="soft" color="accent">{tool.packageName}</Chip>
        </div>

        {tool.multiAction && tool.actions && (
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-default-400">Actions</p>
            <div className="flex flex-wrap gap-1">
              {tool.actions.map((a) => (
                <Chip key={a} size="sm" variant="soft" color="default">{a}</Chip>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-default-400">Invocation snippet</p>
            <CopyButton text={snippet} />
          </div>
          <pre className="overflow-x-auto rounded-lg bg-default-100 p-3 text-xs text-default-700">
            {snippet}
          </pre>
        </div>
      </Card.Content>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Resource detail
// ---------------------------------------------------------------------------

interface ResourceDetailProps {
  resource: McpResourceInfo & { packageName: string };
}

export function ResourceDetail({ resource }: ResourceDetailProps) {
  const snippet = JSON.stringify(
    { method: 'resources/read', params: { uri: resource.uri } },
    null,
    2,
  );

  return (
    <Card className="border border-default-200 bg-default-50">
      <Card.Header>
        <Card.Title className="text-sm">{resource.uri}</Card.Title>
        <Card.Description>{resource.description}</Card.Description>
      </Card.Header>
      <Card.Content className="space-y-3">
        <div className="flex items-center gap-1.5 text-xs text-default-500">
          <span>Package:</span>
          <Chip size="sm" variant="soft" color="accent">{resource.packageName}</Chip>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-default-400">Read snippet</p>
            <CopyButton text={snippet} />
          </div>
          <pre className="overflow-x-auto rounded-lg bg-default-100 p-3 text-xs text-default-700">
            {snippet}
          </pre>
        </div>
      </Card.Content>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Prompt detail
// ---------------------------------------------------------------------------

interface PromptDetailProps {
  prompt: McpPromptInfo & { packageName: string };
}

export function PromptDetail({ prompt }: PromptDetailProps) {
  const snippet = JSON.stringify(
    { method: 'prompts/get', params: { name: prompt.name, arguments: {} } },
    null,
    2,
  );

  return (
    <Card className="border border-default-200 bg-default-50">
      <Card.Header>
        <Card.Title className="text-sm">{prompt.name}</Card.Title>
        <Card.Description>{prompt.description}</Card.Description>
      </Card.Header>
      <Card.Content className="space-y-3">
        <div className="flex items-center gap-1.5 text-xs text-default-500">
          <span>Package:</span>
          <Chip size="sm" variant="soft" color="accent">{prompt.packageName}</Chip>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-default-400">Get snippet</p>
            <CopyButton text={snippet} />
          </div>
          <pre className="overflow-x-auto rounded-lg bg-default-100 p-3 text-xs text-default-700">
            {snippet}
          </pre>
        </div>
      </Card.Content>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Copy button
// ---------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);

  return (
    <Button variant="ghost" size="sm" onPress={handleCopy} className="h-auto px-1 py-0.5">
      {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
      <span className="text-[10px]">{copied ? 'Copied' : 'Copy'}</span>
    </Button>
  );
}
