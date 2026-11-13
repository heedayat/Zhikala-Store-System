import { useMemo, useRef, useState, type FormEvent } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  History,
  Minus,
  Plus,
} from 'lucide-react';
import { useTranslation } from '../contexts/I18nContext';
import {
  ADD_STOCK_REASONS,
  REMOVE_STOCK_REASONS,
  type Product,
  type StockMovement,
  type StockMovementType,
} from '../types/inventory';
import { formatActionError, formatNumber } from '../utils/formatters';
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
  const {
    lang,
    t,
    formatCurrencyLocalized,
    currencyUnit,
    stockReasonLabel,
    movementTypeLabel,
  } = useTranslation();
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

    const validation = validateStockAdjustment(
      {
        type: mode,
        product: selectedProduct,
        quantity,
        costPrice,
        reason,
        note,
      },
      lang
    );

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
      const localizedReason = stockReasonLabel(validation.data.reason);
      setSuccessMessage(
        `${validation.data.productName}: ${sign}${validation.data.quantityChange} (${localizedReason}). ${t.stock.newStockLabel} ${formatNumber(validation.data.nextQuantityInStock)}.`
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
    <div className="flex-1 flex flex-col min-w-0 bg-white text-start">
      {/* Top Header Bar */}
      <header className="min-h-16 px-4 md:px-6 py-3 md:py-0 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-baseline gap-3 md:gap-4 min-w-0 flex-wrap">
          <h1 className="text-lg font-bold text-slate-950 tracking-tight whitespace-nowrap">
            {t.stock.title}
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums whitespace-nowrap">
            <span>
              <span dir="ltr" className="ltr-isolate font-mono">
                {formatNumber(movements.length)}
              </span>{' '}
              {t.stock.movementsLogged}
            </span>
          </div>
        </div>
      </header>

      {/* Add / Remove Stock Adjustment Form */}
      <section aria-label={t.stock.adjustmentAria} className="px-4 md:px-6 py-4 md:py-5 border-b border-slate-200 bg-slate-50/70 shrink-0">
        <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => handleModeSwitch('add')}
                className={`min-h-[34px] px-3.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 transition-all duration-200 ease-out active:scale-[0.98] whitespace-nowrap ${
                  mode === 'add'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                {t.stock.addStock}
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch('remove')}
                className={`min-h-[34px] px-3.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 transition-all duration-200 ease-out active:scale-[0.98] whitespace-nowrap ${
                  mode === 'remove'
                    ? 'bg-white text-red-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                {t.stock.removeStock}
              </button>
            </div>

            {selectedProduct && previewNextStock !== null && (
              <div className="text-xs font-medium tabular-nums">
                <span className="text-slate-500">{t.stock.stockAfterUpdate} </span>
                <span
                  dir="ltr"
                  className={`ltr-isolate font-mono font-bold ${
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
              className="toast-enter mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800"
            >
              {submitError}
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="toast-enter mb-4 p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-xs text-emerald-900 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              <div className={mode === 'add' ? 'md:col-span-5' : 'md:col-span-6'}>
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

              <div className="md:col-span-2">
                <label htmlFor="stock-qty-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t.stock.quantity} <span className="text-red-600">*</span>
                </label>
                <input
                  ref={quantityInputRef}
                  id="stock-qty-input"
                  type="number"
                  dir="ltr"
                  min={1}
                  step={1}
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    setErrors((prev) => ({ ...prev, quantity: undefined }));
                  }}
                  placeholder="1"
                  className={`ltr-isolate w-full min-h-[40px] px-3 rounded-lg border text-sm font-mono tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
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
                <div className="md:col-span-2">
                  <label htmlFor="stock-cost-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t.stock.newCost} (<span dir="ltr" className="ltr-isolate">{currencyUnit(currency)}</span>)
                  </label>
                  <input
                    id="stock-cost-input"
                    type="number"
                    dir="ltr"
                    min={0}
                    step={currency === 'USD' ? '0.01' : '1'}
                    value={costPrice}
                    onChange={(e) => {
                      setCostPrice(e.target.value);
                      setErrors((prev) => ({ ...prev, costPrice: undefined }));
                    }}
                    placeholder={t.common.optional}
                    className={`ltr-isolate w-full min-h-[40px] px-3 rounded-lg border text-sm font-mono tabular-nums text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
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

              <div className={mode === 'add' ? 'md:col-span-3' : 'md:col-span-4'}>
                <label htmlFor="stock-reason-select" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t.stock.reason} <span className="text-red-600">*</span>
                </label>
                <select
                  id="stock-reason-select"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setErrors((prev) => ({ ...prev, reason: undefined }));
                  }}
                  className="w-full min-h-[40px] px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                >
                  {reasonOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {stockReasonLabel(opt)}
                    </option>
                  ))}
                </select>
                {errors.reason && <p className="mt-1 text-xs text-red-600">{errors.reason}</p>}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
              <div className="flex-1">
                <label htmlFor="stock-note-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t.stock.note}
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
                    mode === 'add' ? t.stock.addNotePlaceholder : t.stock.removeNotePlaceholder
                  }
                  className="w-full min-h-[40px] px-3 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                />
                {errors.note && <p className="mt-1 text-xs text-red-600">{errors.note}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`min-h-[40px] px-5 rounded-lg text-sm font-semibold text-white transition-all duration-200 ease-out active:scale-[0.98] inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
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
                    ? t.common.saving
                    : mode === 'add'
                      ? t.stock.recordStockIn
                      : t.stock.recordStockOut}
                </span>
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Stock History Filters */}
      <div className="px-4 md:px-6 py-3.5 border-b border-slate-200 bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" aria-hidden="true" />
          <h2 className="text-sm font-bold text-slate-950">{t.stock.stockHistory}</h2>
          <span dir="ltr" className="ltr-isolate text-xs font-mono text-slate-500 tabular-nums">
            ({formatNumber(filteredMovements.length)})
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            aria-label={t.stock.filterByProductAria}
            value={filterProductId}
            onChange={(e) => setFilterProductId(e.target.value)}
            className="min-h-[40px] px-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:border-blue-600 max-w-full sm:max-w-[220px]"
          >
            <option value="">{t.stock.allProducts}</option>
            {productFilterOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>

          <select
            aria-label={t.stock.filterByTypeAria}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | StockMovementType)}
            className="min-h-[40px] px-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:border-blue-600"
          >
            <option value="all">{t.stock.allTypes}</option>
            <option value="add">{t.stock.typeAddedPlus}</option>
            <option value="remove">{t.stock.typeRemovedMinus}</option>
            <option value="sale">{t.stock.typeSaleMinus}</option>
            <option value="void">{t.stock.typeVoidPlus}</option>
          </select>

          <div className="flex items-center gap-1.5">
            <label htmlFor="history-date-from" className="text-xs text-slate-500">
              {t.stock.from}
            </label>
            <input
              id="history-date-from"
              type="date"
              dir="ltr"
              aria-label={t.stock.fromDateAria}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="ltr-isolate min-h-[40px] px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="history-date-to" className="text-xs text-slate-500">
              {t.stock.to}
            </label>
            <input
              id="history-date-to"
              type="date"
              dir="ltr"
              aria-label={t.stock.toDateAria}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="ltr-isolate min-h-[40px] px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-600"
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
              className="min-h-[40px] px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-all duration-200 ease-out active:scale-[0.98]"
            >
              {t.common.clear}
            </button>
          )}
        </div>
      </div>

      {/* Stock History Table / Mobile Cards */}
      <div className="flex-1 overflow-auto pb-24 md:pb-6">
        {loadError && (
          <div className="m-4 md:m-6 p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800">
            {t.stock.loadError} {loadError}
          </div>
        )}

        {isLoadingMovements ? (
          <div className="p-4 md:p-6 space-y-3" aria-label={t.stock.loadingAria}>
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
              {movements.length === 0 ? t.stock.emptyTitle : t.stock.noFilterMatchesTitle}
            </h3>
            <p className="mt-1.5 text-xs text-slate-600">
              {movements.length === 0 ? t.stock.emptyHint : t.stock.filterHint}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-start">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <tr>
                    <th scope="col" className="py-2.5 ps-6 pe-3 w-44">
                      {t.stock.colDateTime}
                    </th>
                    <th scope="col" className="py-2.5 px-3">
                      {t.stock.colProduct}
                    </th>
                    <th scope="col" className="py-2.5 px-3 w-28">
                      {t.stock.colType}
                    </th>
                    <th scope="col" className="py-2.5 px-3 w-40">
                      {t.stock.colReason}
                    </th>
                    <th scope="col" className="py-2.5 px-3 text-end w-24">
                      {t.stock.colChange}
                    </th>
                    <th scope="col" className="py-2.5 px-3 text-end w-32">
                      {t.stock.colCostPrice}
                    </th>
                    <th scope="col" className="py-2.5 ps-3 pe-6">
                      {t.stock.colNote}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredMovements.map((movement) => {
                    const isPositive = movement.quantityChange > 0;
                    const typeLabel = movementTypeLabel(movement.type);
                    const toneClass =
                      movement.type === 'void'
                        ? 'text-blue-700'
                        : isPositive
                          ? 'text-emerald-700'
                          : 'text-red-700';

                    return (
                      <tr key={movement.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 ps-6 pe-3 align-middle text-xs font-mono text-slate-600 tabular-nums whitespace-nowrap">
                          <span dir="ltr" className="ltr-isolate">
                            {formatMovementDateTime(movement.createdAt, lang)}
                          </span>
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
                          {stockReasonLabel(movement.reason)}
                        </td>
                        <td
                          className={`py-3 px-3 align-middle text-end font-mono font-semibold tabular-nums whitespace-nowrap ${toneClass}`}
                        >
                          <span dir="ltr" className="ltr-isolate">
                            {movement.quantityChange > 0
                              ? `+${formatNumber(movement.quantityChange)}`
                              : formatNumber(movement.quantityChange)}
                          </span>
                        </td>
                        <td className="py-3 px-3 align-middle text-end font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                          {movement.costPrice !== undefined && movement.costPrice !== null ? (
                            <span dir="ltr" className="ltr-isolate">
                              {formatCurrencyLocalized(movement.costPrice, currency)}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 ps-3 pe-6 align-middle text-xs text-slate-600 max-w-xs truncate">
                          {movement.note ? movement.note : <span className="text-slate-400">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredMovements.map((movement) => {
                const isPositive = movement.quantityChange > 0;
                const typeLabel = movementTypeLabel(movement.type);
                const toneClass =
                  movement.type === 'void'
                    ? 'text-blue-700'
                    : isPositive
                      ? 'text-emerald-700'
                      : 'text-red-700';

                return (
                  <div key={`mobile-${movement.id}`} className="p-4 space-y-1.5 bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-950 leading-snug">
                        {movement.productName}
                      </p>
                      <span
                        dir="ltr"
                        className={`ltr-isolate text-sm font-mono font-bold tabular-nums whitespace-nowrap shrink-0 ${toneClass}`}
                      >
                        {movement.quantityChange > 0
                          ? `+${formatNumber(movement.quantityChange)}`
                          : formatNumber(movement.quantityChange)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                      <span className={`inline-flex items-center gap-1 font-semibold ${toneClass}`}>
                        {isPositive ? (
                          <ArrowDownLeft className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>{typeLabel}</span>
                        <span className="text-slate-400 font-normal">·</span>
                        <span className="font-normal text-slate-700">
                          {stockReasonLabel(movement.reason)}
                        </span>
                      </span>
                      <span
                        dir="ltr"
                        className="ltr-isolate font-mono text-[11px] text-slate-500 tabular-nums shrink-0"
                      >
                        {formatMovementDateTime(movement.createdAt, lang)}
                      </span>
                    </div>

                    {(movement.note || (movement.costPrice !== undefined && movement.costPrice !== null)) && (
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500 pt-0.5">
                        <span className="truncate">{movement.note || ''}</span>
                        {movement.costPrice !== undefined && movement.costPrice !== null && (
                          <span className="shrink-0">
                            {t.stock.costPrefix}:{' '}
                            <span dir="ltr" className="ltr-isolate font-mono tabular-nums">
                              {formatCurrencyLocalized(movement.costPrice, currency)}
                            </span>
                          </span>
                        )}
                      </div>
                    )}
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
