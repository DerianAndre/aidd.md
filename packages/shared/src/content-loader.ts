import { readFileOrNull, listFiles } from './fs.js';
import { aiddPaths } from './paths.js';
import { parseFrontmatter } from './utils.js';
import type { AiddConfig, ContentPaths } from './types.js';

export interface ContentEntry {
  path: string;
  name: string;
  frontmatter: Record<string, string>;
  /** Full content is loaded lazily via getContent(). */
  getContent: () => string;
}

export interface ContentIndex {
  agents: ContentEntry[];
  rules: ContentEntry[];
  skills: ContentEntry[];
  workflows: ContentEntry[];
  specs: ContentEntry[];
  knowledge: ContentEntry[];
  templates: ContentEntry[];
}

/**
 * ContentLoader handles the hybrid content strategy:
 * 1. Bundled content (shipped with the npm package)
 * 2. Project content (from the user's project)
 * 3. Merged result based on override mode
 */
export class ContentLoader {
  private index: ContentIndex | null = null;

  constructor(
    private readonly bundledRoot: string | null,
    private readonly projectAiddRoot: string | null,
    private readonly overrideMode: AiddConfig['content']['overrideMode'],
    private readonly pathOverrides?: ContentPaths,
  ) {}

  /** Build or return the cached content index. */
  getIndex(): ContentIndex {
    if (this.index) return this.index;

    const bundled = this.bundledRoot ? this.scanRoot(this.bundledRoot) : emptyIndex();
    const project = this.projectAiddRoot ? this.scanRoot(this.projectAiddRoot) : emptyIndex();

    this.index = this.merge(bundled, project);
    return this.index;
  }

  /** Get full content of a specific entry by path. */
  getContent(entryPath: string): string | null {
    return readFileOrNull(entryPath);
  }

  /** Invalidate cache (call after project files change). */
  invalidate(): void {
    this.index = null;
  }

  private scanRoot(root: string): ContentIndex {
    const paths = aiddPaths(root, this.pathOverrides);

    return {
      agents: this.scanDir(paths.agents, false),
      rules: this.scanDir(paths.rules),
      skills: this.scanDir(paths.skills),
      workflows: this.scanDir(paths.workflows),
      specs: this.scanDir(paths.specs),
      knowledge: this.scanDir(paths.knowledge),
      templates: this.scanDir(paths.templates),
    };
  }

  private scanDir(dirPath: string, recursive = true): ContentEntry[] {
    const files = listFiles(dirPath, {
      extensions: ['.md'],
      recursive,
    });

    return files.map((filePath) => {
      const content = readFileOrNull(filePath);
      const { frontmatter } = content ? parseFrontmatter(content) : { frontmatter: {} };
      const name = filePath.split(/[/\\]/).pop() ?? filePath;

      return {
        path: filePath,
        name,
        frontmatter,
        getContent: () => readFileOrNull(filePath) ?? '',
      };
    });
  }

  private merge(bundled: ContentIndex, project: ContentIndex): ContentIndex {
    if (this.overrideMode === 'project_only') return project;
    if (this.overrideMode === 'bundled_only') return bundled;

    // Default: merge — project overrides bundled by filename
    return {
      agents: mergeEntries(bundled.agents, project.agents),
      rules: mergeEntries(bundled.rules, project.rules),
      skills: mergeEntries(bundled.skills, project.skills),
      workflows: mergeEntries(bundled.workflows, project.workflows),
      specs: mergeEntries(bundled.specs, project.specs), // Allow project specs if bundled is empty
      knowledge: mergeEntries(bundled.knowledge, project.knowledge),
      templates: mergeEntries(bundled.templates, project.templates),
    };
  }
}

function emptyIndex(): ContentIndex {
  return {
    agents: [],
    rules: [],
    skills: [],
    workflows: [],
    specs: [],
    knowledge: [],
    templates: [],
  };
}

/** Merge two entry lists — project entries override bundled by name. */
function mergeEntries(bundled: ContentEntry[], project: ContentEntry[]): ContentEntry[] {
  const projectNames = new Set(project.map((e) => e.name));
  const fromBundled = bundled.filter((e) => !projectNames.has(e.name));
  return [...fromBundled, ...project];
}
