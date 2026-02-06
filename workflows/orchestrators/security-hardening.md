---
name: security-hardening
description: Comprehensive security assessment and remediation using OWASP Top 10 (2025) standards
complexity: high
estimated_duration: 60 minutes
skills_required:
  - security-architect
  - quality-engineer
  - contract-architect
  - data-architect
  - platform-engineer
model_strategy: hybrid
---

# Security Hardening Orchestrator

## Purpose

Perform comprehensive security assessment and remediation across the entire application stack, from code to infrastructure. Uses a multi-phase approach: Scan → Identify → Remediate → Verify.

**Use when:**

- Preparing for production deployment
- Post-incident security review
- Quarterly security audits
- Compliance requirements (SOC 2, PCI-DSS, GDPR)
- After major feature releases

---

## Workflow Stages

### Phase 1: Initial Scanning (Tier 1)

**1. OWASP Top 10 Scan:** `security-architect` (Tier 1)

- **Task:** Comprehensive vulnerability scan against OWASP Top 10 (2025)
- **Input:** Complete codebase, configuration files
- **Output:**
  - `owasp-scan-report.json` - Categorized vulnerabilities
  - Priority matrix (P0-critical, P1-high, P2-medium, P3-low)
  - Attack vectors identified

### Phase 2: Domain-Specific Analysis (Tier 1 + Tier 2)

**2. Test Coverage Analysis:** `quality-engineer` (Tier 3)

- **Task:** Identify untested code paths, especially security-critical functions
- **Input:** Test suite, codebase
- **Output:**
  - Coverage gaps report
  - Security-critical functions without tests
  - Recommended test additions

**3. API Security Review:** `contract-architect` (Tier 1)

- **Task:** Validate API security (authentication, authorization, rate limiting)
- **Input:** OpenAPI spec, authentication implementation
- **Output:**
  - `api-security-report.md` - Security assessment
  - Missing security headers
  - Authentication/authorization gaps
  - Rate limiting recommendations

**4. Database Security Audit:** `data-architect` (Tier 2)

- **Task:** SQL injection prevention, access control, encryption verification
- **Input:** Database schema, query patterns, access controls
- **Output:**
  - `db-security-report.md` - Database vulnerabilities
  - Parameterized query validation
  - Role-based access control (RBAC) review
  - Encryption at rest/in transit status

**5. Infrastructure Security:** `platform-engineer` (Tier 2)

- **Task:** Infrastructure hardening (Docker, K8s, CI/CD security)
- **Input:** Infrastructure as Code, deployment configs
- **Output:**
  - `infra-security-report.md` - Infrastructure vulnerabilities
  - Secrets management review
  - Network policy recommendations
  - Container security scan

### Phase 3: Remediation (Tier 2 + Tier 3)

**6. Generate Remediation Plan:** `security-architect` (Tier 1)

- **Task:** Synthesize all findings, create prioritized remediation roadmap
- **Input:** All security reports from stages 1-5
- **Output:**
  - `security-remediation-plan.md` - Complete remediation guide
  - Prioritized action items with timelines
  - Code snippets for common fixes
  - Verification checklist

### Phase 4: Verification (Tier 1)

**7. Final Security Verification:** `security-architect` (Tier 1)

- **Task:** Re-scan after remediation, validate all fixes
- **Input:** Updated codebase, remediation evidence
- **Output:**
  - `final-security-report.md` - Post-remediation status
  - Remaining issues (if any)
  - Compliance certification readiness
  - Security posture score

---

## Artifacts Produced

### Scan Reports

- `owasp-scan-report.json` - Initial vulnerability findings
- `coverage-gaps-report.md` - Testing gaps
- `api-security-report.md` - API-specific vulnerabilities
- `db-security-report.md` - Database security issues
- `infra-security-report.md` - Infrastructure vulnerabilities

### Remediation

- `security-remediation-plan.md` - Complete fix roadmap
- `code-fixes/` - Sample code snippets for common issues
- `remediation-checklist.md` - Step-by-step verification

### Final Report

- `final-security-report.md` - Post-remediation assessment
- `compliance-status.md` - Compliance readiness (SOC 2, PCI-DSS, etc.)
- `security-scorecard.md` - Overall security posture

---

## Success Criteria

### Scanning

- [ ] OWASP Top 10 fully assessed
- [ ] All security-critical code paths identified
- [ ] Attack surface mapped

### Analysis

- [ ] API authentication/authorization verified
- [ ] Database queries validated (no SQL injection)
- [ ] Infrastructure secrets properly managed
- [ ] Network policies reviewed

### Remediation

- [ ] All P0 (critical) vulnerabilities fixed
- [ ] All P1 (high) vulnerabilities addressed or accepted with risk
- [ ] Security headers implemented
- [ ] Input validation enforced

### Verification

- [ ] Re-scan shows zero P0 vulnerabilities
- [ ] Test coverage ≥80% for sec

urity-critical functions

- [ ] All fixes validated
- [ ] Compliance requirements met

---

## Cost Estimation

| Tier | Stages | Est. Tokens | Cost | Total |
| ---------- | ----------------------------------------------- | ------------------ | --------------------- | ---------- |
| **Tier 1** | 4 (Scan, API Review, Remediation, Verification) | ~30,000 | See model-matrix.md | ~$0.25 |
| **Tier 2** | 2 (DB Audit, Infrastructure) | ~15,000 | See model-matrix.md | ~$0.05 |
| **Tier 3** | 1 (Coverage Analysis) | ~5,000 | See model-matrix.md | ~$0.01 |
| **Total** | **7 stages** | **~50,000 tokens** | **Mixed** | **~$0.31** |

---

## Example Execution

### Input

```
Application: E-commerce platform
Tech Stack: Next.js, Node.js, PostgreSQL, Docker, K8s
Compliance: PCI-DSS Level 1
```

### Stage-by-Stage Findings

**Stage 1 (OWASP Scan):**

```json
{
  "P0_critical": [
    {
      "category": "A02:2025 - Cryptographic Failures",
      "issue": "Passwords stored in plaintext",
      "location": "src/auth/users.ts:45",
      "severity": "CRITICAL"
    }
  ],
  "P1_high": [
    {
      "category": "A03:2025 - Injection",
      "issue": "SQL injection vulnerability",
      "location": "src/db/orders.ts:89",
      "severity": "HIGH"
    }
  ]
}
```

**Stage 3 (API Security):**

```markdown
# API Security Issues

## Missing Security Headers

- [ ] Content-Security-Policy
- [ ] X-Frame-Options
- [ ] X-Content-Type-Options

## Rate Limiting

❌ No rate limiting on `/api/checkout` endpoint
⚠️ Risk: DDoS, credential stuffing
```

**... (continues through all 7 stages)**

---

## Remediation Workflow

### Critical (P0) - Immediate Fix Required

```markdown
1. **Plaintext Passwords**

   - Current: `db.users.insert({ password: req.body.password })`
   - Fixed: `db.users.insert({ password: await bcrypt.hash(req.body.password, 12) })`
   - Verification: Re-hash all existing passwords

2. **SQL Injection**
   - Current: `db.query(\`SELECT \* FROM orders WHERE id = '${id}'\`)`
   - Fixed: `db.query('SELECT * FROM orders WHERE id = ?', [id])`
   - Verification: Static analysis confirms all queries parameterized
```

### High (P1) - Fix Within 7 Days

```markdown
1. **Missing Security Headers**

   - Add Helmet middleware
   - Configure CSP policy
   - Test with security headers analyzer

2. **Rate Limiting**
   - Implement express-rate-limit
   - Configure per-endpoint limits
   - Monitor rate limit hits
```

---

## Notes

### OWASP Top 10 (2025) Coverage

| Category                         | Checked | Remediation                             |
| -------------------------------- | ------- | --------------------------------------- |
| A01: Broken Access Control       | ✅      | Authorization checks, IDOR prevention   |
| A02: Cryptographic Failures      | ✅      | Proper hashing, encryption at rest      |
| A03: Injection                   | ✅      | Parameterized queries, input validation |
| A04: Insecure Design             | ✅      | Threat modeling, secure defaults        |
| A05: Security Misconfiguration   | ✅      | Secure headers, minimal permissions     |
| A06: Vulnerable Components       | ✅      | Dependency scanning, updates            |
| A07: Auth and Session Failures   | ✅      | MFA, session management                 |
| A08: Software and Data Integrity | ✅      | Code signing, integrity checks          |
| A09: Security Logging Failures   | ✅      | Audit logging, monitoring               |
| A10: Server-Side Request Forgery | ✅      | URL validation, allowlists              |

### Compliance Mapping

**PCI-DSS:**

- Requirement 6.5: Secure coding (OWASP coverage)
- Requirement 11.2: Vulnerability scanning (quarterly)

**SOC 2:**

- CC6.1: Logical access controls
- CC7.1: Vulnerability detection

**GDPR:**

- Article 32: Security of processing
- Article 25: Data protection by design

---

**This orchestrator ensures production-ready security posture.**
