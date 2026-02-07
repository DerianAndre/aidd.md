import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { HelpCircle } from "lucide-react";
import { useNavigationStore } from "../../stores/navigation-store";
import { ROUTES } from "../../lib/constants";

export function AppHeader() {
  const { t } = useTranslation();
  const breadcrumbs = useNavigationStore((s) => s.breadcrumbs);

  return (
    <header className="group/app-header flex items-center justify-between px-6">
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.path} className="contents">
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={crumb.path}>{crumb.label}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </span>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <Link
        to={ROUTES.HELP}
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label={t('nav.help')}
      >
        <HelpCircle size={18} />
      </Link>
    </header>
  );
}
