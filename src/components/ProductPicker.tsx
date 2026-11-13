import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Package, Search, X } from 'lucide-react';
import { useTranslation } from '../contexts/I18nContext';
import type { Product } from '../types/inventory';
import { findProductByBarcode, formatNumber } from '../utils/formatters';
import { interpolate } from '../utils/i18n';

interface ProductPickerProps {
  products: Product[];
  selectedProduct: Product | null;
  onSelect: (product: Product | null) => void;
  onAfterScanSelect?: () => void;
  currency: string;
  error?: string;
}

export function ProductPicker({
  products,
  selectedProduct,
  onSelect,
  onAfterScanSelect,
  currency,
  error,
}: ProductPickerProps) {
  const { t, formatCurrencyLocalized } = useTranslation();
  const inputId = useId();
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const activeProducts = useMemo(
    () => products.filter((p) => !p.isArchived),
    [products]
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activeProducts.slice(0, 20);
    return activeProducts
      .filter((p) => {
        const haystack = [p.name, p.barcode, p.category, p.variantLabel, p.brand]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 20);
  }, [activeProducts, query]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  function handleSelectProduct(product: Product) {
    onSelect(product);
    setQuery('');
    setScanError(null);
    setIsOpen(false);
    onAfterScanSelect?.();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    if (e.key !== 'Enter') return;

    const raw = query.trim();
    if (!raw) return;

    e.preventDefault();
    const barcodeMatch = findProductByBarcode(activeProducts, raw);
    if (barcodeMatch) {
      handleSelectProduct(barcodeMatch);
      return;
    }

    if (matches.length === 1) {
      handleSelectProduct(matches[0]);
      return;
    }

    setScanError(interpolate(t.stock.noActiveMatch, { query: raw }));
    setIsOpen(true);
  }

  if (selectedProduct) {
    return (
      <div>
        <span className="block text-xs font-semibold text-slate-700 mb-1.5">
          {t.stock.productLabel} <span className="text-red-600">*</span>
        </span>
        <div className="h-10 px-3 rounded-lg border border-slate-300 bg-slate-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-sm font-semibold text-slate-950 truncate">
              {selectedProduct.name}
            </span>
            {selectedProduct.variantLabel && (
              <span className="text-xs text-slate-500 shrink-0">
                · {selectedProduct.variantLabel}
              </span>
            )}
            <span className="text-xs text-slate-500 shrink-0">
              ·{' '}
              <span dir="ltr" className="ltr-isolate font-mono tabular-nums">
                {formatNumber(selectedProduct.quantityInStock)}
              </span>{' '}
              {t.common.inStock}
            </span>
            <span className="text-xs text-slate-500 shrink-0">
              · {t.stock.costPrefix}{' '}
              <span dir="ltr" className="ltr-isolate font-mono tabular-nums">
                {formatCurrencyLocalized(selectedProduct.costPrice, currency)}
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setScanError(null);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            aria-label={t.stock.changeProductAria}
            className="h-7 px-2 rounded-md text-xs font-medium text-slate-600 hover:text-slate-950 hover:bg-slate-200/70 inline-flex items-center gap-1 shrink-0"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
            {t.stock.changeBtn}
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 mb-1.5">
        {t.stock.productLabel} <span className="text-red-600">*</span>
      </label>
      <div className="relative">
        <Search
          className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setScanError(null);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={t.stock.pickerPlaceholder}
          className={`w-full h-10 ps-9 pe-3 rounded-lg border bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
            error || scanError
              ? 'border-red-400 focus:border-red-600 focus:ring-red-500/15'
              : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/15'
          }`}
        />
      </div>

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg py-1"
        >
          {matches.length === 0 ? (
            <div className="px-3 py-4 text-xs text-slate-500 text-center">
              {interpolate(t.stock.noMatchingProducts, { query: query.trim() })}
            </div>
          ) : (
            matches.map((product) => (
              <button
                key={product.id}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => handleSelectProduct(product)}
                className="w-full px-3 py-2 text-start hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                    {product.photos?.[0] ? (
                      <img
                        src={product.photos[0]}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-4 h-4 text-slate-400" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{product.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {product.barcode ? (
                        <span dir="ltr" className="ltr-isolate font-mono">
                          {product.barcode}
                        </span>
                      ) : (
                        t.common.noBarcode
                      )}
                      {product.variantLabel ? ` · ${product.variantLabel}` : ''}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-700 shrink-0">
                  <span dir="ltr" className="ltr-isolate font-mono tabular-nums">
                    {formatNumber(product.quantityInStock)}
                  </span>{' '}
                  {t.common.inStock}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {(error || scanError) && (
        <p className="mt-1 text-xs text-red-600">{scanError ?? error}</p>
      )}
    </div>
  );
}
