# Penetration Testing — Authorized Offensive Security

> Systematic. Authorized. Documented. Reproducible.

**Effort Tier**: 1 (HIGH)
**AIDD Skill**: `skills/security-architect/SKILL.md` (offensive)

---

## CRITICAL PREREQUISITE

**This template is for AUTHORIZED testing ONLY.**

Before proceeding:
- [ ] Written authorization obtained from system owner
- [ ] Scope and rules of engagement defined and signed
- [ ] Legal agreements in place
- [ ] Emergency contacts established
- [ ] Out-of-scope systems identified and documented

## Sub-Agent Roles

| Role | Focus |
|------|-------|
| **Offensive Security Engineer** | Attack methodology, exploitation, impact demonstration |
| **Vulnerability Researcher** | Vulnerability discovery, analysis, chaining |

## Methodology

### Phase 1 — Reconnaissance (Passive)
- OSINT: public information, social media, job postings
- DNS enumeration: subdomains, MX records, TXT records
- Technology fingerprinting: Wappalyzer, headers, error pages
- Certificate transparency logs
- Google dorking (site-specific searches)
- NO direct interaction with target systems in this phase

### Phase 2 — Enumeration (Active)
- Port scanning: TCP/UDP service discovery
- Service identification: version detection
- Web application mapping: endpoints, parameters, headers
- Authentication mechanism identification
- API endpoint discovery (OpenAPI specs, common paths)
- Directory/file bruteforcing (wordlists)

### Phase 3 — Vulnerability Identification
- Automated scanning (within scope)
- Manual testing per vulnerability category
- Configuration review
- Business logic analysis
- Authentication/authorization testing

### Phase 4 — Exploitation (Within Scope)
- Validate identified vulnerabilities
- Demonstrate impact (proof of concept)
- Chain vulnerabilities for maximum impact demonstration
- Document every step for reproducibility
- NEVER cause data loss or service disruption

### Phase 5 — Post-Exploitation Analysis
- Impact assessment: what could an attacker access?
- Lateral movement potential
- Data exfiltration potential
- Persistence mechanisms
- Privilege escalation paths

### Phase 6 — Reporting

## Testing Categories

### API Security
- BOLA (Broken Object-Level Authorization)
- BFLA (Broken Function-Level Authorization)
- Mass assignment
- Excessive data exposure
- Rate limiting bypass
- JWT manipulation (algorithm confusion, key brute force)
- GraphQL introspection, batching attacks, deep nesting

### Authentication
- Credential stuffing / brute force
- Session fixation
- Token manipulation
- Password reset flaws
- MFA bypass techniques
- OAuth misconfiguration

### Authorization
- Horizontal privilege escalation (user A → user B's data)
- Vertical privilege escalation (user → admin)
- IDOR (Insecure Direct Object References)
- Role bypass
- Forced browsing

### Injection
- SQL injection (error-based, blind, time-based)
- XSS (reflected, stored, DOM-based)
- Command injection
- Template injection (SSTI)
- Header injection (CRLF)
- LDAP injection

### Business Logic
- Race conditions (TOCTOU)
- Workflow bypass (skip steps)
- Price/quantity manipulation
- Coupon/discount abuse
- Infinite loop triggers

### Infrastructure
- Misconfigurations (default configs, open ports)
- Exposed admin panels
- Default credentials
- Information disclosure (stack traces, version headers)
- Cloud misconfiguration (S3 buckets, IAM roles)

## CTF Methodology
- Systematic approach: enumerate everything before exploiting
- Document each step for reproducibility
- Chain vulnerabilities for maximum impact
- Time management: quick wins first, deep dives second
- Flag submission and progress tracking

## Report Format per Finding

```markdown
## Finding: [Title]

**Severity**: Critical | High | Medium | Low | Informational
**CVSS**: [score] ([vector string])
**CWE**: [CWE-XXX]

### Description
What the vulnerability is and where it exists.

### Steps to Reproduce
1. Step-by-step reproduction
2. Include exact requests/commands
3. Include screenshots/evidence

### Impact
What an attacker could achieve by exploiting this.

### Remediation
Specific fix with code examples where applicable.

### References
- CVE, CWE links
- OWASP reference
```

## Quality Gates

- [ ] Authorization verified before ANY testing
- [ ] All testing categories covered per scope
- [ ] Every finding documented with evidence
- [ ] Steps to reproduce are clear and repeatable
- [ ] Remediation provided for each finding
- [ ] No out-of-scope testing performed
- [ ] No destructive actions performed

## Anti-Patterns

- Testing without written authorization
- Destructive testing (DoS, data deletion)
- Exceeding defined scope
- No documentation of steps
- Reporting without remediation recommendations
- Using production data for testing
- Leaving backdoors or persistence mechanisms

---

## Cross-References

- **Security Architect skill**: `skills/security-architect/SKILL.md`
- **Audit workflow**: `workflows/audit.md`
- **Analyze workflow**: `workflows/analyze.md`
- **Security rules**: `rules/security.md`
- **OWASP knowledge**: `knowledge/security/standards/owasp-2026.md`
