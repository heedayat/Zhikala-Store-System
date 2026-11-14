import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Download, Trash2, Upload, X } from 'lucide-react';
import { useTranslation } from '../contexts/I18nContext';
import type {
  Product,
  Sale,
  StockMovement,
  SupportedCurrency,
} from '../types/inventory';
import {
  buildProductsBackupCsv,
  buildSalesBackupCsv,
  buildStockMovementsBackupCsv,
  downloadCsvFile,
  getBackupFilename,
} from '../utils/backupCsv';
import { formatActionError, formatNumber, normalizeLogoUrl } from '../utils/formatters';
import { formatOptimizedSizeBadge } from '../utils/i18n';
import {
  compressLogoImage,
  getPreviewImageSizeBytes,
  validateRawImageFile,
} from '../utils/imageCompression';
import { normalizeWeekStartDay } from '../utils/reports';
import { LanguageToggle } from './LanguageToggle';
import { StoreLogo } from './StoreLogo';

export interface StoreSettingsFormValues {
  shopName: string;
  storeSubtitle: string;
  receiptFooter: string;
  logoUrl: string;
  currency: SupportedCurrency;
  weekStartDay: number;
}

interface ShopSettingsModalProps {
  initialShopName: string;
  initialStoreSubtitle: string;
  initialReceiptFooter: string;
  initialLogoUrl: string;
  initialCurrency: SupportedCurrency;
  initialWeekStartDay: number;
  products: Product[];
  sales: Sale[];
  movements: StockMovement[];
  onSave: (values: StoreSettingsFormValues) => Promise<void>;
  onClose: () => void;
}

export function ShopSettingsModal({
  initialShopName,
  initialStoreSubtitle,
  initialReceiptFooter,
  initialLogoUrl,
  initialCurrency,
  initialWeekStartDay,
  products,
  sales,
  movements,
  onSave,
  onClose,
}: ShopSettingsModalProps) {
  const { lang, t, weekdayOptions } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [shopName, setShopName] = useState(initialShopName);
  const [storeSubtitle, setStoreSubtitle] = useState(initialStoreSubtitle);
  const [receiptFooter, setReceiptFooter] = useState(initialReceiptFooter);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [logoSizeBytes, setLogoSizeBytes] = useState<number | null>(() =>
    getPreviewImageSizeBytes(initialLogoUrl)
  );
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [currency, setCurrency] = useState<SupportedCurrency>(
    initialCurrency === 'USD' ? 'USD' : 'IQD'
  );
  const [weekStartDay, setWeekStartDay] = useState(normalizeWeekStartDay(initialWeekStartDay));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isSaving) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSaving, onClose]);

  async function handleLogoFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      validateRawImageFile(file);
    } catch (err) {
      setError(formatActionError(err, t.settings.errorImageType));
      return;
    }

    setIsProcessingLogo(true);
    setError(null);
    try {
      const compressed = await compressLogoImage(file);
      setLogoUrl(compressed.dataUrl);
      setLogoSizeBytes(compressed.byteLength);
    } catch (err) {
      setError(formatActionError(err, t.settings.errorLogoProcess));
    } finally {
      setIsProcessingLogo(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cleanName = shopName.trim();
    if (!cleanName) {
      setError(t.settings.errorNameRequired);
      return;
    }

    const trimmedLogo = logoUrl.trim();
    const cleanLogoUrl = normalizeLogoUrl(trimmedLogo);
    if (trimmedLogo !== '' && cleanLogoUrl === '') {
      setError(t.settings.errorLogoInvalid);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        shopName: cleanName,
        storeSubtitle: storeSubtitle.trim(),
        receiptFooter: receiptFooter.trim(),
        logoUrl: cleanLogoUrl,
        currency,
        weekStartDay,
      });
      onClose();
    } catch (err) {
      setError(formatActionError(err, t.settings.errorSaveFailed));
      setIsSaving(false);
    }
  }

  function handleExportDataset(dataset: 'products' | 'sales' | 'stock-movements') {
    const activeShopName = shopName.trim() || initialShopName;
    const filename = getBackupFilename(activeShopName, dataset);
    if (dataset === 'products') {
      downloadCsvFile(filename, buildProductsBackupCsv(products, currency));
    } else if (dataset === 'sales') {
      downloadCsvFile(filename, buildSalesBackupCsv(sales, currency));
    } else {
      downloadCsvFile(filename, buildStockMovementsBackupCsv(movements, currency));
    }
  }

  const isDataLogo = logoUrl.startsWith('data:image/');
  const resolvedLogoBytes = logoSizeBytes ?? getPreviewImageSizeBytes(logoUrl);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shop-settings-title"
      className="modal-backdrop-enter fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
    >
      <div className="modal-panel-enter bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h2 id="shop-settings-title" className="text-base font-bold text-slate-950">
            {t.settings.title}
          </h2>
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            aria-label={t.settings.closeAria}
            className="w-9 h-9 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto text-start">
          {error && (
            <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Language Selection */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-800">{t.settings.language}</span>
            <LanguageToggle />
          </div>

          {/* Store Logo Upload / URL */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <StoreLogo logoUrl={logoUrl} shopName={shopName || 'Store'} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800">{t.settings.storeLogoLabel}</p>
                  <p className="text-[11px] text-slate-500 truncate">{t.settings.storeLogoHint}</p>
                  {resolvedLogoBytes !== null && (
                    <span
                      data-testid="logo-size-badge"
                      className="mt-1 inline-flex items-center px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-medium text-slate-600"
                    >
                      {formatOptimizedSizeBadge(resolvedLogoBytes, lang)}
                    </span>
                  )}
                </div>
              </div>

              {logoUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setLogoUrl('');
                    setLogoSizeBytes(null);
                  }}
                  className="min-h-[36px] px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:text-red-700 hover:border-red-200 hover:bg-red-50 inline-flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t.settings.resetLogo}</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/heic,image/heif,image/*,.heic,.heif"
                aria-label={t.settings.uploadLogoAria}
                onChange={handleLogoFileChange}
                className="hidden"
              />
              <button
                type="button"
                disabled={isProcessingLogo}
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[40px] px-3.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-60 inline-flex items-center justify-center gap-1.5 transition-all duration-200 ease-out active:scale-[0.98] whitespace-nowrap shrink-0"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
                <span>{isProcessingLogo ? t.settings.processingLogo : t.settings.uploadPng}</span>
              </button>

              <input
                id="store-logo-url-input"
                type="text"
                dir="ltr"
                aria-label={t.settings.logoUrlAria}
                value={isDataLogo ? '' : logoUrl}
                onChange={(e) => {
                  const val = e.target.value;
                  setLogoUrl(val);
                  setLogoSizeBytes(getPreviewImageSizeBytes(val));
                }}
                placeholder={
                  isDataLogo
                    ? t.settings.logoUrlUploadedPlaceholder
                    : t.settings.logoUrlPlaceholder
                }
                className="ltr-isolate flex-1 min-h-[40px] px-3 rounded-lg border border-slate-300 bg-white text-xs font-mono text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
            </div>
          </div>

          <div>
            <label htmlFor="shop-name-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.settings.storeName} <span className="text-red-600">*</span>
            </label>
            <input
              id="shop-name-input"
              type="text"
              dir="auto"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              maxLength={80}
              placeholder={t.settings.storeNamePlaceholder}
              className="w-full min-h-[40px] px-3 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
            <p className="mt-1 text-xs text-slate-500">{t.settings.storeNameHint}</p>
          </div>

          <div>
            <label htmlFor="store-subtitle-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.settings.storeSubtitle}
            </label>
            <input
              id="store-subtitle-input"
              type="text"
              dir="auto"
              value={storeSubtitle}
              onChange={(e) => setStoreSubtitle(e.target.value)}
              maxLength={120}
              placeholder={t.settings.storeSubtitlePlaceholder}
              className="w-full min-h-[40px] px-3 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
          </div>

          <div>
            <label htmlFor="receipt-footer-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.settings.receiptFooter}
            </label>
            <textarea
              id="receipt-footer-input"
              dir="auto"
              rows={2}
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              maxLength={240}
              placeholder={t.settings.receiptFooterPlaceholder}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="shop-currency-select" className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.settings.currency}
              </label>
              <select
                id="shop-currency-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value === 'USD' ? 'USD' : 'IQD')}
                className="w-full min-h-[40px] px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              >
                <option value="IQD">{t.common.currencyIqd}</option>
                <option value="USD">{t.common.currencyUsd}</option>
              </select>
            </div>

            <div>
              <label htmlFor="shop-week-start-select" className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.settings.weekStartsOn}
              </label>
              <select
                id="shop-week-start-select"
                value={weekStartDay}
                onChange={(e) => setWeekStartDay(Number(e.target.value))}
                className="w-full min-h-[40px] px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              >
                {weekdayOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Full Store Data Backup (CSV) */}
          <div className="pt-4 border-t border-slate-200 space-y-2.5">
            <div>
              <p className="text-xs font-semibold text-slate-800">{t.settings.backupTitle}</p>
              <p className="text-xs text-slate-500 mt-0.5">{t.settings.backupHint}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleExportDataset('products')}
                className="min-h-[40px] px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-all duration-200 ease-out active:scale-[0.98] inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span>{t.settings.productsBtn}</span>
                <span dir="ltr" className="ltr-isolate font-mono">
                  ({formatNumber(products.length)})
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleExportDataset('sales')}
                className="min-h-[40px] px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-all duration-200 ease-out active:scale-[0.98] inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span>{t.settings.salesBtn}</span>
                <span dir="ltr" className="ltr-isolate font-mono">
                  ({formatNumber(sales.length)})
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleExportDataset('stock-movements')}
                className="min-h-[40px] px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-all duration-200 ease-out active:scale-[0.98] inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span>{t.settings.movementsBtn}</span>
                <span dir="ltr" className="ltr-isolate font-mono">
                  ({formatNumber(movements.length)})
                </span>
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="min-h-[40px] px-4 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all duration-200 ease-out active:scale-[0.98]"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSaving || isProcessingLogo}
              className="min-h-[40px] px-5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 transition-all duration-200 ease-out active:scale-[0.98]"
            >
              {isSaving ? t.common.saving : t.settings.saveSettings}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
