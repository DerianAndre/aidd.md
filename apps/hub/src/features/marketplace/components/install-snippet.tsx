import { useState } from 'react';
import { Button } from '@heroui/react';
import { Copy, Check } from 'lucide-react';

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
    <div className="rounded-lg border border-default-200 bg-default-50">
      <div className="flex items-center justify-between border-b border-default-200 px-3 py-2">
        <span className="text-xs font-medium text-default-500">{label}</span>
        <Button
          size="sm"
          variant="ghost"
          onPress={() => void handleCopy()}
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
