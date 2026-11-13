import { useTranslation } from '../contexts/I18nContext';

interface LanguageSwitcherProps {
  compact?: boolean;
  fullWidth?: boolean;
}

export function LanguageSwitcher({ compact = false, fullWidth = false }: LanguageSwitcherProps) {
  const { lang, setLang, t } = useTranslation();

  return (
    <div
      role="group"
      aria-label={t.common.languageSwitchAria}
      dir="ltr"
      className={`ltr-isolate inline-flex items-center rounded-lg border border-slate-200 bg-slate-100/90 p-0.5 select-none ${
        fullWidth ? 'w-full' : 'shrink-0'
      }`}
    >
      <button
        type="button"
        data-testid="lang-btn-en"
        aria-pressed={lang === 'en'}
        onClick={() => setLang('en')}
        className={`${fullWidth ? 'flex-1' : ''} ${
          compact ? 'min-h-[30px] px-2 text-[11px]' : 'min-h-[34px] px-2.5 text-xs'
        } rounded-md font-semibold transition-all duration-150 active:scale-[0.98] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600 ${
          lang === 'en'
            ? 'bg-white text-slate-950 shadow-xs'
            : 'text-slate-600 hover:text-slate-950'
        }`}
      >
        {t.common.englishLabel}
      </button>
      <button
        type="button"
        data-testid="lang-btn-ku"
        aria-pressed={lang === 'ku'}
        onClick={() => setLang('ku')}
        className={`${fullWidth ? 'flex-1' : ''} ${
          compact ? 'min-h-[30px] px-2.5 text-[11px]' : 'min-h-[34px] px-3 text-xs'
        } rounded-md font-semibold transition-all duration-150 active:scale-[0.98] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600 ${
          lang === 'ku'
            ? 'bg-white text-slate-950 shadow-xs'
            : 'text-slate-600 hover:text-slate-950'
        }`}
      >
        {t.common.kurdishLabel}
      </button>
    </div>
  );
}
