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

/**
 * Parse agents from content/agents/routing.md structure.
 * This handles the new architecture where routing.md defines the agent hierarchy.
 */
export function parseAgentsFromRouting(markdown: string): AgentEntry[] {
  const entries: AgentEntry[] = [];
  const lines = markdown.split('\n');

  let section: 'none' | 'agents' | 'orchestrators' = 'none';
  let currentEntry: Partial<AgentEntry> | null = null;

  function flush() {
    if (currentEntry?.name) {
      entries.push(currentEntry as AgentEntry);
    }
    currentEntry = null;
  }

  for (const line of lines) {
    const trimmed = line.trim();

    // Section separators
    if (trimmed === '---') {
      flush();
      section = 'none';
      continue;
    }

    // Detect sections
    if (trimmed.startsWith('## Agent System:')) {
      flush();
      section = 'agents';
      continue;
    }
    if (trimmed.startsWith('## Workflow Orchestrators')) {
      flush();
      section = 'orchestrators';
      continue;
    }

    if (section === 'none') continue;

    // H3 headings in agents section
    if (section === 'agents' && trimmed.startsWith('### ')) {
      flush();
      const content = trimmed.slice(4).trim();
      const emojiMatch = content.match(EMOJI_START_RE);
      if (emojiMatch) {
        const emoji = emojiMatch[1]!.trim();
        const name = emojiMatch[2]!.trim().replace(/\s*—.*/, '');
        currentEntry = { name, emoji, purpose: '', type: 'agent' };
      } else {
        // No emoji, just use text as name
        const name = content.replace(/\s*—.*/, '').replace(/\*\*/g, '');
        currentEntry = { name, emoji: '👤', purpose: '', type: 'agent' };
      }
      continue;
    }

    // H4 headings in orchestrators section
    if (section === 'orchestrators' && trimmed.startsWith('#### ')) {
      flush();
      const content = trimmed.slice(5).trim();
      const emojiMatch = content.match(EMOJI_START_RE);
      if (emojiMatch) {
        const emoji = emojiMatch[1]!.trim();
        const name = emojiMatch[2]!.trim();
        currentEntry = { name, emoji, purpose: '', type: 'orchestrator' };
      } else {
        const name = content.replace(/\*\*/g, '');
        currentEntry = { name, emoji: '🎭', purpose: '', type: 'orchestrator' };
      }
      continue;
    }

    if (!currentEntry) continue;

    // Parse field lines
    const fieldMatch = trimmed.match(FIELD_RE);
    if (fieldMatch) {
      const key = fieldMatch[1]!.trim().toLowerCase();
      const value = fieldMatch[2]!.trim();

      if (key === 'purpose' || key === 'capability') {
        currentEntry.purpose = value;
      } else if (key === 'skills') {
        currentEntry.skills = value.replace(/`/g, '');
      } else if (key === 'activation') {
        currentEntry.activation = value.replace(/`/g, '');
      } else if (key === 'file') {
        currentEntry.file = value.replace(/`/g, '');
      } else if (key === 'complexity') {
        currentEntry.complexity = value;
      } else if (key === 'duration') {
        currentEntry.duration = value;
      } else if (key === 'cost') {
        currentEntry.cost = value;
      }
      continue;
    }

    // Inline purpose (lines starting with "- **Capability:**")
    if (trimmed.startsWith('- **Capability:**')) {
      currentEntry.purpose = trimmed.replace('- **Capability:**', '').trim();
      continue;
    }
  }

  flush();
  return entries;
}

/**
 * Deduplicate agent entries by name — keep the entry with more data.
 */
function deduplicateAgents(entries: AgentEntry[]): AgentEntry[] {
  const seen = new Map<string, number>();
  const result = [...entries];
  for (let i = 0; i < result.length; i++) {
    const entry = result[i]!;
    const key = entry.name.toLowerCase();
    const prev = seen.get(key);
    if (prev !== undefined) {
      const prevEntry = result[prev]!;
      // Keep whichever has more content
      if ((entry.purpose?.length ?? 0) >= (prevEntry.purpose?.length ?? 0)) {
        result[prev] = entry;
      }
      result.splice(i, 1);
      i--;
    } else {
      seen.set(key, i);
    }
  }
  return result;
}

/**
 * Parse agents from FrameworkEntity[] (backend results).
 * Each entity represents an agent file from content/agents/.
 * Deduplicates entries that appear in both routing.md and individual files.
 */
export function parseAgentsFromFrameworkEntities(entities: {
  name: string;
  category: string;
  path: string;
  frontmatter: Record<string, string | unknown>;
  content: string;
}[]): AgentEntry[] {
  const entries: AgentEntry[] = [];

  for (const entity of entities) {
    // Special case: routing.md contains multiple agents
    if (entity.name === 'routing' || entity.name === 'routing.md') {
      const routingAgents = parseAgentsFromRouting(entity.content);
      entries.push(...routingAgents);
      continue;
    }

    // Individual agent files
    const emoji = (entity.frontmatter.emoji as string) || '👤';
    const type = (entity.frontmatter.type as 'agent' | 'orchestrator') || 'agent';
    const purpose = (entity.frontmatter.purpose as string) || extractPurpose(entity.content);
    const skills = entity.frontmatter.skills as string | undefined;
    const activation = entity.frontmatter.activation as string | undefined;
    const file = entity.frontmatter.file as string | undefined;
    const complexity = entity.frontmatter.complexity as string | undefined;
    const duration = entity.frontmatter.duration as string | undefined;
    const cost = entity.frontmatter.cost as string | undefined;

    entries.push({
      name: entity.name,
      emoji,
      purpose,
      skills,
      activation,
      type,
      file,
      complexity,
      duration,
      cost,
    });
  }

  return deduplicateAgents(entries);
}

/**
 * Extract purpose from markdown content (first paragraph after frontmatter).
 */
function extractPurpose(content: string): string {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('-')) {
      return trimmed;
    }
  }
  return '';
}

/**
 * Auto-detect format and parse accordingly.
 * Supports both string content and FrameworkEntity arrays.
 */
export function parseAgentsAuto(
  input: string | { name: string; category: string; path: string; frontmatter: Record<string, string | unknown>; content: string }[]
): AgentEntry[] {
  if (Array.isArray(input)) {
    return parseAgentsFromFrameworkEntities(input);
  }

  // Detect format from string content
  if (input.includes('## Agent System: Hierarchy and Roles')) {
    return parseAgentsFromRouting(input);
  }

  // Fallback to old parser
  return parseAgents(input);
}
