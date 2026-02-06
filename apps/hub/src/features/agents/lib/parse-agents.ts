/**
 * Parses AGENTS.md into structured agent and orchestrator data.
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

const EMOJI_RE = /^#{2,4}\s*([\p{Emoji_Presentation}\p{Emoji}\u200d]+)\s*(.+)/u;
const FIELD_RE = /^\*\*([^*]+)\*\*:?\s*(.+)/;

/**
 * Parse AGENTS.md content into a list of agents and orchestrators.
 */
export function parseAgents(markdown: string): AgentEntry[] {
  const entries: AgentEntry[] = [];
  const lines = markdown.split('\n');

  let currentEntry: Partial<AgentEntry> | null = null;
  let inOrchestrators = false;
  let collectingWorkflow = false;
  const workflowLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    // Detect orchestrators section
    if (trimmed.includes('Workflow Orchestrators')) {
      inOrchestrators = true;
      continue;
    }

    // Check for heading with emoji
    const headingMatch = trimmed.match(EMOJI_RE);
    if (headingMatch) {
      // Flush previous entry
      if (currentEntry?.name) {
        if (collectingWorkflow && workflowLines.length > 0) {
          currentEntry.workflow = workflowLines.slice();
        }
        entries.push(currentEntry as AgentEntry);
      }

      collectingWorkflow = false;
      workflowLines.length = 0;

      const emoji = headingMatch[1]?.trim() ?? '';
      const name = headingMatch[2]?.trim()
        .replace(/\*\*/g, '')
        .replace(/\s*—.*/, '')
        .replace(/\s*\(.*\)/, '') ?? '';

      currentEntry = {
        name,
        emoji,
        purpose: '',
        type: inOrchestrators ? 'orchestrator' : 'agent',
      };
      continue;
    }

    if (!currentEntry) continue;

    // Parse **Field:** Value lines
    const fieldMatch = trimmed.match(FIELD_RE);
    if (fieldMatch) {
      const key = fieldMatch[1]?.trim().toLowerCase() ?? '';
      const value = fieldMatch[2]?.trim() ?? '';

      if (key === 'purpose') currentEntry.purpose = value;
      else if (key === 'skills') currentEntry.skills = value.replace(/`/g, '');
      else if (key === 'activation') currentEntry.activation = value.replace(/`/g, '');
      else if (key === 'file') currentEntry.file = value.replace(/`/g, '');
      else if (key === 'complexity') currentEntry.complexity = value;
      else if (key === 'duration') currentEntry.duration = value;
      else if (key === 'cost') currentEntry.cost = value;
      continue;
    }

    // Parse **Capability:** line (used for Master Orchestrator and Knowledge Architect)
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

    // End workflow collection on empty line or new section
    if (collectingWorkflow && trimmed === '') {
      collectingWorkflow = false;
    }
  }

  // Flush last entry
  if (currentEntry?.name) {
    if (collectingWorkflow && workflowLines.length > 0) {
      currentEntry.workflow = workflowLines.slice();
    }
    entries.push(currentEntry as AgentEntry);
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
