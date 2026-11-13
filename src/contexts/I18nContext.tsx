import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  PaymentMethod,
  StockMovementReason,
  StockMovementType,
  UserRole,
} from '../types/inventory';
import {
  formatCurrencyLocalized,
  getCurrencyUnitLocalized,
  getMovementTypeLocalized,
  getPaymentLabelLocalized,
  getRoleLabelLocalized,
  getStockReasonLocalized,
  getTranslations,
  getWeekdayLabelLocalized,
  getWeekdayOptionsLocalized,
  loadSavedLanguage,
  saveLanguagePreference,
  type AppLanguage,
  type TranslationDictionary,
} from '../utils/i18n';

interface I18nContextValue {
  lang: AppLanguage;
  isRtl: boolean;
  dir: 'ltr' | 'rtl';
  htmlLang: 'en' | 'ckb';
  setLang: (lang: AppLanguage) => void;
  toggleLang: () => void;
  t: TranslationDictionary;
  formatCurrencyLocalized: (amount: number, currency?: string) => string;
  currencyUnit: (currency: string) => string;
  roleLabel: (role: UserRole) => string;
  paymentLabel: (method: PaymentMethod | string | undefined | null) => string;
  weekdayLabel: (day: number) => string;
  weekdayOptions: { value: number; label: string }[];
  stockReasonLabel: (reason: StockMovementReason | string) => string;
  movementTypeLabel: (type: StockMovementType) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<AppLanguage>(() => loadSavedLanguage());

  const isRtl = lang === 'ku';
  const dir: 'ltr' | 'rtl' = isRtl ? 'rtl' : 'ltr';
  const htmlLang: 'en' | 'ckb' = isRtl ? 'ckb' : 'en';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = dir;
      document.documentElement.lang = htmlLang;
      if (document.body) {
        document.body.dir = dir;
      }
    }
    saveLanguagePreference(lang);
  }, [dir, htmlLang, lang]);

  const setLang = useCallback((next: AppLanguage) => {
    setLangState(next === 'ku' ? 'ku' : 'en');
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => (prev === 'ku' ? 'en' : 'ku'));
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const t = getTranslations(lang);
    return {
      lang,
      isRtl,
      dir,
      htmlLang,
      setLang,
      toggleLang,
      t,
      formatCurrencyLocalized: (amount: number, currency = 'IQD') =>
        formatCurrencyLocalized(amount, currency, lang),
      currencyUnit: (currency: string) => getCurrencyUnitLocalized(currency, lang),
      roleLabel: (role: UserRole) => getRoleLabelLocalized(role, lang),
      paymentLabel: (method: PaymentMethod | string | undefined | null) =>
        getPaymentLabelLocalized(method, lang),
      weekdayLabel: (day: number) => getWeekdayLabelLocalized(day, lang),
      weekdayOptions: getWeekdayOptionsLocalized(lang),
      stockReasonLabel: (reason: StockMovementReason | string) =>
        getStockReasonLocalized(reason, lang),
      movementTypeLabel: (type: StockMovementType) => getMovementTypeLocalized(type, lang),
    };
  }, [dir, htmlLang, isRtl, lang, setLang, toggleLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return ctx;
}
