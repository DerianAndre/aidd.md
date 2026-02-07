import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Zap,
  ShieldCheck,
  GitBranch,
  BookOpen,
  FileText,
  ScrollText,
  LayoutDashboard,
  Server,
  Layers,
  Brain,
  BarChart3,
  Store,
  ArrowRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PageHeader } from '../../../components/layout/page-header';
import { ROUTES } from '../../../lib/constants';
import type { LucideIcon } from 'lucide-react';

const CONCEPTS = [
  { labelKey: 'page.help.concept.agents' as const, descKey: 'page.help.concept.agentsDesc' as const, icon: Users, color: 'text-accent', path: ROUTES.AGENTS },
  { labelKey: 'page.help.concept.skills' as const, descKey: 'page.help.concept.skillsDesc' as const, icon: Zap, color: 'text-warning', path: ROUTES.FRAMEWORK_SKILLS },
  { labelKey: 'page.help.concept.rules' as const, descKey: 'page.help.concept.rulesDesc' as const, icon: ShieldCheck, color: 'text-danger', path: ROUTES.FRAMEWORK_RULES },
  { labelKey: 'page.help.concept.workflows' as const, descKey: 'page.help.concept.workflowsDesc' as const, icon: GitBranch, color: 'text-success', path: ROUTES.FRAMEWORK_WORKFLOWS },
  { labelKey: 'page.help.concept.knowledge' as const, descKey: 'page.help.concept.knowledgeDesc' as const, icon: BookOpen, color: 'text-primary', path: ROUTES.FRAMEWORK_KNOWLEDGE },
  { labelKey: 'page.help.concept.templates' as const, descKey: 'page.help.concept.templatesDesc' as const, icon: FileText, color: 'text-primary', path: ROUTES.FRAMEWORK_TEMPLATES },
  { labelKey: 'page.help.concept.spec' as const, descKey: 'page.help.concept.specDesc' as const, icon: ScrollText, color: 'text-muted-foreground', path: ROUTES.FRAMEWORK_SPEC },
] satisfies { labelKey: string; descKey: string; icon: LucideIcon; color: string; path: string }[];

const HUB_FEATURES = [
  { labelKey: 'page.help.feature.dashboard' as const, descKey: 'page.help.feature.dashboardDesc' as const, icon: LayoutDashboard, path: ROUTES.DASHBOARD },
  { labelKey: 'page.help.feature.mcp' as const, descKey: 'page.help.feature.mcpDesc' as const, icon: Server, path: ROUTES.MCP },
  { labelKey: 'page.help.feature.framework' as const, descKey: 'page.help.feature.frameworkDesc' as const, icon: Layers, path: ROUTES.FRAMEWORK },
  { labelKey: 'page.help.feature.memory' as const, descKey: 'page.help.feature.memoryDesc' as const, icon: Brain, path: ROUTES.SESSIONS },
  { labelKey: 'page.help.feature.intelligence' as const, descKey: 'page.help.feature.intelligenceDesc' as const, icon: BarChart3, path: ROUTES.ANALYTICS },
  { labelKey: 'page.help.feature.marketplace' as const, descKey: 'page.help.feature.marketplaceDesc' as const, icon: Store, path: ROUTES.MARKETPLACE },
] satisfies { labelKey: string; descKey: string; icon: LucideIcon; path: string }[];

export function HelpPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        title={t('page.help.title')}
        description={t('page.help.description')}
      />

      {/* What is AIDD */}
      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t('page.help.whatIsAidd')}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t('page.help.whatIsAiddBody')}
        </p>
      </section>

      {/* Core Concepts */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-foreground">{t('page.help.coreConcepts')}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CONCEPTS.map(({ labelKey, descKey, icon: Icon, color, path }) => (
            <button
              key={labelKey}
              type="button"
              onClick={() => navigate(path)}
              className="group flex flex-col gap-2 rounded-xl border border-border bg-muted/50 p-4 text-left transition-colors hover:border-primary hover:bg-accent/50"
            >
              <div className="flex items-center gap-2">
                <Icon size={18} className={color} />
                <span className="text-sm font-semibold text-foreground">{t(labelKey)}</span>
                <ArrowRight size={12} className="ml-auto text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{t(descKey)}</p>
            </button>
          ))}
        </div>
      </section>

      {/* How They Connect */}
      <section className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('page.help.howTheyConnect')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t('page.help.howTheyConnectBody')}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="rounded-md bg-accent/50 px-2 py-1 text-accent-foreground">Orchestrator</span>
              <ArrowRight size={12} />
              <span className="rounded-md bg-accent/50 px-2 py-1 text-accent-foreground">Agent</span>
              <ArrowRight size={12} />
              <span className="rounded-md bg-warning/20 px-2 py-1 text-warning">Skills</span>
              <span className="text-muted-foreground">+</span>
              <span className="rounded-md bg-danger/20 px-2 py-1 text-danger">Rules</span>
              <ArrowRight size={12} />
              <span className="rounded-md bg-success/20 px-2 py-1 text-success">Workflow</span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Hub Features */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-foreground">{t('page.help.hubFeatures')}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HUB_FEATURES.map(({ labelKey, descKey, icon: Icon, path }) => (
            <button
              key={labelKey}
              type="button"
              onClick={() => navigate(path)}
              className="group flex flex-col gap-2 rounded-xl border border-border bg-muted/50 p-4 text-left transition-colors hover:border-primary hover:bg-accent/50"
            >
              <div className="flex items-center gap-2">
                <Icon size={18} className="text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">{t(labelKey)}</span>
                <ArrowRight size={12} className="ml-auto text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{t(descKey)}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Getting Started */}
      <section className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('page.help.gettingStarted')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {t('page.help.gettingStartedBody')}
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
