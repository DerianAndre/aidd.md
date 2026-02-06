import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { loadHubData, saveHubData, frameworkDir, ensureFrameworkDirs } from '../lib/hub-store.js';

const GITHUB_OWNER = 'DerianAndre';
const GITHUB_REPO = 'aidd.md';
const GITHUB_API = 'https://api.github.com';

interface GitHubRelease {
  tag_name: string;
  body?: string;
}

/**
 * `aidd sync` — Download and install framework from GitHub.
 */
export async function runSync(options: { version?: string }): Promise<void> {
  console.log('Syncing framework from GitHub...\n');

  // 1. Determine target version
  let targetVersion: string;
  let changelog: string | undefined;

  if (options.version) {
    targetVersion = options.version;
    console.log(`  Target version: ${targetVersion}`);
  } else {
    console.log('  Fetching latest release...');
    const release = await fetchLatestRelease();
    targetVersion = release.tag_name.replace(/^v/, '');
    changelog = release.body ?? undefined;
    console.log(`  Latest version: ${targetVersion}`);
  }

  // 2. Check if already at this version
  const data = loadHubData();
  if (data.framework_version === targetVersion) {
    console.log(`\n  Already at version ${targetVersion}. Nothing to do.`);
    return;
  }

  if (data.framework_version) {
    console.log(`  Current version: ${data.framework_version}`);
  }

  // 3. Download zipball
  const tag = targetVersion.startsWith('v') ? targetVersion : `v${targetVersion}`;
  const url = `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/zipball/${tag}`;
  console.log(`  Downloading ${tag}...`);

  const resp = await fetch(url, {
    headers: { 'User-Agent': 'aidd-cli/1.0' },
    redirect: 'follow',
  });

  if (!resp.ok) {
    console.error(`  Download failed: HTTP ${resp.status}`);
    process.exit(1);
  }

  // 4. Extract to temp, then copy framework dirs
  const zipBuffer = Buffer.from(await resp.arrayBuffer());
  console.log(`  Downloaded ${(zipBuffer.length / 1024).toFixed(1)} KB`);

  // 5. Extract using node:zlib (tar) or write zip and use a simple extractor
  // For simplicity, we use the AdmZip-like approach with dynamic import
  await extractFramework(zipBuffer);
  console.log('  Extracted to ~/.aidd/framework/');

  // 6. Update hub.json
  data.framework_version = targetVersion;
  data.last_sync_check = new Date().toISOString();
  saveHubData(data);

  console.log(`\n  Synced to version ${targetVersion}`);
  if (changelog) {
    console.log('\n  Changelog:');
    const lines = changelog.split('\n').slice(0, 10);
    for (const line of lines) {
      console.log(`    ${line}`);
    }
    if (changelog.split('\n').length > 10) {
      console.log('    ...');
    }
  }
}

async function fetchLatestRelease(): Promise<GitHubRelease> {
  const url = `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'aidd-cli/1.0' },
  });

  if (resp.status === 404) {
    throw new Error('No releases found for this repository');
  }
  if (!resp.ok) {
    throw new Error(`GitHub API returned ${resp.status}`);
  }

  return resp.json() as Promise<GitHubRelease>;
}

/**
 * Extract framework-relevant files from a GitHub zipball.
 * Strips the top-level directory and only extracts framework categories.
 */
async function extractFramework(zipBuffer: Buffer): Promise<void> {
  // Dynamic import for zip handling — uses yauzl-promise or falls back to manual
  // For Node.js 22, we can use the built-in DecompressionStream + tar, but
  // GitHub uses zip format. We'll do a simple extraction using a temp file approach.
  const fwDir = frameworkDir();
  ensureFrameworkDirs();

  const categories = ['rules/', 'skills/', 'knowledge/', 'workflows/', 'templates/', 'specs/'];
  const topFiles = ['AGENTS.md', 'CONTRIBUTING.md', 'README.md'];

  const entries = parseZipEntries(zipBuffer);

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    // Strip top-level directory (e.g., "DerianAndre-aidd.md-abc1234/")
    const parts = entry.name.split('/');
    if (parts.length < 2) continue;
    const relative = parts.slice(1).join('/');

    // Filter: only extract framework-relevant content
    const shouldExtract =
      categories.some((cat) => relative.startsWith(cat)) ||
      topFiles.includes(relative);

    if (!shouldExtract) continue;

    const targetPath = join(fwDir, relative);
    const targetDir = join(targetPath, '..');
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    writeFileSync(targetPath, entry.data);
  }
}

interface ZipEntry {
  name: string;
  isDirectory: boolean;
  data: Buffer;
}

/**
 * Minimal ZIP parser — handles standard ZIP files from GitHub.
 * Parses local file headers and extracts deflated/stored entries.
 */
function parseZipEntries(buf: Buffer): ZipEntry[] {
  const entries: ZipEntry[] = [];

  // Find end of central directory
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) return entries;

  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  const cdEntries = buf.readUInt16LE(eocdOffset + 10);

  let pos = cdOffset;
  for (let i = 0; i < cdEntries; i++) {
    if (buf.readUInt32LE(pos) !== 0x02014b50) break;

    const compressionMethod = buf.readUInt16LE(pos + 10);
    const compressedSize = buf.readUInt32LE(pos + 20);
    const uncompressedSize = buf.readUInt32LE(pos + 24);
    const nameLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30);
    const commentLen = buf.readUInt16LE(pos + 32);
    const localHeaderOffset = buf.readUInt32LE(pos + 42);

    const name = buf.toString('utf-8', pos + 46, pos + 46 + nameLen);
    const isDirectory = name.endsWith('/');

    // Read data from local file header
    const localPos = localHeaderOffset;
    const localNameLen = buf.readUInt16LE(localPos + 26);
    const localExtraLen = buf.readUInt16LE(localPos + 28);
    const dataStart = localPos + 30 + localNameLen + localExtraLen;

    let data: Buffer;
    if (isDirectory || uncompressedSize === 0) {
      data = Buffer.alloc(0);
    } else if (compressionMethod === 0) {
      // Stored
      data = buf.subarray(dataStart, dataStart + compressedSize);
    } else if (compressionMethod === 8) {
      // Deflated
      const compressed = buf.subarray(dataStart, dataStart + compressedSize);
      data = inflateRawSync(compressed);
    } else {
      // Skip unsupported compression
      data = Buffer.alloc(0);
    }

    entries.push({ name, isDirectory, data });
    pos += 46 + nameLen + extraLen + commentLen;
  }

  return entries;
}
