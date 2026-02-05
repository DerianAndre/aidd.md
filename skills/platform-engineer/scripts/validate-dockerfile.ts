#!/usr/bin/env node
/**
 * Dockerfile & CI Config Validator (TypeScript)
 *
 * Validates Dockerfile best practices and CI configuration structure.
 * Checks: multi-stage builds, root user, COPY vs ADD, pinned versions,
 * .dockerignore presence, health checks, layer optimization.
 *
 * Usage:
 *   npx tsx validate-dockerfile.ts Dockerfile
 *   npx tsx validate-dockerfile.ts docker/Dockerfile.production
 */

import * as fs from "fs";
import * as path from "path";

interface ValidationIssue {
  severity: "error" | "warning" | "info";
  message: string;
  line?: number;
}

interface DockerfileReport {
  file: string;
  issues: ValidationIssue[];
  stats: {
    stages: number;
    layers: number;
    exposedPorts: number[];
    baseImages: string[];
  };
}

function validateDockerfile(filePath: string): DockerfileReport {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const issues: ValidationIssue[] = [];
  const baseImages: string[] = [];
  const exposedPorts: number[] = [];
  let stages = 0;
  let layers = 0;
  let hasHealthcheck = false;
  let hasUser = false;
  let lastUserIsRoot = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    if (line.startsWith("#") || line === "") continue;

    const instruction = line.split(/\s+/)[0].toUpperCase();

    if (["RUN", "COPY", "ADD"].includes(instruction)) {
      layers++;
    }

    // FROM — base image analysis
    if (instruction === "FROM") {
      stages++;
      const fromMatch = line.match(/FROM\s+(\S+)/i);
      if (fromMatch) {
        const image = fromMatch[1];
        baseImages.push(image);

        if (image.endsWith(":latest")) {
          issues.push({
            severity: "error",
            message: `Unpinned base image '${image}'. Use a specific version tag (e.g., node:22-alpine).`,
            line: lineNum,
          });
        }

        if (!image.includes(":") && !image.includes("@")) {
          issues.push({
            severity: "error",
            message: `Base image '${image}' has no version tag. Pin to a specific version.`,
            line: lineNum,
          });
        }

        if (
          !image.includes("alpine") &&
          !image.includes("slim") &&
          !image.includes("distroless") &&
          !image.includes("scratch") &&
          !image.startsWith("$")
        ) {
          issues.push({
            severity: "info",
            message: `Consider using alpine/slim/distroless variant of '${image}' to reduce image size.`,
            line: lineNum,
          });
        }
      }
    }

    // ADD vs COPY
    if (instruction === "ADD") {
      const hasUrl = /https?:\/\//.test(line);
      const hasTar = /\.(tar|gz|bz2|xz|zip)/.test(line);
      if (!hasUrl && !hasTar) {
        issues.push({
          severity: "warning",
          message: "Use COPY instead of ADD unless extracting archives or fetching URLs.",
          line: lineNum,
        });
      }
    }

    // RUN analysis
    if (instruction === "RUN") {
      if (line.includes("apt-get install") && !line.includes("--no-install-recommends")) {
        issues.push({
          severity: "warning",
          message: "apt-get install without --no-install-recommends. This installs unnecessary packages.",
          line: lineNum,
        });
      }

      if (line.includes("apt-get install") && !line.includes("rm -rf /var/lib/apt/lists")) {
        issues.push({
          severity: "warning",
          message: "apt-get install without cache cleanup. Add '&& rm -rf /var/lib/apt/lists/*' to reduce layer size.",
          line: lineNum,
        });
      }

      if (/npm\s+install(?!\s+--)/i.test(line) && !line.includes("npm ci")) {
        issues.push({
          severity: "warning",
          message: "Use 'npm ci' instead of 'npm install' for reproducible builds.",
          line: lineNum,
        });
      }
    }

    // USER instruction
    if (instruction === "USER") {
      hasUser = true;
      lastUserIsRoot = /USER\s+(root|0)\s*$/i.test(line);
    }

    if (instruction === "HEALTHCHECK") {
      hasHealthcheck = true;
    }

    if (instruction === "EXPOSE") {
      const portMatch = line.match(/EXPOSE\s+(\d+)/);
      if (portMatch) {
        exposedPorts.push(parseInt(portMatch[1], 10));
      }
    }

    if (instruction === "WORKDIR") {
      const workdir = line.replace(/WORKDIR\s+/i, "").trim();
      if (!workdir.startsWith("/") && !workdir.startsWith("$")) {
        issues.push({
          severity: "warning",
          message: `WORKDIR '${workdir}' should use absolute path.`,
          line: lineNum,
        });
      }
    }
  }

  // Global checks
  if (!hasUser || lastUserIsRoot) {
    issues.push({
      severity: "error",
      message: "Container runs as root. Add a non-root USER instruction (e.g., USER node or USER 1001).",
    });
  }

  if (!hasHealthcheck && stages <= 1) {
    issues.push({
      severity: "warning",
      message: "No HEALTHCHECK instruction. Add one for production container orchestration.",
    });
  }

  if (stages > 1) {
    issues.push({
      severity: "info",
      message: `Multi-stage build detected (${stages} stages). Good practice.`,
    });
  }

  // Check for .dockerignore
  const dir = path.dirname(filePath);
  if (!fs.existsSync(path.join(dir, ".dockerignore"))) {
    issues.push({
      severity: "warning",
      message: "No .dockerignore file found. Create one to exclude node_modules, .git, etc.",
    });
  }

  // Check consecutive RUN layers
  let consecutiveRuns = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("RUN ")) {
      consecutiveRuns++;
      if (consecutiveRuns >= 3) {
        issues.push({
          severity: "warning",
          message: `${consecutiveRuns} consecutive RUN instructions detected. Merge with '&&' to reduce layers.`,
        });
        break;
      }
    } else if (trimmed !== "" && !trimmed.startsWith("#") && !trimmed.startsWith("\\")) {
      consecutiveRuns = 0;
    }
  }

  return { file: filePath, issues, stats: { stages, layers, exposedPorts, baseImages } };
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: npx tsx validate-dockerfile.ts <Dockerfile>");
    console.log("\nExamples:");
    console.log("  npx tsx validate-dockerfile.ts Dockerfile");
    console.log("  npx tsx validate-dockerfile.ts docker/Dockerfile.production");
    process.exit(1);
  }

  const filePath = args[0];

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const report = validateDockerfile(filePath);
  const errors = report.issues.filter((i) => i.severity === "error");
  const warnings = report.issues.filter((i) => i.severity === "warning");
  const infos = report.issues.filter((i) => i.severity === "info");

  console.log(`\nDockerfile Analysis: ${report.file}`);
  console.log("─────────────────────────────────────");
  console.log(`📊 ${report.stats.stages} stage(s), ${report.stats.layers} layer(s)`);
  console.log(`   Base images: ${report.stats.baseImages.join(", ")}`);

  if (report.stats.exposedPorts.length > 0) {
    console.log(`   Exposed ports: ${report.stats.exposedPorts.join(", ")}`);
  }

  if (report.issues.length > 0) {
    console.log("");
    for (const issue of report.issues) {
      const icon = issue.severity === "error" ? "❌" : issue.severity === "warning" ? "⚠️ " : "ℹ️ ";
      const location = issue.line ? ` (line ${issue.line})` : "";
      console.log(`  ${icon}${location} ${issue.message}`);
    }
  }

  console.log("\n─────────────────────────────────────");
  if (errors.length > 0) {
    console.log(`❌ ${errors.length} error(s), ${warnings.length} warning(s), ${infos.length} info(s)`);
    process.exit(1);
  } else if (warnings.length > 0) {
    console.log(`⚠️  ${warnings.length} warning(s), ${infos.length} info(s)`);
    process.exit(0);
  } else {
    console.log("✅ Dockerfile follows best practices");
    process.exit(0);
  }
}

main();
