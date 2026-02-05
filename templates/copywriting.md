# Copywriting & i18n — User-Facing Text Engineering

> Every word earns its place. Every string is translatable.

**Effort Tier**: 3 (LOW)
**AIDD Skill**: `skills/i18n-specialist/SKILL.md`

---

## Preconditions

- Feature context and user audience known
- Locale files location identified (i18next)
- Voice/tone guidelines (if established)

## Sub-Agent Roles

| Role | Focus |
|------|-------|
| **Copywriter** | Clarity, conciseness, user empathy, actionability |
| **i18n Specialist** | Locale structure, interpolation, plurals, RTL readiness |

## Process

### Step 1 — String Inventory
- Catalog ALL user-facing text in the feature
- Categories: labels, buttons, headings, descriptions, errors, tooltips, placeholders, confirmations

### Step 2 — Draft Copy
- Active voice preferred ("Save changes" not "Changes will be saved")
- Present tense for UI states ("Saving..." not "Will save")
- Concise: remove words that don't add meaning
- Consistent terminology across the entire application

### Step 3 — Error Messages
Every error message must answer 3 questions:
1. **What happened?** — Clear description of the error
2. **Why?** — Brief explanation of the cause
3. **What to do next?** — Actionable recovery step

Examples:
- Bad: "Error 500"
- Bad: "Something went wrong"
- Good: "Could not save your changes. The server is temporarily unavailable. Please try again in a few minutes."

### Step 4 — i18n Preparation
- Extract ALL strings to locale files (i18next)
- Key naming: `namespace.section.element` (e.g., `chat.input.placeholder`)
- Interpolation for dynamic values: `{{count}} messages`
- Plural forms: use i18next plural rules
- Date/time: use Intl.DateTimeFormat, never hardcode formats
- Numbers: use Intl.NumberFormat
- Plan for RTL locales (logical properties: margin-inline-start)

### Step 5 — Review
- Read aloud: does it sound natural?
- Remove jargon: use user's language, not developer's
- Consistency check: same concept = same word everywhere
- Truncation test: does it work with longer translations (German ~30% longer)?

## Copy Standards

| Element | Rules |
|---------|-------|
| **Labels** | Concise, descriptive, consistent terminology |
| **Buttons** | Action verb (Save, Delete, Submit), not "OK" or "Yes" |
| **Placeholders** | Example format, NEVER instructions (use labels for that) |
| **Tooltips** | Additional context, not essential information |
| **Confirmations** | Clear consequence + action verb on confirm button |
| **Empty states** | Helpful message + action CTA to fill the state |
| **Loading** | Context-aware ("Loading messages..." not just "Loading...") |

## Quality Gates

- [ ] All strings in locale files (zero hardcoded text)
- [ ] Error messages are actionable (what + why + next step)
- [ ] Consistent terminology across app
- [ ] Pluralization handled
- [ ] No technical jargon in user-facing text
- [ ] Interpolation for dynamic values

## Anti-Patterns

- Hardcoded strings in components
- Technical jargon in user messages
- Vague errors ("Something went wrong")
- Inconsistent terminology (same thing, different words)
- Missing plural forms
- Instructions in placeholder text
- "Click here" (describe the action instead)
- Assuming English word order for all locales

---

## Cross-References

- **i18n Specialist skill**: `skills/i18n-specialist/SKILL.md`
- **Frontend rules**: `rules/frontend.md`
- **Interface rules**: `rules/interfaces.md`
- **Global rules**: `rules/global.md`
