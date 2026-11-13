import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Barcode,
  Package,
  Plus,
  Printer,
  Search,
  X,
} from 'lucide-react';
import { useTranslation } from '../contexts/I18nContext';
import type { Product } from '../types/inventory';
import {
  computeInventorySummary,
  extractUsedCategories,
  filterProducts,
  findProductByBarcode,
  formatNumber,
  isLowStock,
} from '../utils/formatters';
import { interpolate } from '../utils/i18n';

interface ProductsViewProps {
  products: Product[];
  isLoading: boolean;
  loadError: string | null;
  currency: string;
  isReadOnly?: boolean;
  onAddProduct: (prefillBarcode?: string) => void;
  onEditProduct: (product: Product) => void;
  onPrintLabel: (product: Product) => void;
}

export function ProductsView({
  products,
  isLoading,
  loadError,
  currency,
  isReadOnly = false,
  onAddProduct,
  onEditProduct,
  onPrintLabel,
}: ProductsViewProps) {
  const { t, formatCurrencyLocalized } = useTranslation();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [unmatchedScanCode, setUnmatchedScanCode] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const usedCategories = useMemo(() => extractUsedCategories(products), [products]);
  const summary = useMemo(() => computeInventorySummary(products), [products]);

  const filteredProducts = useMemo(
    () =>
      filterProducts(products, {
        search,
        category: categoryFilter,
        lowStockOnly,
        showArchived,
      }),
    [products, search, categoryFilter, lowStockOnly, showArchived]
  );

  // Keyboard "/" focuses the search / USB barcode scanner input quickly
  useEffect(() => {
    function handleSlashShortcut(e: KeyboardEvent) {
      if (e.key !== '/') return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) {
        return;
      }
      e.preventDefault();
      searchInputRef.current?.focus();
    }
    window.addEventListener('keydown', handleSlashShortcut);
    return () => window.removeEventListener('keydown', handleSlashShortcut);
  }, []);

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    const raw = search.trim();
    if (!raw) return;

    e.preventDefault();
    const matched = findProductByBarcode(products, raw);
    if (matched) {
      setUnmatchedScanCode(null);
      if (isReadOnly) {
        setSearch(matched.barcode || matched.name);
        return;
      }
      setSearch('');
      onEditProduct(matched);
      return;
    }

    if (!isReadOnly && /^\d{4,}$/.test(raw)) {
      setUnmatchedScanCode(raw);
    }
  }

  const hasActiveFilters =
    search.trim() !== '' || categoryFilter !== '' || lowStockOnly || showArchived;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
      {/* Top Header Bar */}
      <header className="min-h-16 px-4 md:px-6 py-3 md:py-0 border-b border-slate-200 flex items-center justify-between gap-4 flex-wrap shrink-0">
        <div className="flex items-baseline gap-3 md:gap-4 min-w-0 flex-wrap">
          <h1 className="text-lg font-bold text-slate-950 tracking-tight whitespace-nowrap">
            {t.products.title}
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums flex-wrap">
            <span className="whitespace-nowrap">
              <span dir="ltr" className="ltr-isolate font-mono">
                {formatNumber(summary.activeCount)}
              </span>{' '}
              {t.products.activeLabel}
            </span>
            <span aria-hidden="true">·</span>
            <span
              className={`whitespace-nowrap ${
                summary.lowStockCount > 0 ? 'text-amber-700 font-medium' : ''
              }`}
            >
              <span dir="ltr" className="ltr-isolate font-mono">
                {formatNumber(summary.lowStockCount)}
              </span>{' '}
              {t.products.lowStockLabel}
            </span>
            {!isReadOnly && (
              <>
                <span aria-hidden="true" className="hidden sm:inline">
                  ·
                </span>
                <span className="hidden sm:inline whitespace-nowrap">
                  {t.products.stockValueLabel}{' '}
                  <span dir="ltr" className="ltr-isolate font-mono">
                    {formatCurrencyLocalized(summary.totalRetailValue, currency)}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>

        {!isReadOnly ? (
          <button
            type="button"
            onClick={() => onAddProduct()}
            className="min-h-[40px] px-4 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-all duration-200 ease-out active:scale-[0.98] inline-flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            {t.products.addProduct}
          </button>
        ) : (
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
            {t.products.readOnlyCatalog}
          </span>
        )}
      </header>

      {/* Scanner & Filter Toolbar */}
      <div className="px-4 md:px-6 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1 min-w-0">
          <div className="relative flex-1 sm:max-w-md">
            <Search
              className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              type="text"
              autoFocus
              aria-label={t.products.searchAria}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (unmatchedScanCode) setUnmatchedScanCode(null);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder={t.products.searchPlaceholder}
              className="w-full min-h-[40px] ps-9 pe-9 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setUnmatchedScanCode(null);
                  searchInputRef.current?.focus();
                }}
                aria-label={t.products.clearSearch}
                className="w-8 h-8 rounded-md text-slate-400 hover:text-slate-700 absolute end-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              aria-label={t.products.filterCategoryAria}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="flex-1 sm:flex-none min-h-[40px] px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 sm:min-w-[170px]"
            >
              <option value="">{t.products.allCategories}</option>
              {usedCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <button
              type="button"
              aria-pressed={lowStockOnly}
              onClick={() => setLowStockOnly((prev) => !prev)}
              className={`min-h-[40px] px-3.5 rounded-lg border text-sm font-medium transition-all duration-200 ease-out active:scale-[0.98] inline-flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600 ${
                lowStockOnly
                  ? 'bg-amber-50 border-amber-400 text-amber-900 font-semibold'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <AlertTriangle
                className={`w-4 h-4 ${lowStockOnly ? 'text-amber-600' : 'text-slate-400'}`}
                aria-hidden="true"
              />
              <span>{t.products.lowStockFilter}</span>
              {summary.lowStockCount > 0 && (
                <span dir="ltr" className="ltr-isolate font-mono text-xs tabular-nums">
                  ({summary.lowStockCount})
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start lg:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setShowArchived(false)}
            className={`min-h-[32px] px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ease-out active:scale-[0.98] whitespace-nowrap inline-flex items-center gap-1 ${
              !showArchived
                ? 'bg-white text-slate-950 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>{t.products.activeTab}</span>
            <span dir="ltr" className="ltr-isolate font-mono">
              ({summary.activeCount})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowArchived(true)}
            className={`min-h-[32px] px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ease-out active:scale-[0.98] whitespace-nowrap inline-flex items-center gap-1 ${
              showArchived
                ? 'bg-white text-slate-950 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>{t.products.archivedTab}</span>
            <span dir="ltr" className="ltr-isolate font-mono">
              ({summary.archivedCount})
            </span>
          </button>
        </div>
      </div>

      {/* Unmatched USB Scan Callout */}
      {unmatchedScanCode && !isReadOnly && (
        <div className="toast-enter px-4 md:px-6 py-3 bg-blue-50 border-b border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-sm text-blue-950">
            <Barcode className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
            <span>
              {t.products.noMatchingBarcode}{' '}
              <span dir="ltr" className="ltr-isolate font-mono font-semibold">
                {unmatchedScanCode}
              </span>
              .
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                const code = unmatchedScanCode;
                setUnmatchedScanCode(null);
                setSearch('');
                onAddProduct(code);
              }}
              className="min-h-[36px] px-3 rounded-md bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 whitespace-nowrap"
            >
              {t.products.addWithBarcode}
            </button>
            <button
              type="button"
              onClick={() => setUnmatchedScanCode(null)}
              className="min-h-[36px] px-2.5 rounded-md text-xs font-medium text-blue-800 hover:bg-blue-100"
            >
              {t.common.dismiss}
            </button>
          </div>
        </div>
      )}

      {/* Main Table / Mobile Cards */}
      <div className="flex-1 overflow-auto pb-24 md:pb-6">
        {loadError && (
          <div className="m-4 md:m-6 p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800 text-start">
            {t.products.loadError} {loadError}
          </div>
        )}

        {isLoading ? (
          <div className="p-4 md:p-6 space-y-3" aria-label={t.products.loadingAria}>
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-14 rounded-lg border border-slate-100 bg-slate-50 animate-pulse"
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 md:py-20 px-6 text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4">
              <Package className="w-6 h-6" aria-hidden="true" />
            </div>
            {products.length === 0 ? (
              <>
                <h2 className="text-base font-semibold text-slate-950">{t.products.emptyTitle}</h2>
                <p className="mt-1.5 text-sm text-slate-600">
                  {isReadOnly ? t.products.emptyReadOnlyBody : t.products.emptyManagerBody}
                </p>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => onAddProduct()}
                    className="mt-5 min-h-[40px] px-4 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    {t.products.addFirstProduct}
                  </button>
                )}
              </>
            ) : (
              <>
                <h2 className="text-base font-semibold text-slate-950">{t.products.noMatchesTitle}</h2>
                <p className="mt-1.5 text-sm text-slate-600">{t.products.noMatchesBody}</p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setCategoryFilter('');
                      setLowStockOnly(false);
                      setShowArchived(false);
                      setUnmatchedScanCode(null);
                    }}
                    className="mt-5 min-h-[40px] px-4 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50"
                  >
                    {t.products.clearFilters}
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-start">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <tr>
                    <th scope="col" className="py-3 ps-6 pe-3 w-16">
                      {t.products.colPhoto}
                    </th>
                    <th scope="col" className="py-3 px-3">
                      {t.products.colProduct}
                    </th>
                    <th scope="col" className="py-3 px-3 w-40">
                      {t.products.colBarcode}
                    </th>
                    <th scope="col" className="py-3 px-3 text-end w-36">
                      {t.products.colSellingPrice}
                    </th>
                    {!isReadOnly && (
                      <th scope="col" className="py-3 px-3 text-end w-32">
                        {t.products.colCostPrice}
                      </th>
                    )}
                    <th scope="col" className="py-3 px-3 text-end w-40">
                      {t.products.colStock}
                    </th>
                    <th scope="col" className="py-3 ps-3 pe-6 text-end w-36">
                      {t.products.colActions}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredProducts.map((product) => {
                    const lowStock = isLowStock(product);
                    const outOfStock = product.quantityInStock <= 0;
                    const firstPhoto = product.photos?.[0];
                    const isBroken = brokenImages[product.id];

                    const metaParts = [
                      product.category,
                      product.variantLabel,
                      product.brand,
                    ].filter((part): part is string => Boolean(part && part.trim() !== ''));

                    return (
                      <tr
                        key={product.id}
                        onClick={isReadOnly ? undefined : () => onEditProduct(product)}
                        className={`hover:bg-slate-50/90 transition-colors group ${
                          isReadOnly ? '' : 'cursor-pointer'
                        }`}
                      >
                        <td className="py-2.5 ps-6 pe-3 align-middle">
                          <div className="w-11 h-11 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                            {firstPhoto && !isBroken ? (
                              <img
                                src={firstPhoto}
                                alt={product.name}
                                referrerPolicy="no-referrer"
                                onError={() =>
                                  setBrokenImages((prev) => ({
                                    ...prev,
                                    [product.id]: true,
                                  }))
                                }
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-5 h-5 text-slate-400" aria-hidden="true" />
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 align-middle">
                          {isReadOnly ? (
                            <span className="font-semibold text-slate-950">{product.name}</span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditProduct(product);
                              }}
                              className="text-start font-semibold text-slate-950 group-hover:text-blue-700 transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
                            >
                              {product.name}
                            </button>
                          )}
                          {metaParts.length > 0 && (
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500">
                              {metaParts.map((part, idx) => (
                                <span
                                  key={`${part}-${idx}`}
                                  className="inline-flex items-center gap-1.5 whitespace-nowrap"
                                >
                                  {idx > 0 && <span aria-hidden="true">·</span>}
                                  <span>{part}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-3 align-middle font-mono text-xs text-slate-600 tabular-nums">
                          {product.barcode ? (
                            <span dir="ltr" className="ltr-isolate">
                              {product.barcode}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 align-middle text-end font-mono font-semibold text-slate-950 tabular-nums whitespace-nowrap">
                          <span dir="ltr" className="ltr-isolate">
                            {formatCurrencyLocalized(product.sellingPrice, currency)}
                          </span>
                        </td>

                        {!isReadOnly && (
                          <td className="py-2.5 px-3 align-middle text-end font-mono text-slate-500 tabular-nums whitespace-nowrap">
                            <span dir="ltr" className="ltr-isolate">
                              {formatCurrencyLocalized(product.costPrice, currency)}
                            </span>
                          </td>
                        )}

                        <td className="py-2.5 px-3 align-middle text-end whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-2">
                            {lowStock && (
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-semibold ${
                                  outOfStock ? 'text-red-700' : 'text-amber-700'
                                }`}
                              >
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                <span>
                                  {outOfStock ? t.products.outOfStock : t.products.lowStock}
                                </span>
                              </span>
                            )}
                            <span
                              dir="ltr"
                              className={`ltr-isolate font-mono font-semibold tabular-nums ${
                                lowStock
                                  ? outOfStock
                                    ? 'text-red-700'
                                    : 'text-amber-800'
                                  : 'text-slate-900'
                              }`}
                            >
                              {formatNumber(product.quantityInStock)}
                            </span>
                          </div>
                        </td>

                        <td
                          className="py-2.5 ps-3 pe-6 align-middle text-end whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {product.barcode ? (
                              <button
                                type="button"
                                onClick={() => onPrintLabel(product)}
                                aria-label={interpolate(t.products.printLabelAria, {
                                  name: product.name,
                                })}
                                title={t.products.printLabelTooltip}
                                className="h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950 inline-flex items-center gap-1.5 transition-all duration-200 ease-out active:scale-[0.98]"
                              >
                                <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>{t.products.labelButton}</span>
                              </button>
                            ) : isReadOnly ? (
                              <span className="text-xs text-slate-400">—</span>
                            ) : null}
                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={() => onEditProduct(product)}
                                aria-label={interpolate(t.products.editAria, { name: product.name })}
                                className="h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition-all duration-200 ease-out active:scale-[0.98]"
                              >
                                {t.products.editButton}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Product Cards */}
            <div className="md:hidden divide-y divide-slate-100 text-start">
              {filteredProducts.map((product) => {
                const lowStock = isLowStock(product);
                const outOfStock = product.quantityInStock <= 0;
                const firstPhoto = product.photos?.[0];
                const isBroken = brokenImages[product.id];

                const metaParts = [
                  product.category,
                  product.variantLabel,
                  product.brand,
                ].filter((part): part is string => Boolean(part && part.trim() !== ''));

                return (
                  <div key={`mobile-${product.id}`} className="p-4 space-y-3 bg-white">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                        {firstPhoto && !isBroken ? (
                          <img
                            src={firstPhoto}
                            alt={product.name}
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setBrokenImages((prev) => ({
                                ...prev,
                                [product.id]: true,
                              }))
                            }
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-slate-400" aria-hidden="true" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-950 leading-snug">
                            {product.name}
                          </p>
                          <p
                            dir="ltr"
                            className="ltr-isolate text-sm font-mono font-bold text-slate-950 tabular-nums whitespace-nowrap shrink-0"
                          >
                            {formatCurrencyLocalized(product.sellingPrice, currency)}
                          </p>
                        </div>

                        {metaParts.length > 0 && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate">
                            {metaParts.join(' · ')}
                          </p>
                        )}

                        <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
                          <span className="text-slate-500 truncate">
                            {product.barcode ? (
                              <span dir="ltr" className="ltr-isolate font-mono">
                                {product.barcode}
                              </span>
                            ) : (
                              t.common.noBarcode
                            )}
                          </span>

                          <div className="inline-flex items-center gap-1.5 shrink-0">
                            {lowStock && (
                              <span
                                className={`inline-flex items-center gap-1 font-semibold ${
                                  outOfStock ? 'text-red-700' : 'text-amber-700'
                                }`}
                              >
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                {outOfStock ? t.products.outShort : t.products.lowShort}
                              </span>
                            )}
                            <span
                              className={`font-semibold ${
                                lowStock
                                  ? outOfStock
                                    ? 'text-red-700'
                                    : 'text-amber-800'
                                  : 'text-slate-900'
                              }`}
                            >
                              <span dir="ltr" className="ltr-isolate font-mono tabular-nums">
                                {formatNumber(product.quantityInStock)}
                              </span>{' '}
                              {t.products.inStockSuffix}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      {!isReadOnly ? (
                        <span className="text-xs text-slate-500">
                          {t.products.costPrefix}{' '}
                          <span dir="ltr" className="ltr-isolate font-mono tabular-nums">
                            {formatCurrencyLocalized(product.costPrice, currency)}
                          </span>
                        </span>
                      ) : (
                        <span />
                      )}

                      <div className="flex items-center gap-2 shrink-0">
                        {product.barcode && (
                          <button
                            type="button"
                            onClick={() => onPrintLabel(product)}
                            aria-label={interpolate(t.products.printLabelAria, {
                              name: product.name,
                            })}
                            className="min-h-[40px] px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all duration-200 ease-out active:scale-[0.98] inline-flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{t.products.labelButton}</span>
                          </button>
                        )}
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => onEditProduct(product)}
                            aria-label={interpolate(t.products.editAria, { name: product.name })}
                            className="min-h-[40px] px-3.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-all duration-200 ease-out active:scale-[0.98] whitespace-nowrap"
                          >
                            {t.products.editButton}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
