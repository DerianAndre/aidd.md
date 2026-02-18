import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function McpRequiredBanner() {
  const { t } = useTranslation();
  return (
    <Card className="border-warning/50 bg-warning/5">
      <CardContent className="flex items-center gap-3 py-4">
        <AlertTriangle size={18} className="shrink-0 text-warning" />
        <p className="text-sm text-muted-foreground">{t('page.diagnostics.mcpRequired')}</p>
      </CardContent>
    </Card>
  );
}
