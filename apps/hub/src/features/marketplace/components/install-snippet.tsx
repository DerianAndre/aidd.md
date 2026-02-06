import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <div className="rounded-lg border border-border bg-muted/50">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void handleCopy()}
          aria-label="Copy to clipboard"
        >
          {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <pre className={`overflow-x-auto p-3 text-xs leading-relaxed ${language === 'json' ? 'text-accent' : 'text-foreground'}`}>
        <code>{code}</code>
      </pre>
    </div>
  );
}
