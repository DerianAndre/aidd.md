import { Breadcrumbs } from '@heroui/react';
import { useNavigationStore } from '../../stores/navigation-store';
import { ThemeToggle } from '../theme/theme-toggle';

export function AppHeader() {
  const breadcrumbs = useNavigationStore((s) => s.breadcrumbs);

  return (
    <header className="flex h-14 items-center justify-between border-b border-divider px-6">
      <Breadcrumbs>
        {breadcrumbs.map((crumb) => (
          <Breadcrumbs.Item key={crumb.path} href={crumb.path}>
            {crumb.label}
          </Breadcrumbs.Item>
        ))}
      </Breadcrumbs>

      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}
