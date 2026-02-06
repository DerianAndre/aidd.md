import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { useEffect, useRef } from 'react';
import { useTheme } from '../theme/theme-provider';

export interface BlockEditorProps {
  /** Initial markdown content to render. */
  initialMarkdown?: string;
  /** Whether the editor is editable (default: true). */
  editable?: boolean;
  /** Called when content changes — receives markdown string. */
  onChange?: (markdown: string) => void;
  /** Additional CSS class for the wrapper. */
  className?: string;
}

export function BlockEditor({
  initialMarkdown = '',
  editable = true,
  onChange,
  className,
}: BlockEditorProps) {
  const { resolvedTheme } = useTheme();
  const initializedRef = useRef(false);

  const editor = useCreateBlockNote();

  // Load initial markdown content once on mount
  useEffect(() => {
    if (initializedRef.current) return;
    if (!initialMarkdown) return;

    initializedRef.current = true;
    void (async () => {
      const blocks = await editor.tryParseMarkdownToBlocks(initialMarkdown);
      editor.replaceBlocks(editor.document, blocks);
    })();
  }, [editor, initialMarkdown]);

  const handleChange = async () => {
    if (!onChange) return;
    const md = await editor.blocksToMarkdownLossy(editor.document);
    onChange(md);
  };

  return (
    <div className={className}>
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme={resolvedTheme}
        onChange={() => void handleChange()}
      />
    </div>
  );
}
