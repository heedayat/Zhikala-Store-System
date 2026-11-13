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
import type { Product } from '../types/inventory';
import {
  computeInventorySummary,
  extractUsedCategories,
  filterProducts,
  findProductByBarcode,
  formatCurrency,
  formatNumber,
  isLowStock,
} from '../utils/formatters';

interface ProductsViewProps {
  products: Product[];
  isLoading: boolean;
  loadError: string | null;
  currency: string;
  onAddProduct: (prefillBarcode?: string) => void;
  onEditProduct: (product: Product) => void;
  onPrintLabel: (product: Product) => void;
}

export function ProductsView({
  products,
  isLoading,
  loadError,
  currency,
  onAddProduct,
  onEditProduct,
  onPrintLabel,
}: ProductsViewProps) {
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
      setSearch('');
      onEditProduct(matched);
      return;
    }

    // If the user/scanner pressed Enter with a barcode-like string and nothing matched
    if (/^\d{4,}$/.test(raw)) {
      setUnmatchedScanCode(raw);
    }
  }

  const hasActiveFilters =
    search.trim() !== '' || categoryFilter !== '' || lowStockOnly || showArchived;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
      {/* Top Header Bar */}
      <header className="h-16 px-6 border-b border-slate-200 flex items-center justify-between gap-6 shrink-0">
        <div className="flex items-baseline gap-4 min-w-0">
          <h1 className="text-lg font-bold text-slate-950 tracking-tight whitespace-nowrap">
            Products
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums whitespace-nowrap overflow-hidden">
            <span>{formatNumber(summary.activeCount)} active</span>
            <span aria-hidden="true">·</span>
            <span className={summary.lowStockCount > 0 ? 'text-amber-700 font-medium' : ''}>
              {formatNumber(summary.lowStockCount)} low stock
            </span>
            <span aria-hidden="true">·</span>
            <span>Stock value: {formatCurrency(summary.totalRetailValue, currency)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onAddProduct()}
          className="h-10 px-4 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Add Product
        </button>
      </header>

      {/* Scanner & Filter Toolbar */}
      <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3 flex-wrap shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-[320px]">
          <div className="relative flex-1 max-w-md">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              type="text"
              autoFocus
              aria-label="Search by name or scan barcode"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (unmatchedScanCode) setUnmatchedScanCode(null);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search name or scan barcode + Enter..."
              className="w-full h-10 pl-9 pr-9 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setUnmatchedScanCode(null);
                  searchInputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-700 absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 min-w-[170px]"
          >
            <option value="">All categories</option>
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
            className={`h-10 px-3.5 rounded-lg border text-sm font-medium transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600 ${
              lowStockOnly
                ? 'bg-amber-50 border-amber-400 text-amber-900 font-semibold'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle
              className={`w-4 h-4 ${lowStockOnly ? 'text-amber-600' : 'text-slate-400'}`}
              aria-hidden="true"
            />
            <span>Low stock</span>
            {summary.lowStockCount > 0 && (
              <span className="font-mono text-xs tabular-nums">({summary.lowStockCount})</span>
            )}
          </button>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg shrink-0">
          <button
            type="button"
            onClick={() => setShowArchived(false)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              !showArchived
                ? 'bg-white text-slate-950 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active ({summary.activeCount})
          </button>
          <button
            type="button"
            onClick={() => setShowArchived(true)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              showArchived
                ? 'bg-white text-slate-950 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Archived ({summary.archivedCount})
          </button>
        </div>
      </div>

      {/* Unmatched USB Scan Callout */}
      {unmatchedScanCode && (
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-sm text-blue-950">
            <Barcode className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
            <span>
              No product matched barcode{' '}
              <span className="font-mono font-semibold">{unmatchedScanCode}</span>.
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
              className="h-8 px-3 rounded-md bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 whitespace-nowrap"
            >
              Add product with this barcode
            </button>
            <button
              type="button"
              onClick={() => setUnmatchedScanCode(null)}
              className="h-8 px-2.5 rounded-md text-xs font-medium text-blue-800 hover:bg-blue-100"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Table / Content */}
      <div className="flex-1 overflow-auto">
        {loadError && (
          <div className="m-6 p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800">
            Could not load products: {loadError}
          </div>
        )}

        {isLoading ? (
          <div className="p-6 space-y-3" aria-label="Loading products">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-14 rounded-lg border border-slate-100 bg-slate-50 animate-pulse"
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 px-6 text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4">
              <Package className="w-6 h-6" aria-hidden="true" />
            </div>
            {products.length === 0 ? (
              <>
                <h2 className="text-base font-semibold text-slate-950">No products yet</h2>
                <p className="mt-1.5 text-sm text-slate-600">
                  Add your first toy with its selling price, cost, stock count, and optional
                  barcode.
                </p>
                <button
                  type="button"
                  onClick={() => onAddProduct()}
                  className="mt-5 h-10 px-4 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  Add first product
                </button>
              </>
            ) : (
              <>
                <h2 className="text-base font-semibold text-slate-950">No matching products</h2>
                <p className="mt-1.5 text-sm text-slate-600">
                  Try clearing your search or adjusting the category and stock filters.
                </p>
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
                    className="mt-5 h-9 px-4 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50"
                  >
                    Clear filters
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
              <tr>
                <th scope="col" className="py-3 pl-6 pr-3 w-16">
                  Photo
                </th>
                <th scope="col" className="py-3 px-3">
                  Product
                </th>
                <th scope="col" className="py-3 px-3 w-40">
                  Barcode
                </th>
                <th scope="col" className="py-3 px-3 text-right w-36">
                  Selling Price
                </th>
                <th scope="col" className="py-3 px-3 text-right w-32">
                  Cost Price
                </th>
                <th scope="col" className="py-3 px-3 text-right w-40">
                  Stock
                </th>
                <th scope="col" className="py-3 pl-3 pr-6 text-right w-36">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
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
                    onClick={() => onEditProduct(product)}
                    className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                  >
                    <td className="py-2.5 pl-6 pr-3 align-middle">
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
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditProduct(product);
                        }}
                        className="text-left font-semibold text-slate-950 group-hover:text-blue-700 transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
                      >
                        {product.name}
                      </button>
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
                      {product.barcode ? product.barcode : <span className="text-slate-400">—</span>}
                    </td>

                    <td className="py-2.5 px-3 align-middle text-right font-mono font-semibold text-slate-950 tabular-nums whitespace-nowrap">
                      {formatCurrency(product.sellingPrice, currency)}
                    </td>

                    <td className="py-2.5 px-3 align-middle text-right font-mono text-slate-500 tabular-nums whitespace-nowrap">
                      {formatCurrency(product.costPrice, currency)}
                    </td>

                    <td className="py-2.5 px-3 align-middle text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-2">
                        {lowStock && (
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold ${
                              outOfStock ? 'text-red-700' : 'text-amber-700'
                            }`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>{outOfStock ? 'Out of stock' : 'Low stock'}</span>
                          </span>
                        )}
                        <span
                          className={`font-mono font-semibold tabular-nums ${
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
                      className="py-2.5 pl-3 pr-6 align-middle text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {product.barcode && (
                          <button
                            type="button"
                            onClick={() => onPrintLabel(product)}
                            aria-label={`Print barcode label for ${product.name}`}
                            title="Print barcode label"
                            className="h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950 inline-flex items-center gap-1.5 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Label</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onEditProduct(product)}
                          aria-label={`Edit ${product.name}`}
                          className="h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
