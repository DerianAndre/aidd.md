/**
 * Client-side markdown utilities for frontmatter parsing and extraction.
 * Handles multiline YAML values that the Rust parser cannot.
 */

export interface Frontmatter {
  [key: string]: string;
}

/**
 * Extract the first `# heading` from markdown content.
 * Returns null if no heading found.
 */
export function extractTitle(markdown: string): string | null {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() ?? null;
}

/**
 * Extract the first `> blockquote` line from markdown content.
 * Returns null if no blockquote found.
 */
export function extractDescription(markdown: string): string | null {
  const match = markdown.match(/^>\s*(.+)$/m);
  return match?.[1]?.trim() ?? null;
}

/**
 * Parse YAML frontmatter from a markdown string.
 * Handles multiline values using `>-` or `|` indicators,
 * and continuation lines (indented under a key).
 *
 * Returns { frontmatter, body } where body is the content after `---`.
 */
export function parseFrontmatter(content: string): {
  frontmatter: Frontmatter;
  body: string;
} {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith('---')) {
    return { frontmatter: {}, body: content };
  }

  const afterStart = trimmed.slice(3);
  const endIdx = afterStart.indexOf('\n---');
  if (endIdx === -1) {
    return { frontmatter: {}, body: content };
  }

  const yamlBlock = afterStart.slice(0, endIdx).trim();
  const body = afterStart.slice(endIdx + 4).trimStart();

  const frontmatter: Frontmatter = {};
  let currentKey: string | null = null;
  let currentValue = '';
  let isMultiline = false;

  for (const line of yamlBlock.split('\n')) {
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (trimmedLine === '' || trimmedLine.startsWith('#')) {
      if (isMultiline && currentKey) {
        currentValue += '\n';
      }
      continue;
    }

    // Check if this is a continuation line (indented)
    if (isMultiline && currentKey && (line.startsWith('  ') || line.startsWith('\t'))) {
      currentValue += (currentValue ? ' ' : '') + trimmedLine;
      continue;
    }

    // Save previous multiline key if we had one
    if (isMultiline && currentKey) {
      frontmatter[currentKey] = currentValue.trim();
      isMultiline = false;
      currentKey = null;
      currentValue = '';
    }

    // Parse key: value
    const colonIdx = trimmedLine.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmedLine.slice(0, colonIdx).trim();
    const rawValue = trimmedLine.slice(colonIdx + 1).trim();

    // Check for multiline indicators
    if (rawValue === '>-' || rawValue === '>' || rawValue === '|' || rawValue === '|-') {
      currentKey = key;
      currentValue = '';
      isMultiline = true;
      continue;
    }

    // Regular single-line value — strip quotes
    frontmatter[key] = rawValue.replace(/^["']|["']$/g, '');
  }

  // Flush last multiline key
  if (isMultiline && currentKey) {
    frontmatter[currentKey] = currentValue.trim();
  }

  return { frontmatter, body };
}

/**
 * Serialize a frontmatter object + body back to a full markdown string.
 * Simple values are unquoted unless they contain special YAML characters.
 */
export function serializeFrontmatter(frontmatter: Frontmatter, body: string): string {
  const entries = Object.entries(frontmatter).filter(
    ([, v]) => v !== undefined && v !== '',
  );

  if (entries.length === 0) {
    return body;
  }

  const SPECIAL_CHARS = /[:#{}[\],&*?|>!%@`]/;
  const yamlLines = entries.map(([key, value]) => {
    // Use quotes if the value contains special chars or looks like a number/boolean
    if (SPECIAL_CHARS.test(value) || /^(true|false|null|\d+\.?\d*)$/i.test(value)) {
      return `${key}: "${value.replace(/"/g, '\\"')}"`;
    }
    return `${key}: ${value}`;
  });

  return `---\n${yamlLines.join('\n')}\n---\n\n${body}`;
}

/**
 * Split a full markdown file into frontmatter string + body string.
 * Unlike parseFrontmatter, this returns the raw YAML block without parsing.
 */
export function splitFrontmatter(content: string): {
  rawFrontmatter: string;
  body: string;
} {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith('---')) {
    return { rawFrontmatter: '', body: content };
  }

  const afterStart = trimmed.slice(3);
  const endIdx = afterStart.indexOf('\n---');
  if (endIdx === -1) {
    return { rawFrontmatter: '', body: content };
  }

  return {
    rawFrontmatter: afterStart.slice(0, endIdx).trim(),
    body: afterStart.slice(endIdx + 4).trimStart(),
  };
}
