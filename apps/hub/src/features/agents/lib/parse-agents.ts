/**
 * Parses AGENTS.md into structured agent and orchestrator data.
 *
 * Expected structure:
 *   ## 🧠 Agent System: ...
 *     ### 👑 Master Orchestrator — ...
 *     ### 🏗️ System Architect
 *   ---
 *   ## 🎭 Workflow Orchestrators
 *     ### Available Orchestrators
 *       #### 🏗️ Full-Stack Feature
 *       #### 🛡️ Security Hardening
 *   ---
 *   ## 📜 Golden Rules  ← NOT agents, just section headings
 */

export interface AgentEntry {
  name: string;
  emoji: string;
  purpose: string;
  skills?: string;
  activation?: string;
  type: 'agent' | 'orchestrator';
  /** Orchestrator-specific fields */
  file?: string;
  complexity?: string;
  duration?: string;
  cost?: string;
  workflow?: string[];
}

/**
 * Matches a real visual emoji at the start of a string.
 * Uses Emoji_Presentation + Extended_Pictographic to EXCLUDE
 * ASCII characters (#, *, 0-9) that have the generic \p{Emoji} property.
 */
const EMOJI_START_RE =
  /^([\p{Emoji_Presentation}\p{Extended_Pictographic}][\u200d\uFE0F\p{Emoji_Presentation}\p{Extended_Pictographic}]*)\s*(.+)/u;

const HEADING_RE = /^(#{2,4})\s+(.+)/;
const FIELD_RE = /^\*\*([^*]+)\*\*:?\s*(.+)/;

/**
 * Parse AGENTS.md content into a list of agents and orchestrators.
 */
export function parseAgents(markdown: string): AgentEntry[] {
  const entries: AgentEntry[] = [];
  const lines = markdown.split('\n');

  // Track which major section we're in (delimited by --- separators)
  let section: 'none' | 'agents' | 'orchestrators' = 'none';
  let currentEntry: Partial<AgentEntry> | null = null;
  let collectingWorkflow = false;
  const workflowLines: string[] = [];

  function flush() {
    if (currentEntry?.name) {
      if (collectingWorkflow && workflowLines.length > 0) {
        currentEntry.workflow = workflowLines.slice();
      }
      entries.push(currentEntry as AgentEntry);
    }
    currentEntry = null;
    collectingWorkflow = false;
    workflowLines.length = 0;
  }

  for (const line of lines) {
    const trimmed = line.trim();

    // Horizontal rules separate major sections — reset state
    if (trimmed === '---') {
      flush();
      section = 'none';
      continue;
    }

    // Check for markdown headings
    const headingMatch = trimmed.match(HEADING_RE);
    if (headingMatch) {
      const level = headingMatch[1]!.length; // 2, 3, or 4
      const rawContent = headingMatch[2]!.trim();
      // Strip bold markers for emoji extraction
      const content = rawContent.replace(/\*\*/g, '');

      // h2 headings define top-level sections
      if (level === 2) {
        flush();
        if (content.includes('Agent System')) {
          section = 'agents';
        } else if (content.includes('Workflow Orchestrators')) {
          section = 'orchestrators';
        } else {
          section = 'none';
        }
        continue;
      }

      // Outside recognized sections — skip all headings
      if (section === 'none') continue;

      // Try to extract a real emoji from the heading content
      const emojiMatch = content.match(EMOJI_START_RE);
      if (!emojiMatch) continue; // No emoji → subsection header, skip

      const emoji = emojiMatch[1]!.trim();
      const name = emojiMatch[2]!
        .trim()
        .replace(/\s*—.*/, '')
        .replace(/\s*\(.*\)/, '');

      // Agents section: h3 entries are individual agents
      if (section === 'agents' && level === 3) {
        flush();
        currentEntry = { name, emoji, purpose: '', type: 'agent' };
        continue;
      }

      // Orchestrators section: h4 entries are orchestrator definitions
      if (section === 'orchestrators' && level === 4) {
        flush();
        currentEntry = { name, emoji, purpose: '', type: 'orchestrator' };
        continue;
      }

      // Any other heading level in these sections → not an entry
      continue;
    }

    if (!currentEntry) continue;

    // Parse **Field:** Value lines
    const fieldMatch = trimmed.match(FIELD_RE);
    if (fieldMatch) {
      const key = fieldMatch[1]!.trim().toLowerCase();
      const value = fieldMatch[2]!.trim();

      if (key === 'purpose') currentEntry.purpose = value;
      else if (key === 'skills') currentEntry.skills = value.replace(/`/g, '');
      else if (key === 'activation') currentEntry.activation = value.replace(/`/g, '');
      else if (key === 'file') currentEntry.file = value.replace(/`/g, '');
      else if (key === 'complexity') currentEntry.complexity = value;
      else if (key === 'duration') currentEntry.duration = value;
      else if (key === 'cost') currentEntry.cost = value;
      continue;
    }

    // Parse **Capability:** line (alternative purpose format)
    if (trimmed.startsWith('- **Capability:**')) {
      currentEntry.purpose = trimmed.replace('- **Capability:**', '').trim();
      continue;
    }

    // Detect workflow list start
    if (trimmed === '**Workflow:**') {
      collectingWorkflow = true;
      continue;
    }

    // Collect numbered workflow steps
    if (collectingWorkflow && /^\d+\./.test(trimmed)) {
      workflowLines.push(trimmed.replace(/^\d+\.\s*/, ''));
      continue;
    }

    // End workflow collection on empty line
    if (collectingWorkflow && trimmed === '') {
      collectingWorkflow = false;
    }
  }

  // Flush last entry
  flush();

  // Deduplicate by name — keep the entry with more data
  const seen = new Map<string, number>();
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    const prev = seen.get(entry.name);
    if (prev !== undefined) {
      const prevEntry = entries[prev]!;
      // Keep whichever has more content
      if ((entry.purpose?.length ?? 0) >= (prevEntry.purpose?.length ?? 0)) {
        entries[prev] = entry;
      }
      entries.splice(i, 1);
      i--;
    } else {
      seen.set(entry.name, i);
    }
  }

  return entries;
}

/**
 * Get the slug for an agent name (for routing).
 */
export function agentSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
