import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';

/** Read a file and return its content as string, or null if not found. */
export function readFileOrNull(filePath: string): string | null {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/** Read and parse a JSON file. Returns null on failure. */
export function readJsonFile<T = unknown>(filePath: string): T | null {
  const content = readFileOrNull(filePath);
  if (!content) return null;
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/** Write a JSON file (ensures parent directory exists). */
export function writeJsonFile(filePath: string, data: unknown): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/** Write a text file (ensures parent directory exists). */
export function writeFileSafe(filePath: string, content: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, content, 'utf-8');
}

/** List files in a directory matching an optional extension filter. */
export function listFiles(
  dirPath: string,
  options?: { extensions?: string[]; recursive?: boolean },
): string[] {
  if (!existsSync(dirPath)) return [];

  const results: string[] = [];
  const entries = readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);

    if (entry.isDirectory() && options?.recursive) {
      results.push(...listFiles(fullPath, options));
    } else if (entry.isFile()) {
      if (options?.extensions) {
        const ext = extname(entry.name);
        if (options.extensions.includes(ext)) {
          results.push(fullPath);
        }
      } else {
        results.push(fullPath);
      }
    }
  }

  return results;
}

/** List immediate subdirectories of a path. */
export function listDirectories(dirPath: string): string[] {
  if (!existsSync(dirPath)) return [];

  return readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(dirPath, entry.name));
}

/** Check if a path exists and is a directory. */
export function isDirectory(dirPath: string): boolean {
  try {
    return statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

/** Get the last segment of a path. */
export function getBaseName(filePath: string): string {
  return basename(filePath);
}

/** Ensure a directory exists (creates recursively). */
export function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}
