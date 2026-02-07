# Security Standards & Practices

> **Activation:** All code reviews, deployment workflows, and security audits

---

## OWASP Top 10 (2025) Compliance

### A01: Broken Access Control

**Vulnerability:** Users can access resources they shouldn't (IDOR - Insecure Direct Object Reference)

```typescript
// ❌ VULNERABLE: No ownership check
app.get("/api/orders/:id", async (req, res) => {
  const order = await db.order.findUnique({ where: { id: req.params.id } });
  return res.json(order); // ANY user can see ANY order!
});

// ✅ SECURE: Verify ownership
app.get("/api/orders/:id", authMiddleware, async (req, res) => {
  const order = await db.order.findUnique({ where: { id: req.params.id } });

  if (!order || order.userId !== req.user.id) {
    return res.status(403).json({ error: "Access denied" });
  }

  return res.json(order);
});
```

---

### A02: Cryptographic Failures

**Vulnerabilities:**

- Storing passwords in plaintext
- Using weak hashing (MD5, SHA1)
- Not encrypting sensitive data in transit or at rest

```typescript
// ❌ VULNERABLE: Plaintext password
await db.user.create({
  data: { email, password: req.body.password },
});

// ✅ SECURE: Bcrypt with cost factor ≥12
import bcrypt from "bcrypt";

const hashedPassword = await bcrypt.hash(req.body.password, 12);
await db.user.create({
  data: { email, password: hashedPassword },
});

// Password verification
const isValid = await bcrypt.compare(plainPassword, user.password);
```

**Encryption Standards:**

- **Passwords:** bcrypt (cost ≥12) or Argon2id
- **Data at Rest:** AES-256-GCM
- **Data in Transit:** TLS 1.3 only
- **API Tokens:** Hash with SHA-256 before storing

---

### A03: Injection (SQL, NoSQL, Command, LDAP)

#### SQL Injection Prevention

```typescript
// ❌ CRITICAL VULNERABILITY: String concatenation
const email = req.query.email;
const query = `SELECT * FROM users WHERE email = '${email}'`;
// Attack: ?email=' OR '1'='1
await db.query(query);

// ✅ SECURE: Prepared statements / Parameterized queries
const email = req.query.email;
await db.query("SELECT * FROM users WHERE email = ?", [email]);

// OR with ORM (Prisma)
await prisma.user.findUnique({ where: { email } });
```

#### Command Injection Prevention

```typescript
// ❌ VULNERABLE: User input in shell command
const filename = req.body.filename;
exec(`convert ${filename} output.png`); // Attack: 'file.jpg; rm -rf /'

// ✅ SECURE: Use libraries, not shell commands
import sharp from "sharp";
await sharp(filename).toFile("output.png");
```

---

### A04: Insecure Design

**Principle:** Security must be designed in, not bolted on.

```typescript
// ❌ INSECURE DESIGN: Rate limiting as afterthought
app.post("/api/login", loginHandler);

// ✅ SECURE DESIGN: Rate limiting built-in
import rateLimit from "express-rate-limit";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: "Too many login attempts, please try again later",
});

app.post("/api/login", loginLimiter, loginHandler);
```

**Secure Design Patterns:**

- **Defense in Depth:** Multiple security layers
- **Principle of Least Privilege:** Minimum necessary permissions
- **Fail Secure:** System fails to a secure state, not open

---

### A05: Security Misconfiguration

**Common Issues:**

- Default credentials
- Unnecessary features enabled
- Detailed error messages in production
- Missing security headers

```typescript
// ✅ Security Headers (Helmet.js)
import helmet from "helmet";

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);
```

**Environment Variables (NEVER commit secrets)**

```bash
# ❌ WRONG: .env committed to git
DATABASE_URL=postgresql://admin:password123@localhost/db

# ✅ RIGHT: .env in .gitignore, use .env.example as template
# .env.example
DATABASE_URL=postgresql://user:pass@host/db
```

---

### A06: Vulnerable and Outdated Components

**Prevention:**

```bash
# Check for known vulnerabilities
npm audit

# Fix automatically (use with caution)
npm audit fix

# For critical vulns that can't auto-fix:
npm audit fix --force
```

**Dependency Policy:**

- Run `npm audit` in CI/CD (fail build on HIGH/CRITICAL)
- Update dependencies monthly
- Pin major versions (`"express": "^4.18.0"` → `"express": "4.18.0"`)

---

### A07: Identification and Authentication Failures

#### Session Management

```typescript
// ✅ Secure session configuration
import session from "express-session";

app.use(
  session({
    secret: process.env.SESSION_SECRET, // NEVER hardcode
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true, // HTTPS only
      httpOnly: true, // Prevent XSS access
      maxAge: 1800000, // 30 minutes
      sameSite: "strict", // CSRF protection
    },
  })
);
```

#### JWT Best Practices

```typescript
// ✅ Secure JWT implementation
import jwt from "jsonwebtoken";

// Generate token
const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
  expiresIn: "15m", // Short-lived access token
  issuer: "your-app",
  audience: "your-api",
});

// Verify token
const decoded = jwt.verify(token, process.env.JWT_SECRET, {
  issuer: "your-app",
  audience: "your-api",
});
```

**Password Requirements:**

- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- Check against breached password databases (Have I Been Pwned API)

---

### A08: Software and Data Integrity Failures

**Prevent Tampering:**

```typescript
// ✅ Verify npm package integrity
package.json:
"dependencies": {
  "express": "4.18.2",  // Exact version, not ^4.18.2
}

// Use lockfiles (package-lock.json) in CI/CD
npm ci  // NOT npm install
```

**Code Signing:**

- Use GPG to sign commits: `git config commit.gpgSign true`
- Verify container image signatures

---

### A09: Security Logging and Monitoring Failures

```typescript
// ✅ Secure logging (Winston)
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log security events
authMiddleware(req, res, next) {
  if (!validToken) {
    logger.warn('Authentication failed', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      attemptedResource: req.path
    });
    return res.status(401).send('Unauthorized');
  }
  next();
}
```

**What to Log:**

- ✅ Authentication attempts (success/failure)
- ✅ Authorization failures
- ✅ Input validation failures
- ✅ Exceptions and errors
- ❌ **NEVER log:** Passwords, tokens, credit cards, PII

---

### A10: Server-Side Request Forgery (SSRF)

```typescript
// ❌ VULNERABLE: User controls URL
app.get("/fetch", async (req, res) => {
  const url = req.query.url;
  const response = await fetch(url); // Attack: ?url=http://localhost:6379/
  return res.json(await response.json());
});

// ✅ SECURE: Whitelist allowed domains
const ALLOWED_DOMAINS = ["api.trusted-service.com"];

app.get("/fetch", async (req, res) => {
  const url = new URL(req.query.url);

  if (!ALLOWED_DOMAINS.includes(url.hostname)) {
    return res.status(400).json({ error: "Domain not allowed" });
  }

  const response = await fetch(url.href);
  return res.json(await response.json());
});
```

---

## Secret Management

### Hardcoded Secret Detection (Regex Patterns)

```bash
# AWS Access Key
AKIA[0-9A-Z]{16}

# Generic API Key
(api_key|apikey|secret|token)\s*[:=]\s*['"][A-Za-z0-9_\-]{20,}['"]

# Private Key
-----BEGIN (RSA|OPENSSH|ENCRYPTED) PRIVATE KEY-----
```

### Secret Storage

- **Development:** `.env` files (in `.gitignore`)
- **Production:** Vault (HashiCorp), AWS Secrets Manager, Azure Key Vault
- **Never:** Hardcoded in source, committed to git, logged

```typescript
// ❌ CRITICAL: Hardcoded secret
const apiKey = "sk_live_abc123xyz";

// ✅ Environment variable
const apiKey = process.env.STRIPE_API_KEY;
if (!apiKey) throw new Error("STRIPE_API_KEY not set");
```

---

## Security Testing

### Automated Scans (CI/CD Integration)

```yaml
# .github/workflows/security.yml
name: Security Scan
on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      # Dependency vulnerabilities
      - run: npm audit --audit-level=high

      # Secret scanning
      - uses: trufflesecurity/trufflehog@main

      # SAST (Static Analysis)
      - uses: github/codeql-action/analyze@v2
```

### Manual Penetration Testing

- **Frequency:** Quarterly for critical systems
- **Scope:** Authentication, authorization, input validation
- **Tools:** OWASP ZAP, Burp Suite

---

## Security Checklist (Pre-deployment)

- [ ] All secrets in environment variables (not hardcoded)
- [ ] HTTPS enforced (redirect HTTP → HTTPS)
- [ ] Security headers configured (CSP, HSTS, X-Frame-Options)
- [ ] Rate limiting on authentication endpoints
- [ ] Input validation on all user inputs
- [ ] SQL queries use prepared statements
- [ ] Passwords hashed with bcrypt (cost ≥12)
- [ ] Dependencies have no HIGH/CRITICAL vulnerabilities
- [ ] Error messages don't leak sensitive info
- [ ] Logging configured (no sensitive data logged)

---

**Enforcement:** Use `/analyze --security` workflow for automated OWASP scans.
