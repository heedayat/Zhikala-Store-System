import { useEffect, useState, type FormEvent } from 'react';
import { Download, X } from 'lucide-react';
import type { Product, Sale, StockMovement } from '../types/inventory';
import {
  buildProductsBackupCsv,
  buildSalesBackupCsv,
  buildStockMovementsBackupCsv,
  downloadCsvFile,
  getBackupFilename,
} from '../utils/backupCsv';
import { formatActionError, formatNumber } from '../utils/formatters';
import { normalizeWeekStartDay, WEEKDAY_OPTIONS } from '../utils/reports';

interface ShopSettingsModalProps {
  initialShopName: string;
  initialCurrency: string;
  initialWeekStartDay: number;
  products: Product[];
  sales: Sale[];
  movements: StockMovement[];
  onSave: (shopName: string, currency: string, weekStartDay: number) => Promise<void>;
  onClose: () => void;
}

export function ShopSettingsModal({
  initialShopName,
  initialCurrency,
  initialWeekStartDay,
  products,
  sales,
  movements,
  onSave,
  onClose,
}: ShopSettingsModalProps) {
  const [shopName, setShopName] = useState(initialShopName);
  const [currency, setCurrency] = useState(initialCurrency);
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cleanName = shopName.trim();
    const cleanCurrency = currency.trim();
    if (!cleanName) {
      setError('Shop name is required.');
      return;
    }
    if (!cleanCurrency) {
      setError('Currency code is required.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onSave(cleanName, cleanCurrency, weekStartDay);
      onClose();
    } catch (err) {
      setError(formatActionError(err, 'Failed to save shop settings.'));
      setIsSaving(false);
    }
  }

  function handleExportDataset(dataset: 'products' | 'sales' | 'stock-movements') {
    const activeShopName = shopName.trim() || initialShopName;
    const activeCurrency = currency.trim() || initialCurrency;
    const filename = getBackupFilename(activeShopName, dataset);
    if (dataset === 'products') {
      downloadCsvFile(filename, buildProductsBackupCsv(products, activeCurrency));
    } else if (dataset === 'sales') {
      downloadCsvFile(filename, buildSalesBackupCsv(sales, activeCurrency));
    } else {
      downloadCsvFile(filename, buildStockMovementsBackupCsv(movements, activeCurrency));
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shop-settings-title"
      className="fixed inset-0 z-50 bg-slate-950/45 flex items-center justify-center p-6"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 id="shop-settings-title" className="text-base font-bold text-slate-950">
            Shop Settings &amp; Backup
          </h2>
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            aria-label="Close shop settings"
            className="w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="shop-name-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Shop name
            </label>
            <input
              id="shop-name-input"
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              maxLength={80}
              placeholder="e.g. Little Wonders"
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
            <p className="mt-1 text-xs text-slate-500">
              Displayed in the sidebar and printed on labels, receipts, and reports.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="shop-currency-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Currency
              </label>
              <input
                id="shop-currency-input"
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                maxLength={12}
                placeholder="IQD"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
            </div>

            <div>
              <label htmlFor="shop-week-start-select" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Week starts on
              </label>
              <select
                id="shop-week-start-select"
                value={weekStartDay}
                onChange={(e) => setWeekStartDay(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              >
                {WEEKDAY_OPTIONS.map((opt) => (
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
              <p className="text-xs font-semibold text-slate-800">Full Store Backup (CSV)</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Download complete records for offline safekeeping or spreadsheet review.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleExportDataset('products')}
                className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                Products ({formatNumber(products.length)})
              </button>
              <button
                type="button"
                onClick={() => handleExportDataset('sales')}
                className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                Sales ({formatNumber(sales.length)})
              </button>
              <button
                type="button"
                onClick={() => handleExportDataset('stock-movements')}
                className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                Movements ({formatNumber(movements.length)})
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="h-10 px-4 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="h-10 px-5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
