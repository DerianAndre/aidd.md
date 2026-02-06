/** Parse YAML-like frontmatter from a markdown file. */
export function parseFrontmatter(content: string): {
  frontmatter: Record<string, string>;
  body: string;
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const [, rawFrontmatter, body] = match;
  const frontmatter: Record<string, string> = {};

  if (rawFrontmatter) {
    for (const line of rawFrontmatter.split('\n')) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();
        frontmatter[key] = value;
      }
    }
  }

  return { frontmatter, body: body ?? '' };
}

/** Extract the title (first # heading) from markdown content. */
export function extractTitle(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() ?? null;
}

/** Generate a unique ID for sessions, branches, etc. */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}`;
}

/** Get the current ISO timestamp. */
export function now(): string {
  return new Date().toISOString();
}

/** Strip `<private>...</private>` tags from text, replacing with [REDACTED]. */
export function stripPrivateTags(text: string): string {
  return text.replace(/<private>[\s\S]*?<\/private>/g, '[REDACTED]');
}

/** Estimate token count (~85% accurate for English text). */
export function estimateTokens(text: string): number {
  const words = text.split(/\s+/).filter(Boolean);
  return Math.ceil(words.length * 1.3);
}

/** Truncate text to fit within a token budget. */
export function truncateToTokens(text: string, maxTokens: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  const targetWords = Math.floor(maxTokens / 1.3);
  if (words.length <= targetWords) return text;
  return words.slice(0, targetWords).join(' ') + '\n[... truncated]';
}

/** Deep merge two objects (override wins on conflict). */
export function deepMerge<T extends object>(
  base: T,
  override: Partial<T>,
): T {
  const result = { ...base };

  for (const key of Object.keys(override) as Array<keyof T>) {
    const overrideValue = override[key];
    const baseValue = result[key];

    if (
      overrideValue !== undefined &&
      typeof overrideValue === 'object' &&
      overrideValue !== null &&
      !Array.isArray(overrideValue) &&
      typeof baseValue === 'object' &&
      baseValue !== null &&
      !Array.isArray(baseValue)
    ) {
      result[key] = deepMerge(
        baseValue as Record<string, unknown>,
        overrideValue as Record<string, unknown>,
      ) as T[keyof T];
    } else if (overrideValue !== undefined) {
      result[key] = overrideValue as T[keyof T];
    }
  }

  return result;
}
