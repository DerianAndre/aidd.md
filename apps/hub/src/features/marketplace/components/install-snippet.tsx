import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardAction, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export interface InstallSnippetProps {
  /** Label above the snippet (e.g., "JSON Config" or "CLI Command") */
  label: string;
  /** The code to display and copy */
  code: string;
  /** Language hint for styling */
  language?: 'json' | 'bash';
}

export function InstallSnippet({ label, code, language = 'json' }: InstallSnippetProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <CardAction>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void handleCopy()}
            aria-label="Copy to clipboard"
          >
            {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </CardAction>
      </CardHeader>
      <Separator />
      <CardContent className="px-3 py-0">
        <pre className={`overflow-x-auto py-3 text-xs leading-relaxed ${language === 'json' ? 'text-accent' : 'text-foreground'}`}>
          <code>{code}</code>
        </pre>
      </CardContent>
    </Card>
  );
}
