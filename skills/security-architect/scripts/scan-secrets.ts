#!/usr/bin/env node
/**
 * Secrets Scanner (TypeScript)
 *
 * Scans code for hardcoded secrets using regex patterns.
 * Detects: API keys, AWS credentials, private keys, tokens, etc.
 *
 * Usage:
 *   npx tsx scan-secrets.ts file.ts
 *   npx tsx scan-secrets.ts "const key = 'sk_live_abc';"
 */

import * as fs from "fs";

interface SecretPattern {
  name: string;
  pattern: RegExp;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
}

const SECRET_PATTERNS: SecretPattern[] = [
  {
    name: "AWS Access Key",
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: "CRITICAL",
  },
  {
    name: "Generic API Key",
    pattern:
      /(api_key|apikey|api-key|secret|token|password|passwd|pwd)\s*[:=]\s*['"][A-Za-z0-9_\-]{20,}['"]/gi,
    severity: "HIGH",
  },
  {
    name: "RSA Private Key",
    pattern: /-----BEGIN (RSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/g,
    severity: "CRITICAL",
  },
  {
    name: "Slack Token",
    pattern: /xox[baprs]-[0-9a-zA-Z\-]{10,48}/g,
    severity: "CRITICAL",
  },
  {
    name: "Stripe API Key",
    pattern: /sk_(live|test)_[0-9a-zA-Z]{24,}/g,
    severity: "CRITICAL",
  },
  {
    name: "Google API Key",
    pattern: /AIza[0-9A-Za-z\\-_]{35}/g,
    severity: "CRITICAL",
  },
  {
    name: "GitHub Token",
    pattern: /gh[pousr]_[A-Za-z0-9_]{36,255}/g,
    severity: "CRITICAL",
  },
  {
    name: "JWT Token",
    pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    severity: "MEDIUM",
  },
  {
    name: "PostgreSQL Connection String",
    pattern: /postgres(ql)?:\/\/[^:]+:[^@]+@[^\/]+\/[^\s'"]+/gi,
    severity: "CRITICAL",
  },
  {
    name: "MongoDB Connection String",
    pattern: /mongodb(\+srv)?:\/\/[^:]+:[^@]+@[^\s'"]+/gi,
    severity: "CRITICAL",
  },
];

interface Finding {
  pattern: SecretPattern;
  match: string;
  lineNumber?: number;
}

function scanForSecrets(
  content: string,
  includeLineNumbers = false
): Finding[] {
  const findings: Finding[] = [];

  for (const patternDef of SECRET_PATTERNS) {
    const matches = content.matchAll(patternDef.pattern);

    for (const match of matches) {
      let lineNumber: number | undefined;

      if (includeLineNumbers && match.index !== undefined) {
        const beforeMatch = content.substring(0, match.index);
        lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;
      }

      findings.push({
        pattern: patternDef,
        match: match[0],
        lineNumber,
      });
    }
  }

  return findings;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: npx tsx scan-secrets.ts <file_path_or_content>");
    console.log("\nExamples:");
    console.log("  npx tsx scan-secrets.ts src/config.ts");
    console.log("  npx tsx scan-secrets.ts \"const key = 'sk_live_abc123';\"");
    process.exit(1);
  }

  const input = args[0];
  let content: string;
  let isFile = false;

  // Check if input is a file
  if (input.match(/\.(ts|js|tsx|jsx|py|java|go|rb|php|env)$/i)) {
    try {
      content = fs.readFileSync(input, "utf-8");
      isFile = true;
    } catch (error) {
      // Not a file, treat as content
      content = input;
    }
  } else {
    content = input;
  }

  const findings = scanForSecrets(content, isFile);

  if (findings.length > 0) {
    console.log(
      `\n🚨 Security Audit Failed: ${findings.length} potential secret(s) detected\n`
    );

    const grouped = new Map<string, Finding[]>();
    for (const finding of findings) {
      const key = finding.pattern.name;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(finding);
    }

    for (const [patternName, matches] of grouped.entries()) {
      const severity = matches[0].pattern.severity;
      const icon =
        severity === "CRITICAL" ? "🔴" : severity === "HIGH" ? "🟠" : "🟡";

      console.log(
        `${icon} ${severity}: ${patternName} (${matches.length} occurrence${
          matches.length > 1 ? "s" : ""
        })`
      );

      for (const match of matches) {
        const location = match.lineNumber ? ` (Line ${match.lineNumber})` : "";
        const preview =
          match.match.length > 50
            ? match.match.substring(0, 47) + "..."
            : match.match;
        console.log(`   ${location}: ${preview}`);
      }
      console.log("");
    }

    console.log("💡 Remediation:");
    console.log("   1. Move secrets to environment variables (.env file)");
    console.log(
      "   2. Use secret management tools (Vault, AWS Secrets Manager)"
    );
    console.log("   3. Add .env to .gitignore");
    console.log("   4. Rotate compromised credentials immediately\n");

    process.exit(1);
  } else {
    console.log("✅ No hardcoded secrets detected by regex scan.");
    console.log(
      "💡 Note: This is regex-based detection. Always review code manually for context."
    );
    process.exit(0);
  }
}

main();
