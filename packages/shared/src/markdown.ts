/**
 * Markdown parsing utilities for extracting structured data from AIDD content files.
 * Used by routing, knowledge, and guidance modules.
 */

/** Parsed markdown table. */
export interface MarkdownTable {
  headers: string[];
  rows: string[][];
}

/** Parse the first markdown table found in text. Returns headers + rows. */
export function parseMarkdownTable(text: string): MarkdownTable | null {
  const lines = text.split('\n');
  let headerLine = -1;

  // Find the header row (first line with | delimiters)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      // Check if next line is a separator (|---|---|)
      const nextLine = lines[i + 1]?.trim() ?? '';
      if (/^\|[\s\-:|]+\|$/.test(nextLine)) {
        headerLine = i;
        break;
      }
    }
  }

  if (headerLine === -1) return null;

  const headers = parsePipeLine(lines[headerLine]!);
  const rows: string[][] = [];

  // Parse data rows (skip separator at headerLine+1)
  for (let i = headerLine + 2; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line.startsWith('|')) break; // End of table
    if (line === '') break;
    rows.push(parsePipeLine(line));
  }

  return { headers, rows };
}

/** Parse all markdown tables in text. */
export function parseAllMarkdownTables(text: string): MarkdownTable[] {
  const tables: MarkdownTable[] = [];
  const lines = text.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!.trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      const nextLine = lines[i + 1]?.trim() ?? '';
      if (/^\|[\s\-:|]+\|$/.test(nextLine)) {
        const headers = parsePipeLine(line);
        const rows: string[][] = [];

        // Skip separator
        let j = i + 2;
        while (j < lines.length) {
          const dataLine = lines[j]!.trim();
          if (!dataLine.startsWith('|') || dataLine === '') break;
          rows.push(parsePipeLine(dataLine));
          j++;
        }

        tables.push({ headers, rows });
        i = j;
        continue;
      }
    }
    i++;
  }

  return tables;
}

/** Extract a markdown section by heading text (e.g., "## 2. AIDD Mode"). */
export function extractSection(markdown: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Match heading with any number of # prefix
  const pattern = new RegExp(`^(#{1,6})\\s+${escaped}\\s*$`, 'mi');
  const match = pattern.exec(markdown);

  if (!match) return '';

  const headingLevel = match[1]!.length;
  const startIndex = match.index! + match[0].length;
  const rest = markdown.slice(startIndex);

  // Find the next heading at same or higher level
  const nextHeading = new RegExp(`^#{1,${headingLevel}}\\s+`, 'm');
  const endMatch = nextHeading.exec(rest);

  if (endMatch) {
    return rest.slice(0, endMatch.index).trim();
  }
  return rest.trim();
}

/** Extract all sections at a given heading level. */
export function extractSections(
  markdown: string,
  level: number,
): Array<{ heading: string; content: string }> {
  const pattern = new RegExp(`^#{${level}}\\s+(.+)$`, 'gm');
  const sections: Array<{ heading: string; content: string }> = [];
  let match: RegExpExecArray | null;

  const matches: Array<{ heading: string; index: number }> = [];
  while ((match = pattern.exec(markdown)) !== null) {
    matches.push({ heading: match[1]!.trim(), index: match.index + match[0].length });
  }

  for (let i = 0; i < matches.length; i++) {
    const entry = matches[i]!;
    const nextEntry = matches[i + 1];
    const endIndex = nextEntry
      ? markdown.lastIndexOf('\n', nextEntry.index - 1)
      : markdown.length;
    const content = markdown.slice(entry.index, endIndex).trim();
    sections.push({ heading: entry.heading, content });
  }

  return sections;
}

/** Parse a pipe-delimited table row into cells. */
function parsePipeLine(line: string): string[] {
  return line
    .split('|')
    .slice(1, -1) // Remove empty first/last from leading/trailing |
    .map((cell) => cell.trim());
}
