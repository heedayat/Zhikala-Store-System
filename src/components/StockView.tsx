import { useMemo, useRef, useState, type FormEvent } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  History,
  Minus,
  Plus,
} from 'lucide-react';
import {
  ADD_STOCK_REASONS,
  REMOVE_STOCK_REASONS,
  type Product,
  type StockMovement,
  type StockMovementType,
} from '../types/inventory';
import { formatActionError, formatCurrency, formatNumber } from '../utils/formatters';
import {
  filterStockMovements,
  formatMovementDateTime,
  validateStockAdjustment,
  type StockAdjustmentValidationErrors,
  type ValidatedStockAdjustment,
} from '../utils/stockMovements';
import { ProductPicker } from './ProductPicker';

interface StockViewProps {
  products: Product[];
  movements: StockMovement[];
  isLoadingMovements: boolean;
  loadError: string | null;
  currency: string;
  onRecordAdjustment: (adjustment: ValidatedStockAdjustment) => Promise<void>;
}

export function StockView({
  products,
  movements,
  isLoadingMovements,
  loadError,
  currency,
  onRecordAdjustment,
}: StockViewProps) {
  const quantityInputRef = useRef<HTMLInputElement>(null);

  // Adjustment form state
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [reason, setReason] = useState<string>(ADD_STOCK_REASONS[0]);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<StockAdjustmentValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History filter state
  const [filterProductId, setFilterProductId] = useState('');
  const [filterType, setFilterType] = useState<'all' | StockMovementType>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId]
  );

  const reasonOptions = mode === 'add' ? ADD_STOCK_REASONS : REMOVE_STOCK_REASONS;

  function handleModeSwitch(nextMode: 'add' | 'remove') {
    if (nextMode === mode) return;
    setMode(nextMode);
    setReason(nextMode === 'add' ? ADD_STOCK_REASONS[0] : REMOVE_STOCK_REASONS[0]);
    setCostPrice('');
    setErrors({});
    setSubmitError(null);
    setSuccessMessage(null);
  }

  const parsedPreviewQty = Number(quantity.trim());
  const hasValidPreviewQty =
    quantity.trim() !== '' &&
    Number.isInteger(parsedPreviewQty) &&
    parsedPreviewQty >= 1;

  const previewNextStock =
    selectedProduct && hasValidPreviewQty
      ? selectedProduct.quantityInStock + (mode === 'add' ? parsedPreviewQty : -parsedPreviewQty)
      : null;

  const productFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) {
      map.set(p.id, p.name);
    }
    for (const m of movements) {
      if (!map.has(m.productId)) {
        map.set(m.productId, m.productName);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [products, movements]);

  const filteredMovements = useMemo(
    () =>
      filterStockMovements(movements, {
        productId: filterProductId,
        type: filterType,
        dateFrom,
        dateTo,
      }),
    [movements, filterProductId, filterType, dateFrom, dateTo]
  );

  const hasHistoryFilters =
    filterProductId !== '' || filterType !== 'all' || dateFrom !== '' || dateTo !== '';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    const validation = validateStockAdjustment({
      type: mode,
      product: selectedProduct,
      quantity,
      costPrice,
      reason,
      note,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setSubmitError(null);
    setSuccessMessage(null);

    try {
      await onRecordAdjustment(validation.data);
      const sign = validation.data.quantityChange > 0 ? '+' : '';
      setSuccessMessage(
        `${validation.data.productName}: ${sign}${validation.data.quantityChange} (${validation.data.reason}). New stock: ${formatNumber(validation.data.nextQuantityInStock)}.`
      );
      setQuantity('');
      setCostPrice('');
      setNote('');
      setSelectedProductId(null);
    } catch (err) {
      setSubmitError(formatActionError(err, 'Failed to save stock change.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
      {/* Top Header Bar */}
      <header className="h-16 px-6 border-b border-slate-200 flex items-center justify-between gap-6 shrink-0">
        <div className="flex items-baseline gap-4 min-w-0">
          <h1 className="text-lg font-bold text-slate-950 tracking-tight whitespace-nowrap">
            Stock
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums whitespace-nowrap">
            <span>{formatNumber(movements.length)} movements logged</span>
          </div>
        </div>
      </header>

      {/* Add / Remove Stock Adjustment Form */}
      <section aria-label="Stock adjustment" className="px-6 py-5 border-b border-slate-200 bg-slate-50/70 shrink-0">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => handleModeSwitch('add')}
                className={`h-8 px-3.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  mode === 'add'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Add stock
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch('remove')}
                className={`h-8 px-3.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  mode === 'remove'
                    ? 'bg-white text-red-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                Remove stock
              </button>
            </div>

            {selectedProduct && previewNextStock !== null && (
              <div className="text-xs font-medium tabular-nums">
                <span className="text-slate-500">Stock after update: </span>
                <span
                  className={`font-mono font-bold ${
                    previewNextStock < 0
                      ? 'text-red-700'
                      : mode === 'add'
                        ? 'text-emerald-700'
                        : 'text-slate-950'
                  }`}
                >
                  {formatNumber(selectedProduct.quantityInStock)} → {formatNumber(previewNextStock)}
                </span>
              </div>
            )}
          </div>

          {submitError && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800"
            >
              {submitError}
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="mb-4 p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-xs text-emerald-900 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-12 gap-4 items-start">
              <div className={mode === 'add' ? 'col-span-5' : 'col-span-6'}>
                <ProductPicker
                  products={products}
                  selectedProduct={selectedProduct}
                  onSelect={(product) => {
                    setSelectedProductId(product ? product.id : null);
                    setErrors((prev) => ({ ...prev, product: undefined, quantity: undefined }));
                    setSubmitError(null);
                  }}
                  onAfterScanSelect={() => {
                    setTimeout(() => quantityInputRef.current?.focus(), 0);
                  }}
                  currency={currency}
                  error={errors.product}
                />
              </div>

              <div className="col-span-2">
                <label htmlFor="stock-qty-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Quantity <span className="text-red-600">*</span>
                </label>
                <input
                  ref={quantityInputRef}
                  id="stock-qty-input"
                  type="number"
                  min={1}
                  step={1}
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    setErrors((prev) => ({ ...prev, quantity: undefined }));
                  }}
                  placeholder="1"
                  className={`w-full h-10 px-3 rounded-lg border text-sm font-mono tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    errors.quantity
                      ? 'border-red-400 focus:border-red-600 focus:ring-red-500/15'
                      : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/15'
                  }`}
                />
                {errors.quantity && (
                  <p className="mt-1 text-xs text-red-600">{errors.quantity}</p>
                )}
              </div>

              {mode === 'add' && (
                <div className="col-span-2">
                  <label htmlFor="stock-cost-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    New cost ({currency})
                  </label>
                  <input
                    id="stock-cost-input"
                    type="number"
                    min={0}
                    step={1}
                    value={costPrice}
                    onChange={(e) => {
                      setCostPrice(e.target.value);
                      setErrors((prev) => ({ ...prev, costPrice: undefined }));
                    }}
                    placeholder="Optional"
                    className={`w-full h-10 px-3 rounded-lg border text-sm font-mono tabular-nums text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                      errors.costPrice
                        ? 'border-red-400 focus:border-red-600 focus:ring-red-500/15'
                        : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/15'
                    }`}
                  />
                  {errors.costPrice && (
                    <p className="mt-1 text-xs text-red-600">{errors.costPrice}</p>
                  )}
                </div>
              )}

              <div className={mode === 'add' ? 'col-span-3' : 'col-span-4'}>
                <label htmlFor="stock-reason-select" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Reason <span className="text-red-600">*</span>
                </label>
                <select
                  id="stock-reason-select"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setErrors((prev) => ({ ...prev, reason: undefined }));
                  }}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                >
                  {reasonOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {errors.reason && <p className="mt-1 text-xs text-red-600">{errors.reason}</p>}
              </div>
            </div>

            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label htmlFor="stock-note-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Note
                </label>
                <input
                  id="stock-note-input"
                  type="text"
                  value={note}
                  onChange={(e) => {
                    setNote(e.target.value);
                    setErrors((prev) => ({ ...prev, note: undefined }));
                  }}
                  maxLength={500}
                  placeholder={
                    mode === 'add'
                      ? 'Optional supplier invoice or shipment note...'
                      : 'Optional note (e.g. broken wheel on display)...'
                  }
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                />
                {errors.note && <p className="mt-1 text-xs text-red-600">{errors.note}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`h-10 px-5 rounded-lg text-sm font-semibold text-white transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  mode === 'add'
                    ? 'bg-slate-900 hover:bg-slate-800'
                    : 'bg-red-700 hover:bg-red-800'
                }`}
              >
                {mode === 'add' ? (
                  <Plus className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Minus className="w-4 h-4" aria-hidden="true" />
                )}
                <span>
                  {isSubmitting
                    ? 'Saving...'
                    : mode === 'add'
                      ? 'Record stock in'
                      : 'Record stock out'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Stock History Filters */}
      <div className="px-6 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between gap-4 flex-wrap shrink-0">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" aria-hidden="true" />
          <h2 className="text-sm font-bold text-slate-950">Stock History</h2>
          <span className="text-xs text-slate-500 tabular-nums">
            ({formatNumber(filteredMovements.length)})
          </span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            aria-label="Filter history by product"
            value={filterProductId}
            onChange={(e) => setFilterProductId(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:border-blue-600 max-w-[220px]"
          >
            <option value="">All products</option>
            {productFilterOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter history by type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | StockMovementType)}
            className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:border-blue-600"
          >
            <option value="all">All types</option>
            <option value="add">Added (+)</option>
            <option value="remove">Removed (-)</option>
            <option value="sale">Sale (-)</option>
            <option value="void">Sale voided (+)</option>
          </select>

          <div className="flex items-center gap-1.5">
            <label htmlFor="history-date-from" className="text-xs text-slate-500">
              From
            </label>
            <input
              id="history-date-from"
              type="date"
              aria-label="From date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="history-date-to" className="text-xs text-slate-500">
              To
            </label>
            <input
              id="history-date-to"
              type="date"
              aria-label="To date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-600"
            />
          </div>

          {hasHistoryFilters && (
            <button
              type="button"
              onClick={() => {
                setFilterProductId('');
                setFilterType('all');
                setDateFrom('');
                setDateTo('');
              }}
              className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Stock History Table */}
      <div className="flex-1 overflow-auto">
        {loadError && (
          <div className="m-6 p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800">
            Could not load stock movements: {loadError}
          </div>
        )}

        {isLoadingMovements ? (
          <div className="p-6 space-y-3" aria-label="Loading stock history">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                className="h-12 rounded-lg border border-slate-100 bg-slate-50 animate-pulse"
              />
            ))}
          </div>
        ) : filteredMovements.length === 0 ? (
          <div className="py-16 px-6 text-center max-w-md mx-auto">
            <h3 className="text-sm font-semibold text-slate-950">
              {movements.length === 0 ? 'No stock movements yet' : 'No movements match these filters'}
            </h3>
            <p className="mt-1.5 text-xs text-slate-600">
              {movements.length === 0
                ? 'Every stock addition or removal you record above will appear here with date, reason, and quantity.'
                : 'Try adjusting the product, type, or date range filters.'}
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
              <tr>
                <th scope="col" className="py-2.5 pl-6 pr-3 w-44">
                  Date &amp; Time
                </th>
                <th scope="col" className="py-2.5 px-3">
                  Product
                </th>
                <th scope="col" className="py-2.5 px-3 w-28">
                  Type
                </th>
                <th scope="col" className="py-2.5 px-3 w-40">
                  Reason
                </th>
                <th scope="col" className="py-2.5 px-3 text-right w-24">
                  Change
                </th>
                <th scope="col" className="py-2.5 px-3 text-right w-32">
                  Cost Price
                </th>
                <th scope="col" className="py-2.5 pl-3 pr-6">
                  Note
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredMovements.map((movement) => {
                const isPositive = movement.quantityChange > 0;
                const typeLabel =
                  movement.type === 'sale'
                    ? 'Sale'
                    : movement.type === 'void'
                      ? 'Voided sale'
                      : movement.type === 'add'
                        ? 'Added'
                        : 'Removed';
                const toneClass =
                  movement.type === 'void'
                    ? 'text-blue-700'
                    : isPositive
                      ? 'text-emerald-700'
                      : 'text-red-700';

                return (
                  <tr key={movement.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 pl-6 pr-3 align-middle text-xs font-mono text-slate-600 tabular-nums whitespace-nowrap">
                      {formatMovementDateTime(movement.createdAt)}
                    </td>
                    <td className="py-3 px-3 align-middle font-medium text-slate-950">
                      {movement.productName}
                    </td>
                    <td className="py-3 px-3 align-middle whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold ${toneClass}`}
                      >
                        {isPositive ? (
                          <ArrowDownLeft className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>{typeLabel}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 align-middle text-xs text-slate-700 whitespace-nowrap">
                      {movement.reason}
                    </td>
                    <td
                      className={`py-3 px-3 align-middle text-right font-mono font-semibold tabular-nums whitespace-nowrap ${toneClass}`}
                    >
                      {movement.quantityChange > 0
                        ? `+${formatNumber(movement.quantityChange)}`
                        : formatNumber(movement.quantityChange)}
                    </td>
                    <td className="py-3 px-3 align-middle text-right font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {movement.costPrice !== undefined && movement.costPrice !== null ? (
                        formatCurrency(movement.costPrice, currency)
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 pl-3 pr-6 align-middle text-xs text-slate-600 max-w-xs truncate">
                      {movement.note ? movement.note : <span className="text-slate-400">—</span>}
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
