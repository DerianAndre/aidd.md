import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  registerTool,
  createTextResult,
  createErrorResult,
} from '@aidd.md/mcp-shared';
import type { AiddModule, ModuleContext } from '@aidd.md/mcp-shared';
import { resolveContent, formatResult } from './utils.js';
import type { ValidatorFn } from './types.js';

// Validator imports
import { validateTkbEntry } from './validators/validate-tkb-entry.js';
import { validateMermaid } from './validators/validate-mermaid.js';
import { validateOpenapi } from './validators/validate-openapi.js';
import { validateSql } from './validators/validate-sql.js';
import { scanSecrets } from './validators/scan-secrets.js';
import { validateTests } from './validators/validate-tests.js';
import { validateDockerfile } from './validators/validate-dockerfile.js';
import { validateI18n } from './validators/validate-i18n.js';
import { auditAccessibility } from './validators/audit-accessibility.js';
import { auditPerformance } from './validators/audit-performance.js';
import { validateDesignTokens } from './validators/validate-design-tokens.js';

// ---------------------------------------------------------------------------
// Shared schema for all validators
// ---------------------------------------------------------------------------

const VALIDATOR_SCHEMA = {
  content: z.string().optional().describe('Inline content to validate'),
  filePath: z.string().optional().describe('File path to validate (reads from disk)'),
};

// ---------------------------------------------------------------------------
// Helper — register a validator tool
// ---------------------------------------------------------------------------

function registerValidator(
  server: McpServer,
  name: string,
  description: string,
  validatorFn: ValidatorFn,
): void {
  registerTool(server, {
    name,
    description,
    schema: VALIDATOR_SCHEMA,
    annotations: { readOnlyHint: true, idempotentHint: true },
    handler: async (args: { content?: string; filePath?: string }) => {
      const text = await resolveContent(args);
      if (!text) {
        return createErrorResult('Provide either "content" or "filePath".');
      }
      const result = validatorFn(text, args.filePath);
      return createTextResult(formatResult(result));
    },
  });
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export const validationModule: AiddModule = {
  name: 'validation',
  description: 'Static validation tools for code, configs, specs, and content',

  register(server: McpServer, _context: ModuleContext) {
    registerValidator(
      server,
      'aidd_validate_tkb_entry',
      'Validate a Technology Knowledge Base entry for completeness, freshness, and structure.',
      validateTkbEntry,
    );

    registerValidator(
      server,
      'aidd_validate_mermaid',
      'Validate Mermaid C4 diagram syntax: balanced braces, C4 directives, Rel() args, duplicate aliases.',
      validateMermaid,
    );

    registerValidator(
      server,
      'aidd_validate_openapi',
      'Validate OpenAPI 3.0+ JSON spec: root keys, operationId, path formats, response codes, governance.',
      validateOpenapi,
    );

    registerValidator(
      server,
      'aidd_validate_sql',
      'Validate SQL syntax: DDL structure, anti-patterns (SELECT *), missing WHERE, naming conventions.',
      validateSql,
    );

    registerValidator(
      server,
      'aidd_scan_secrets',
      'Scan content for hardcoded secrets: AWS keys, API tokens, private keys, connection strings.',
      scanSecrets,
    );

    registerValidator(
      server,
      'aidd_validate_tests',
      'Validate test file structure: file naming, describe/it blocks, assertions, forbidden patterns.',
      validateTests,
    );

    registerValidator(
      server,
      'aidd_validate_dockerfile',
      'Validate Dockerfile best practices: pinned versions, non-root USER, COPY vs ADD, layer optimization.',
      validateDockerfile,
    );

    registerValidator(
      server,
      'aidd_validate_i18n',
      'Validate i18n locale JSON: structure, empty values, placeholder consistency, key naming.',
      validateI18n,
    );

    registerValidator(
      server,
      'aidd_audit_accessibility',
      'Audit HTML/JSX/TSX for accessibility: alt text, ARIA labels, form labels, heading order, keyboard nav.',
      auditAccessibility,
    );

    registerValidator(
      server,
      'aidd_audit_performance',
      'Audit source code for performance anti-patterns: bundle size, re-renders, memory leaks, DOM thrashing.',
      auditPerformance,
    );

    registerValidator(
      server,
      'aidd_validate_design_tokens',
      'Validate design tokens (JSON or CSS): naming conventions, color formats, completeness, spacing grid.',
      validateDesignTokens,
    );
  },
};
