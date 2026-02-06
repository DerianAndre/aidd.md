import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
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
    <Card className="border border-border bg-muted/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm">{tool.name}</CardTitle>
          {tool.multiAction && (
            <Chip size="sm" color="warning">multi-action</Chip>
          )}
        </div>
        <CardDescription>{tool.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Package:</span>
          <Chip size="sm" color="accent">{tool.packageName}</Chip>
        </div>

        {tool.multiAction && tool.actions && (
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</p>
            <div className="flex flex-wrap gap-1">
              {tool.actions.map((a) => (
                <Chip key={a} size="sm" color="default">{a}</Chip>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Invocation snippet</p>
            <CopyButton text={snippet} />
          </div>
          <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs text-foreground">
            {snippet}
          </pre>
        </div>
      </CardContent>
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
    <Card className="border border-border bg-muted/50">
      <CardHeader>
        <CardTitle className="text-sm">{resource.uri}</CardTitle>
        <CardDescription>{resource.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Package:</span>
          <Chip size="sm" color="accent">{resource.packageName}</Chip>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Read snippet</p>
            <CopyButton text={snippet} />
          </div>
          <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs text-foreground">
            {snippet}
          </pre>
        </div>
      </CardContent>
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
    <Card className="border border-border bg-muted/50">
      <CardHeader>
        <CardTitle className="text-sm">{prompt.name}</CardTitle>
        <CardDescription>{prompt.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Package:</span>
          <Chip size="sm" color="accent">{prompt.packageName}</Chip>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Get snippet</p>
            <CopyButton text={snippet} />
          </div>
          <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs text-foreground">
            {snippet}
          </pre>
        </div>
      </CardContent>
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
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-auto px-1 py-0.5">
      {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
      <span className="text-[10px]">{copied ? 'Copied' : 'Copy'}</span>
    </Button>
  );
}
