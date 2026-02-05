# Research — Deep Investigation and Multi-Source Synthesis

> Systematic investigation that cross-verifies claims and quantifies uncertainty.

**Effort Tier**: 1 (HIGH_EFFORT)
**AIDD Skill**: `skills/knowledge-architect/SKILL.md` (Technical Research)

---

## Purpose

Conduct deep research on a topic through systematic multi-source investigation. Search, read, cross-reference, and synthesize information into an actionable report. Every claim must be sourced, every uncertainty must be quantified, and the output follows the BLUF-6 format.

---

## Preconditions

- [ ] Clear research question or investigation topic defined
- [ ] Scope boundaries established (depth, breadth, time constraints)
- [ ] Expected output format agreed upon (report, recommendation, comparison, etc.)
- [ ] Relevant context loaded (project constraints, existing decisions, prior research)

---

## Sub-Agent Roles

| Role | Responsibility |
|------|---------------|
| **Researcher** | Searches across multiple source types (web, documentation, academic, community). Extracts key claims and data points. Maintains source provenance for every piece of information. |
| **Analyst** | Cross-references claims across sources. Identifies contradictions, consensus, and gaps. Evaluates source credibility and recency. Quantifies confidence levels. |
| **Technical Writer** | Synthesizes findings into the BLUF-6 output format. Ensures clarity, precision, and actionability. Separates facts from interpretation. |

---

## Process Steps

### Step 1: Define Research Question

Articulate precisely:
- **Primary question**: The core question to answer
- **Sub-questions**: Supporting questions that inform the primary
- **Scope**: What is in/out of bounds
- **Constraints**: Time sensitivity, technology constraints, project context
- **Success criteria**: What constitutes a sufficient answer

### Step 2: Search — Multi-Source Collection

Search across these source categories (as applicable):

| Source Type | Examples | Priority |
|------------|----------|----------|
| **Official Documentation** | Library docs, API references, specs | Highest |
| **Current Web** | Blog posts, articles (prefer current year) | High |
| **Community Resources** | GitHub issues, Stack Overflow, Discord, forums | Medium |
| **Academic/Technical Papers** | Research papers, RFCs, design documents | Medium |
| **Codebase** | Existing project code, dependencies, configurations | High |

For each source, record:
- URL or file path
- Date published/updated
- Author/organization credibility
- Key claims extracted

### Step 3: Read and Extract

For each source:
- Read thoroughly (do not skim for confirmation)
- Extract key claims, data points, and recommendations
- Note the evidence supporting each claim
- Flag any caveats, limitations, or conditions mentioned by the source

### Step 4: Cross-Reference and Verify

For each significant claim:
- Is it confirmed by multiple independent sources?
- Are there contradicting sources? If so, which is more credible and why?
- Is the information current (not outdated by newer releases or findings)?
- What is the confidence level? (High: 3+ sources agree; Medium: 2 sources or 1 authoritative; Low: single non-authoritative source)

### Step 5: Analyze and Synthesize

- Identify the consensus view across sources
- Document areas of disagreement and why they exist
- Distinguish facts (verifiable, sourced) from interpretations (inferred, reasoned)
- Identify gaps in available information
- Form conclusions with stated confidence levels

### Step 6: Report in BLUF-6 Format

#### 1. BLUF (Bottom Line Up Front)
2-3 sentences: the direct answer to the research question with confidence level.

#### 2. Situational Analysis
Context, background, and current state of the topic. What the reader needs to know to understand the findings.

#### 3. Sources and Evidence
Table of sources consulted with credibility assessment:

| Source | Type | Date | Credibility | Key Contribution |
|--------|------|------|-------------|-----------------|
| | | | | |

#### 4. Synthesis
Detailed findings organized by sub-question or theme. Each claim attributed to source(s). Contradictions and consensus areas noted.

#### 5. Recommendations
Actionable next steps based on findings. Each recommendation includes: what, why, confidence level, and caveats.

#### 6. Unknown Factors
What remains uncertain. What additional research would be needed. What assumptions were made and their risk if wrong.

---

## Quality Gates

- [ ] Multiple sources consulted (minimum 3 for primary question)
- [ ] Claims cross-verified across independent sources
- [ ] Uncertainty and confidence levels explicitly stated
- [ ] All sources cited with URLs/paths and dates
- [ ] Facts distinguished from interpretations
- [ ] Contradictions between sources documented and analyzed
- [ ] Recommendations are actionable and tied to evidence
- [ ] Unknown factors and assumptions are documented
- [ ] Information is current (prefer current year sources; flag anything older than 2 years)

---

## Anti-Patterns

| Anti-Pattern | Description | Mitigation |
|-------------|-------------|------------|
| **Single-Source Conclusion** | Basing findings on one source only | Require minimum 3 sources for primary claims; flag single-source findings explicitly |
| **Outdated Information** | Using old docs/posts when newer versions exist | Always check publication date; prefer current year; search for up-to-date sources |
| **Confirmation Bias** | Only searching for sources that support a preconceived answer | Actively search for contradicting viewpoints; include a "counter-arguments" section |
| **Opinion as Fact** | Presenting interpretation without attribution | Every claim must cite its source; interpretations must be labeled as such |
| **Source Laundering** | Multiple sources citing the same original source, counted as independent | Trace claims to their origin; do not count derivative sources as independent |
| **Recency Bias** | Assuming newer always means better | Evaluate whether newer information actually supersedes older findings or just adds noise |
| **Scope Drift** | Following interesting tangents beyond the research question | Refer back to Step 1; note tangents as "areas for future research" in Unknown Factors |

---

## Cross-References

- **BLUF-6 format**: `spec/bluf-6.md`
- **Knowledge Architect skill**: `skills/knowledge-architect/SKILL.md`
- **Technology selection workflow**: `workflows/technology-selection.md`
- **Global rules**: `rules/global.md`
