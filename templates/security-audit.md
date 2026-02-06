# Security Audit — OWASP Top 10 Vulnerability Analysis

> Systematic security assessment. Evidence-based. Severity-ranked.

**Effort Tier**: 1 (HIGH)
**AIDD Skill**: `skills/security-architect/SKILL.md` + `workflows/analyze.md`

---

## Preconditions

- Application code accessible
- Audit scope defined (application, infrastructure, dependencies)
- Authorization obtained for testing

## Sub-Agent Roles

| Role                      | Focus                                                   |
| ------------------------- | ------------------------------------------------------- |
| **Security Architect**    | Threat modeling, security patterns, architecture review |
| **Vulnerability Analyst** | Code review, dependency audit, configuration analysis   |

## Process

### Step 1 — Define Scope
- Application boundaries
- Infrastructure components
- Third-party dependencies
- Data classification (PII, financial, health)

### Step 2 — OWASP Top 10 2025 Checklist

#### A01: Broken Access Control
- [ ] RBAC/ABAC properly implemented
- [ ] IDOR prevention (object-level authorization)
- [ ] Least privilege principle enforced
- [ ] CORS configuration restrictive (no wildcards in production)
- [ ] Directory traversal prevention
- [ ] JWT/session token cannot be reused across users

#### A02: Cryptographic Failures
- [ ] TLS 1.2+ everywhere (no HTTP in production)
- [ ] Passwords: Argon2id (preferred) or bcrypt >=cost 12
- [ ] No sensitive data in URLs or logs
- [ ] Proper key management (rotation, storage)
- [ ] Encrypted at rest for PII/financial data

#### A03: Injection
- [ ] Parameterized queries (no string concatenation for SQL)
- [ ] Input validation at every boundary (Zod schemas)
- [ ] Output encoding (HTML, URL, JavaScript contexts)
- [ ] Command injection prevention (no shell exec with user input)
- [ ] Template injection prevention

#### A04: Insecure Design
- [ ] Threat model documented
- [ ] Secure defaults (deny by default)
- [ ] Rate limiting on sensitive endpoints
- [ ] Business logic abuse prevention
- [ ] Resource consumption limits

#### A05: Security Misconfiguration
- [ ] CSP headers configured
- [ ] HSTS enabled
- [ ] X-Frame-Options set
- [ ] Server information hidden (no version disclosure)
- [ ] Default credentials removed
- [ ] Debug/dev features disabled in production
- [ ] Error messages don't leak stack traces

#### A06: Vulnerable Components
- [ ] Dependency scan (npm audit, Socket.dev, Snyk)
- [ ] Known CVE checks on all dependencies
- [ ] Update policy defined (SLA for critical CVEs)
- [ ] Lock files committed (pnpm-lock.yaml)

#### A07: Authentication Failures
- [ ] JWT in HttpOnly cookies (web) or secure storage (mobile)
- [ ] MFA support (or planned)
- [ ] Session timeout configured
- [ ] Brute force protection (rate limiting, account lockout)
- [ ] Password complexity requirements
- [ ] Credential rotation capability

#### A08: Data Integrity Failures
- [ ] SSRF prevention (URL validation, allowlists)
- [ ] Integrity checks on downloads/updates
- [ ] CSP with script-src for JavaScript integrity
- [ ] CI/CD pipeline secured

#### A09: Logging & Monitoring Failures
- [ ] Structured logging (JSON format)
- [ ] No PII in logs
- [ ] Audit trail for sensitive operations
- [ ] Log injection prevention
- [ ] Alerting on security events

#### A10: SSRF
- [ ] URL validation on all external requests
- [ ] Allowlists for external service URLs
- [ ] No user-controlled URLs to internal services
- [ ] DNS rebinding protection

### Step 3 — Dependency Audit
- Run `npm audit` or equivalent
- Check Socket.dev for supply chain risks
- Review transitive dependencies
- Flag any dependency with known CVEs

### Step 4 — Cryptographic Review
- Password hashing algorithm and parameters
- Secret storage mechanism (Stronghold, env vars, vault)
- Token generation (sufficient entropy)
- Key rotation procedures

### Step 5 — Report

#### Format per Finding
- **Title**: descriptive vulnerability name
- **Severity**: Critical / High / Medium / Low / Informational
- **CVSS Score**: calculated score
- **Description**: what the vulnerability is
- **Evidence**: code snippet, request/response, screenshot
- **Impact**: what an attacker could achieve
- **Remediation**: specific fix with code examples
- **References**: CVE, CWE, OWASP reference

## Quality Gates

- [ ] All OWASP Top 10 categories reviewed
- [ ] Dependencies scanned (no unaddressed critical/high)
- [ ] Cryptographic standards verified
- [ ] Findings severity-ranked
- [ ] Remediation plan for each finding
- [ ] Report follows BLUF format

## Anti-Patterns

- Security as afterthought
- Trusting client-side validation alone
- Storing secrets in code or version control
- Logging PII (passwords, tokens, personal data)
- Security by obscurity
- Ignoring dependency vulnerabilities
- Generic remediation ("fix the bug") without specific guidance

---

## Cross-References

- **Security Architect skill**: `skills/security-architect/SKILL.md`
- **Analyze workflow**: `workflows/analyze.md`
- **Audit workflow**: `workflows/audit.md`
- **Security rules**: `rules/security.md`
- **OWASP knowledge**: `knowledge/security/standards/owasp-2026.md`
- **Dependency scanning**: `knowledge/security/dependency-scanning/`
- **BLUF-6 format**: `specs/bluf-6.md`
