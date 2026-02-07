import { useTranslation } from 'react-i18next';

export function AppFooter() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center gap-1 mt-4">
      <span className="text-lg">❤️</span>
      <span className="text-lg text-muted-foreground/50">{t('footer.by')}</span>
      <a
        href="https://derianandre.com"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2"
      >
        <span className="text-2xl">🧔🏻‍♂️</span>
        <div className="text-xs flex flex-col">
          <span>{t('footer.humanName')} </span>
          <span className="text-[10px] text-muted-foreground/70">
            {t('footer.humanHandle')}
          </span>
        </div>
      </a>
      <span className="text-lg text-muted-foreground/50">{t('footer.and')}</span>
      <div className="flex items-center gap-2">
        <span className="text-2xl">🤖</span>
        <div className="text-xs flex flex-col">
          <span>{t('footer.aiName')} </span>
          <span className="text-[10px] text-muted-foreground/70">
            {t('footer.aiModels')}
          </span>
        </div>
      </div>
    </div>
  );
}
