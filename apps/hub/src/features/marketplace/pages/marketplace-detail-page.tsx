import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Download,
  Check,
  BadgeCheck,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Spinner } from '@/components/ui/spinner';
import { PageHeader } from '../../../components/layout/page-header';
import { InstallSnippet } from '../components/install-snippet';
import { InstallDialog } from '../components/install-dialog';
import { TagCloud } from '../components/tag-cloud';
import { useMarketplaceStore } from '../stores/marketplace-store';
import { formatInstallCount } from '../lib/catalog-helpers';
import { MCP_CATEGORIES, CONTENT_TYPES, COMPATIBILITY_TARGETS } from '../lib/constants';
import type { McpServerEntry, ContentEntry, MarketplaceTab } from '../lib/types';

export function MarketplaceDetailPage() {
  const { t } = useTranslation();
  const { type, slug } = useParams<{ type: string; slug: string }>();
  const navigate = useNavigate();

  const fetchCatalog = useMarketplaceStore((s) => s.fetchCatalog);
  const loading = useMarketplaceStore((s) => s.loading);
  const usingFallback = useMarketplaceStore((s) => s.usingFallback);
  const getEntryBySlug = useMarketplaceStore((s) => s.getEntryBySlug);
  const toggleTag = useMarketplaceStore((s) => s.toggleTag);

  const [installOpen, setInstallOpen] = useState(false);

  // Ensure catalog is loaded
  useEffect(() => {
    void fetchCatalog();
  }, [fetchCatalog]);

  const entry = type && slug ? getEntryBySlug(type, slug) : undefined;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!entry) {
    return (
      <div>
        <PageHeader title="Not Found" description="This entry could not be found" />
        <Button variant="ghost" onClick={() => navigate('/marketplace')}>
          <ArrowLeft size={14} /> {t('common.back')}
        </Button>
      </div>
    );
  }

  const isMcp = entry.type === 'mcp-server';

  // Resolve the tab label from content type
  const TAB_LABEL_KEYS = {
    'mcp-servers': 'page.marketplace.mcpServers' as const,
    'agents': 'page.marketplace.agents' as const,
    'rules': 'page.marketplace.rules' as const,
    'skills': 'page.marketplace.skills' as const,
    'knowledge': 'page.marketplace.knowledge' as const,
    'workflows': 'page.marketplace.workflows' as const,
    'templates': 'page.marketplace.templates' as const,
    'spec': 'page.marketplace.spec' as const,
  } satisfies Record<MarketplaceTab, string>;
  const CONTENT_TYPE_TO_TAB: Record<string, MarketplaceTab> = {
    agent: 'agents',
    rule: 'rules',
    skill: 'skills',
    knowledge: 'knowledge',
    workflow: 'workflows',
    template: 'templates',
    spec: 'spec',
  };
  const resolvedTab: MarketplaceTab = isMcp
    ? 'mcp-servers'
    : CONTENT_TYPE_TO_TAB[(entry as ContentEntry).contentType] ?? 'skills';
  const tabLabel = t(TAB_LABEL_KEYS[resolvedTab]);

  const categoryLabel = isMcp
    ? MCP_CATEGORIES.find((c) => c.value === (entry as McpServerEntry).category)?.label ?? entry.type
    : CONTENT_TYPES.find((c) => c.value === (entry as ContentEntry).contentType)?.label ?? entry.type;

  const handleTagClick = (tag: string) => {
    toggleTag(tag);
    navigate('/marketplace');
  };

  return (
    <div>
      {/* Back + Breadcrumbs */}
      <nav className="mb-4 flex items-center gap-2" aria-label="Breadcrumb">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => navigate('/marketplace')}
          aria-label={t('common.back')}
        >
          <ArrowLeft size={16} />
        </Button>
        <ol className="flex items-center gap-1 text-sm">
          <li>
            <Link to="/marketplace" className="text-muted-foreground hover:text-foreground transition-colors">
              {t('page.marketplace.title')}
            </Link>
          </li>
          <li><ChevronRight size={14} className="text-muted-foreground" /></li>
          <li>
            <Link to="/marketplace" className="text-muted-foreground hover:text-foreground transition-colors">
              {tabLabel}
            </Link>
          </li>
          <li><ChevronRight size={14} className="text-muted-foreground" /></li>
          <li className="text-foreground font-medium">{entry.name}</li>
        </ol>
      </nav>

      <PageHeader
        title={entry.name}
        description={entry.description}
      />

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left -- Main content */}
        <div className="space-y-6">
          {/* Metadata chips */}
          <div className="flex flex-wrap items-center gap-2">
            <Chip size="sm" color="default">{categoryLabel}</Chip>
            {isMcp && (entry as McpServerEntry).transport.map((t) => (
              <Chip key={t} size="sm" color="default">{t.toUpperCase()}</Chip>
            ))}
            {entry.official && (
              <Chip size="sm" color="success">
                <BadgeCheck size={12} className="mr-1" /> {t('common.official')}
              </Chip>
            )}
            {entry.trending && (
              <Chip size="sm" color="accent">
                <TrendingUp size={12} className="mr-1" /> {t('common.trending')}
              </Chip>
            )}
          </div>

          {/* Long description / markdown */}
          {(entry.longDescription || (!isMcp && (entry as ContentEntry).markdownContent)) && (
            <Card>
              <CardContent>
                {entry.longDescription && (
                  <div className="prose prose-sm max-w-none text-foreground">
                    {entry.longDescription}
                  </div>
                )}
                {!isMcp && (entry as ContentEntry).markdownContent && (
                  <div className="whitespace-pre-wrap text-sm text-foreground">
                    {(entry as ContentEntry).markdownContent}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Features list (MCP only) */}
          {isMcp && (entry as McpServerEntry).features.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">{t('page.marketplace.features')}</h3>
              <ul className="space-y-1.5">
                {(entry as McpServerEntry).features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
                    <Check size={14} className="shrink-0 text-success" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tags */}
          {entry.tags.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">{t('page.marketplace.tags')}</h3>
              <TagCloud tags={entry.tags} onTagClick={handleTagClick} />
            </div>
          )}
        </div>

        {/* Right -- Sidebar */}
        <div className="space-y-4">
          {/* Install snippet */}
          {isMcp && (
            <InstallSnippet
              label="JSON Configuration"
              code={JSON.stringify((entry as McpServerEntry).configSnippet, null, 2)}
              language="json"
            />
          )}
          {!isMcp && (entry as ContentEntry).installCommand && (
            <InstallSnippet
              label="Install Command"
              code={(entry as ContentEntry).installCommand!}
              language="bash"
            />
          )}

          {/* Install directly button */}
          {isMcp && (
            <>
              <Button
                className="w-full"
                onClick={() => setInstallOpen(true)}
              >
                <Download size={14} /> {t('page.marketplace.installDirectly')}
              </Button>
              <InstallDialog
                isOpen={installOpen}
                onOpenChange={setInstallOpen}
                configSnippet={(entry as McpServerEntry).configSnippet}
                entryName={entry.name}
              />
            </>
          )}

          {/* Compatibility */}
          {entry.compatibility.length > 0 && (
            <Card className="gap-3 py-3">
              <CardHeader className="py-0">
                <CardTitle className="text-xs font-medium text-muted-foreground">{t('page.marketplace.compatibleWith')}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {entry.compatibility.map((c) => {
                  const target = COMPATIBILITY_TARGETS.find((t) => t.value === c);
                  return (
                    <Chip key={c} size="sm" color="default">
                      {target?.label ?? c}
                    </Chip>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Author + GitHub */}
          <Card className="gap-3 py-3">
            <CardContent className="space-y-2">
              <div>
                <span className="text-xs text-muted-foreground">{t('page.marketplace.author')}</span>
                <p className="text-sm font-medium text-foreground">{entry.author}</p>
              </div>
              {!usingFallback && entry.installCount > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">{t('page.marketplace.installs')}</span>
                  <p className="text-sm font-medium text-foreground">{formatInstallCount(entry.installCount)}</p>
                </div>
              )}
              <div>
                <span className="text-xs text-muted-foreground">{t('page.marketplace.updated')}</span>
                <p className="text-sm text-foreground">{entry.updatedAt}</p>
              </div>
              {entry.githubUrl && (
                <a
                  href={entry.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-accent hover:underline"
                >
                  <ExternalLink size={12} /> {t('page.marketplace.viewOnGithub')}
                </a>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
