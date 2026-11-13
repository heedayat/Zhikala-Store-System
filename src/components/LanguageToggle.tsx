import { useTranslation } from '../contexts/I18nContext';

interface LanguageToggleProps {
  compact?: boolean;
  className?: string;
}

export function LanguageToggle({ compact = false, className = '' }: LanguageToggleProps) {
  const { lang, setLang, t } = useTranslation();

  return (
    <div
      role="group"
      aria-label={t.common.languageLabel}
      data-testid="language-toggle"
      dir="ltr"
      className={`inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 shrink-0 ${className}`}
    >
      <button
        type="button"
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
        className={`rounded-md font-semibold transition-all duration-150 whitespace-nowrap ${
          compact ? 'min-h-[30px] px-2 text-[11px]' : 'min-h-[32px] px-2.5 text-xs'
        } ${
          lang === 'en'
            ? 'bg-white text-slate-950 shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        {t.common.english}
      </button>
      <button
        type="button"
        onClick={() => setLang('ku')}
        aria-pressed={lang === 'ku'}
        className={`rounded-md font-semibold transition-all duration-150 whitespace-nowrap ${
          compact ? 'min-h-[30px] px-2 text-[11px]' : 'min-h-[32px] px-2.5 text-xs'
        } ${
          lang === 'ku'
            ? 'bg-white text-slate-950 shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        {t.common.kurdish}
      </button>
    </div>
  );
}
