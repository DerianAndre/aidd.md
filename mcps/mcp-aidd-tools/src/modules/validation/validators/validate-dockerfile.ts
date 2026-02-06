import type { ValidationResult, ValidationIssue } from '../types.js';

/**
 * Validates Dockerfile best practices.
 * Checks: unpinned images, ADD vs COPY, apt-get, npm ci, USER non-root,
 * HEALTHCHECK, consecutive RUN layers, WORKDIR paths.
 */
export function validateDockerfile(content: string, filePath?: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  const lines = content.split('\n');
  const baseImages: string[] = [];
  let stages = 0;
  let layers = 0;
  let hasHealthcheck = false;
  let hasUser = false;
  let lastUserIsRoot = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    const lineNum = i + 1;

    if (line.startsWith('#') || line === '') continue;

    const instruction = line.split(/\s+/)[0]!.toUpperCase();

    if (['RUN', 'COPY', 'ADD'].includes(instruction)) layers++;

    // FROM — base image analysis
    if (instruction === 'FROM') {
      stages++;
      const fromMatch = line.match(/FROM\s+(\S+)/i);
      if (fromMatch) {
        const image = fromMatch[1]!;
        baseImages.push(image);

        if (image.endsWith(':latest')) {
          issues.push({ severity: 'error', message: `Unpinned base image '${image}'. Use a specific version tag (e.g., node:22-alpine).`, file: filePath, line: lineNum });
        }
        if (!image.includes(':') && !image.includes('@') && !image.startsWith('$')) {
          issues.push({ severity: 'error', message: `Base image '${image}' has no version tag. Pin to a specific version.`, file: filePath, line: lineNum });
        }
        if (!image.includes('alpine') && !image.includes('slim') && !image.includes('distroless') && !image.includes('scratch') && !image.startsWith('$')) {
          issues.push({ severity: 'info', message: `Consider using alpine/slim/distroless variant of '${image}'.`, file: filePath, line: lineNum });
        }
      }
    }

    // ADD vs COPY
    if (instruction === 'ADD') {
      const hasUrl = /https?:\/\//.test(line);
      const hasTar = /\.(tar|gz|bz2|xz|zip)/.test(line);
      if (!hasUrl && !hasTar) {
        issues.push({ severity: 'warning', message: 'Use COPY instead of ADD unless extracting archives or fetching URLs.', file: filePath, line: lineNum });
      }
    }

    // RUN analysis
    if (instruction === 'RUN') {
      if (line.includes('apt-get install') && !line.includes('--no-install-recommends')) {
        issues.push({ severity: 'warning', message: 'apt-get install without --no-install-recommends installs unnecessary packages.', file: filePath, line: lineNum });
      }
      if (line.includes('apt-get install') && !line.includes('rm -rf /var/lib/apt/lists')) {
        issues.push({ severity: 'warning', message: "apt-get install without cache cleanup. Add '&& rm -rf /var/lib/apt/lists/*'.", file: filePath, line: lineNum });
      }
      if (/npm\s+install(?!\s+--)/i.test(line) && !line.includes('npm ci')) {
        issues.push({ severity: 'warning', message: "Use 'npm ci' instead of 'npm install' for reproducible builds.", file: filePath, line: lineNum });
      }
    }

    // USER
    if (instruction === 'USER') {
      hasUser = true;
      lastUserIsRoot = /USER\s+(root|0)\s*$/i.test(line);
    }

    if (instruction === 'HEALTHCHECK') hasHealthcheck = true;

    // WORKDIR
    if (instruction === 'WORKDIR') {
      const workdir = line.replace(/WORKDIR\s+/i, '').trim();
      if (!workdir.startsWith('/') && !workdir.startsWith('$')) {
        issues.push({ severity: 'warning', message: `WORKDIR '${workdir}' should use absolute path.`, file: filePath, line: lineNum });
      }
    }
  }

  // Global checks
  if (!hasUser || lastUserIsRoot) {
    issues.push({ severity: 'error', message: 'Container runs as root. Add a non-root USER instruction (e.g., USER node or USER 1001).', file: filePath });
  }

  if (!hasHealthcheck && stages <= 1) {
    issues.push({ severity: 'warning', message: 'No HEALTHCHECK instruction. Add one for production container orchestration.', file: filePath });
  }

  if (stages > 1) {
    issues.push({ severity: 'info', message: `Multi-stage build detected (${stages} stages). Good practice.`, file: filePath });
  }

  // Consecutive RUN layers
  let consecutiveRuns = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('RUN ')) {
      consecutiveRuns++;
      if (consecutiveRuns >= 3) {
        issues.push({ severity: 'warning', message: `${consecutiveRuns}+ consecutive RUN instructions. Merge with '&&' to reduce layers.`, file: filePath });
        break;
      }
    } else if (trimmed !== '' && !trimmed.startsWith('#') && !trimmed.startsWith('\\')) {
      consecutiveRuns = 0;
    }
  }

  const errors = issues.filter((i) => i.severity === 'error').length;
  const valid = errors === 0;
  const summary = valid
    ? `Dockerfile valid: ${stages} stage(s), ${layers} layer(s).`
    : `${errors} error(s) found in Dockerfile.`;

  return { valid, issues, summary };
}
