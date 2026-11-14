import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Calendar,
  CheckCircle2,
  FileText,
  Minus,
  Package,
  Plus,
  Printer,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import { useTranslation } from '../contexts/I18nContext';
import type {
  AppUser,
  CartLineItem,
  PaymentMethod,
  Product,
  Sale,
  SaleLineItem,
} from '../types/inventory';
import { findProductByBarcode, formatActionError, formatNumber } from '../utils/formatters';
import { interpolate, type AppLanguage, type TranslationDictionary } from '../utils/i18n';
import {
  addProductToCart,
  buildSaleLineItems,
  computeCartSummary,
  computeDailyReconciliation,
  filterSales,
  formatLocalYmd,
  formatSaleTime,
  isDigitalPaymentMethod,
  isLineBelowCost,
  isLineExceedingStock,
  PAYMENT_METHOD_OPTIONS,
  removeCartItem,
  stepCartItemQuantity,
  updateCartItemQuantity,
  updateCartItemUnitPrice,
} from '../utils/sales';
import { resolveRecordedByLabel } from '../utils/users';
import { ReceiptModal } from './ReceiptModal';
import { SaleDetailsModal } from './SaleDetailsModal';

interface SellViewProps {
  products: Product[];
  sales: Sale[];
  users?: AppUser[];
  isLoadingSales: boolean;
  loadError: string | null;
  shopName: string;
  storeSubtitle?: string;
  receiptFooter?: string;
  logoUrl?: string;
  currency: string;
  hideCostDetails?: boolean;
  onCompleteSale: (
    lineItems: SaleLineItem[],
    note: string,
    paymentMethod: PaymentMethod
  ) => Promise<Sale>;
  onVoidSale: (saleId: string) => Promise<void>;
}

interface CartRowProps {
  line: CartLineItem;
  liveProduct?: Product;
  currency: string;
  hideCostDetails?: boolean;
  onStepQty: (productId: string, delta: number) => void;
  onChangeQty: (productId: string, qty: number) => void;
  onChangeUnitPrice: (productId: string, price: number) => void;
  onRemove: (productId: string) => void;
  onFocusScan: () => void;
}

function CartRow({
  line,
  liveProduct,
  currency,
  hideCostDetails = false,
  onStepQty,
  onChangeQty,
  onChangeUnitPrice,
  onRemove,
  onFocusScan,
}: CartRowProps) {
  const { t, formatCurrencyLocalized } = useTranslation();
  const [qtyDraft, setQtyDraft] = useState(String(line.quantity));
  const [priceDraft, setPriceDraft] = useState(String(line.unitPrice));

  useEffect(() => {
    setQtyDraft(String(line.quantity));
  }, [line.quantity]);

  useEffect(() => {
    setPriceDraft(String(line.unitPrice));
  }, [line.unitPrice]);

  const effectiveStock = liveProduct ? liveProduct.quantityInStock : line.availableStock;
  const effectiveCost = liveProduct ? liveProduct.costPrice : line.costPrice;
  const effectiveListPrice = liveProduct ? liveProduct.sellingPrice : line.listPrice;
  const belowCost = isLineBelowCost(line, liveProduct);
  const exceedsStock = isLineExceedingStock(line, liveProduct);
  const bargained = line.unitPrice !== effectiveListPrice;
  const lineTotal = line.quantity * line.unitPrice;
  const projectedStock = effectiveStock - line.quantity;

  function commitQtyDraft() {
    const parsed = Number(qtyDraft.trim());
    if (Number.isInteger(parsed) && parsed >= 1) {
      onChangeQty(line.productId, parsed);
      setQtyDraft(String(parsed));
    } else {
      setQtyDraft(String(line.quantity));
    }
  }

  function commitPriceDraft() {
    const raw = priceDraft.trim();
    const parsed = Number(raw);
    if (raw !== '' && Number.isFinite(parsed) && parsed >= 0) {
      const rounded = Math.round(parsed * 100) / 100;
      onChangeUnitPrice(line.productId, rounded);
      setPriceDraft(String(rounded));
    } else {
      setPriceDraft(String(line.unitPrice));
    }
  }

  return (
    <tr
      data-testid={`cart-row-${line.productId}`}
      className="hover:bg-slate-50/70 transition-colors"
    >
      {/* Product */}
      <td className="py-3 ps-5 pe-3 align-top">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
            {line.photo ? (
              <img
                src={line.photo}
                alt={line.productName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <Package className="w-4 h-4 text-slate-400" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-950 leading-snug">{line.productName}</p>
            <div className="mt-0.5 flex items-center gap-1.5 flex-wrap text-xs text-slate-500">
              {line.variantLabel ? <span>{line.variantLabel} ·</span> : null}
              <span className="tabular-nums">
                <span dir="ltr" className="ltr-isolate font-mono">
                  {formatNumber(effectiveStock)}
                </span>{' '}
                {t.common.inStock}
              </span>
              {bargained ? (
                <span className="tabular-nums text-slate-400">
                  · {t.sell.listPrefix}{' '}
                  <span dir="ltr" className="ltr-isolate font-mono">
                    {formatCurrencyLocalized(effectiveListPrice, currency)}
                  </span>
                </span>
              ) : null}
            </div>
            {(belowCost || exceedsStock) && (
              <div className="mt-1.5 flex flex-col gap-0.5">
                {belowCost && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>
                      {hideCostDetails
                        ? t.sell.belowMinCost
                        : interpolate(t.sell.belowCost, {
                            cost: formatCurrencyLocalized(effectiveCost, currency),
                          })}
                    </span>
                  </span>
                )}
                {exceedsStock && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>
                      {t.sell.exceedsStock} (
                      {interpolate(t.sell.goesToPrefix, { qty: formatNumber(projectedStock) })})
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Quantity */}
      <td className="py-3 px-2 align-top w-28">
        <div
          dir="ltr"
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden"
        >
          <button
            type="button"
            onClick={() => {
              onStepQty(line.productId, -1);
              onFocusScan();
            }}
            aria-label={interpolate(t.sell.decreaseQtyAria, { name: line.productName })}
            className="w-7 h-9 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-950 transition-colors"
          >
            <Minus className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <input
            type="number"
            dir="ltr"
            min={1}
            step={1}
            aria-label={interpolate(t.sell.qtyForAria, { name: line.productName })}
            value={qtyDraft}
            onChange={(e) => {
              const next = e.target.value;
              setQtyDraft(next);
              const parsed = Number(next.trim());
              if (Number.isInteger(parsed) && parsed >= 1) {
                onChangeQty(line.productId, parsed);
              }
            }}
            onBlur={commitQtyDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                commitQtyDraft();
                onFocusScan();
              }
            }}
            className="w-10 h-9 text-center text-sm font-mono font-semibold tabular-nums text-slate-950 border-x border-slate-200 focus:outline-none focus:bg-blue-50/40"
          />
          <button
            type="button"
            onClick={() => {
              onStepQty(line.productId, 1);
              onFocusScan();
            }}
            aria-label={interpolate(t.sell.increaseQtyAria, { name: line.productName })}
            className="w-7 h-9 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-950 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </td>

      {/* Unit Price */}
      <td className="py-3 px-2 align-top w-32">
        <div className="relative">
          <input
            type="number"
            dir="ltr"
            min={0}
            step={currency === 'USD' ? '0.01' : '1'}
            aria-label={interpolate(t.sell.unitPriceForAria, { name: line.productName })}
            value={priceDraft}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              const next = e.target.value;
              setPriceDraft(next);
              const parsed = Number(next.trim());
              if (next.trim() !== '' && Number.isFinite(parsed) && parsed >= 0) {
                onChangeUnitPrice(line.productId, Math.round(parsed * 100) / 100);
              }
            }}
            onBlur={commitPriceDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                commitPriceDraft();
                onFocusScan();
              }
            }}
            className={`ltr-isolate w-full h-9 px-2.5 rounded-lg border text-right text-sm font-mono font-semibold tabular-nums focus:outline-none focus:ring-2 ${
              belowCost
                ? 'border-red-400 bg-red-50/40 text-red-900 focus:border-red-600 focus:ring-red-500/15'
                : bargained
                  ? 'border-blue-400 bg-blue-50/30 text-blue-950 focus:border-blue-600 focus:ring-blue-600/15'
                  : 'border-slate-300 bg-white text-slate-950 focus:border-blue-600 focus:ring-blue-600/15'
            }`}
          />
        </div>
      </td>

      {/* Line Total */}
      <td className="py-3 px-2 align-top text-end font-mono font-bold text-sm tabular-nums text-slate-950 whitespace-nowrap pt-4 w-28">
        <span dir="ltr" className="ltr-isolate">
          {formatCurrencyLocalized(lineTotal, currency)}
        </span>
      </td>

      {/* Remove */}
      <td className="py-3 ps-1 pe-4 align-top w-10 pt-3">
        <button
          type="button"
          onClick={() => {
            onRemove(line.productId);
            onFocusScan();
          }}
          aria-label={interpolate(t.sell.removeFromSaleAria, { name: line.productName })}
          className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 flex items-center justify-center transition-colors"
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}

function getDateHeadingLabel(
  date: Date,
  todayYmd: string,
  yesterdayYmd: string,
  t: TranslationDictionary,
  lang: AppLanguage
): string {
  const ymd = formatLocalYmd(date);
  if (ymd === todayYmd) return t.common.today;
  if (ymd === yesterdayYmd) return t.common.yesterday;
  if (lang === 'ku') {
    const wd = t.weekdaysShort[date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6];
    const mo = t.monthsShort[date.getMonth() as keyof typeof t.monthsShort];
    return `${wd}، ${date.getDate()} ${mo} ${date.getFullYear()}`;
  }
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function SellView({
  products,
  sales,
  users = [],
  isLoadingSales,
  loadError,
  shopName,
  storeSubtitle,
  receiptFooter,
  logoUrl,
  currency,
  hideCostDetails = false,
  onCompleteSale,
  onVoidSale,
}: SellViewProps) {
  const { lang, t, formatCurrencyLocalized, paymentLabel } = useTranslation();
  const scanInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const clearConfirmBtnRef = useRef<HTMLButtonElement>(null);

  const [scanQuery, setScanQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  const [cart, setCart] = useState<CartLineItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [saleNote, setSaleNote] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);
  const [mobileSubTab, setMobileSubTab] = useState<'pos' | 'history'>('pos');
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  // History & Modals
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const activeProducts = useMemo(() => products.filter((p) => !p.isArchived), [products]);
  const cartQtyByProductId = useMemo(
    () => new Map(cart.map((item) => [item.productId, item.quantity])),
    [cart]
  );

  const matchingProducts = useMemo(() => {
    const q = scanQuery.trim().toLowerCase();
    if (!q) return [];
    return activeProducts
      .filter((p) => {
        const haystack = [p.name, p.barcode, p.variantLabel, p.brand, p.category]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 12);
  }, [activeProducts, scanQuery]);

  const cartSummary = useMemo(() => computeCartSummary(cart, products), [cart, products]);
  const dailyRecon = useMemo(() => computeDailyReconciliation(sales), [sales]);

  const filteredSales = useMemo(
    () => filterSales(sales, { dateYmd: historyDateFilter, includeVoided: true }),
    [sales, historyDateFilter]
  );

  const selectedSale = useMemo(
    () => (selectedSaleId ? sales.find((s) => s.id === selectedSaleId) ?? null : null),
    [sales, selectedSaleId]
  );

  const groupedSales = useMemo(() => {
    const now = new Date();
    const todayYmd = formatLocalYmd(now);
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayYmd = formatLocalYmd(yesterday);

    const groups: { ymd: string; label: string; items: Sale[] }[] = [];
    for (const sale of filteredSales) {
      const ymd = formatLocalYmd(sale.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.ymd === ymd) {
        last.items.push(sale);
      } else {
        groups.push({
          ymd,
          label: getDateHeadingLabel(sale.createdAt, todayYmd, yesterdayYmd, t, lang),
          items: [sale],
        });
      }
    }
    return groups;
  }, [filteredSales, lang, t]);

  function focusScanInput() {
    scanInputRef.current?.focus();
  }

  // Always focus scan field when Sell screen opens
  useEffect(() => {
    focusScanInput();
  }, []);

  // Close search dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        scanInputRef.current &&
        !scanInputRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Focus confirm-clear button when Clear Confirmation opens
  useEffect(() => {
    if (confirmClearOpen) {
      setTimeout(() => clearConfirmBtnRef.current?.focus(), 0);
    }
  }, [confirmClearOpen]);

  function handleAddProduct(product: Product) {
    setCart((prev) => addProductToCart(prev, product));
    setScanQuery('');
    setDropdownOpen(false);
    setHighlightedIdx(0);
    setScanFeedback(null);
    setSubmitError(null);
    focusScanInput();
  }

  async function handleCompleteSale() {
    if (cart.length === 0 || isCompleting) return;
    setIsCompleting(true);
    setSubmitError(null);

    try {
      const lineItems = buildSaleLineItems(cart, products);
      const savedSale = await onCompleteSale(lineItems, saleNote, paymentMethod);
      setCart([]);
      setPaymentMethod('cash');
      setSaleNote('');
      setScanQuery('');
      setScanFeedback(null);
      setConfirmClearOpen(false);
      setMobileCartOpen(false);
      setLastCompletedSale(savedSale);
    } catch (err) {
      setSubmitError(formatActionError(err, t.auth.verifyErrorFallback));
    } finally {
      setIsCompleting(false);
      focusScanInput();
    }
  }

  function confirmClearSale() {
    setCart([]);
    setPaymentMethod('cash');
    setSaleNote('');
    setScanQuery('');
    setScanFeedback(null);
    setSubmitError(null);
    setConfirmClearOpen(false);
    setMobileCartOpen(false);
    focusScanInput();
  }

  // Keyboard shortcuts: Ctrl+Enter completes sale, Esc triggers clear confirmation
  useEffect(() => {
    function onWindowKeyDown(e: KeyboardEvent) {
      if (selectedSale || receiptSale) {
        if (e.key === 'Escape') {
          e.preventDefault();
          if (receiptSale) {
            setReceiptSale(null);
          } else if (selectedSale) {
            setSelectedSaleId(null);
          }
          focusScanInput();
        }
        return;
      }

      if (confirmClearOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setConfirmClearOpen(false);
          focusScanInput();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (cart.length > 0 && !isCompleting) {
          e.preventDefault();
          void handleCompleteSale();
        }
        return;
      }

      if (e.key === 'Escape') {
        if (dropdownOpen) {
          setDropdownOpen(false);
          return;
        }
        if (cart.length > 0 || saleNote.trim() !== '') {
          e.preventDefault();
          setConfirmClearOpen(true);
        } else if (scanQuery) {
          e.preventDefault();
          setScanQuery('');
          setScanFeedback(null);
        }
      }
    }

    window.addEventListener('keydown', onWindowKeyDown);
    return () => window.removeEventListener('keydown', onWindowKeyDown);
  });

  function handleScanKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' && dropdownOpen && matchingProducts.length > 0) {
      e.preventDefault();
      setHighlightedIdx((prev) => (prev + 1) % matchingProducts.length);
      return;
    }
    if (e.key === 'ArrowUp' && dropdownOpen && matchingProducts.length > 0) {
      e.preventDefault();
      setHighlightedIdx((prev) => (prev - 1 + matchingProducts.length) % matchingProducts.length);
      return;
    }

    if (e.key !== 'Enter' || e.ctrlKey || e.metaKey) return;

    const raw = scanQuery.trim();
    if (!raw) return;

    e.preventDefault();

    // 1. Exact barcode match against active products
    const activeBarcodeMatch = findProductByBarcode(activeProducts, raw);
    if (activeBarcodeMatch) {
      handleAddProduct(activeBarcodeMatch);
      return;
    }

    // 2. Warn cleanly if scanned barcode belongs to an archived product
    const archivedMatch = findProductByBarcode(products, raw);
    if (archivedMatch && archivedMatch.isArchived) {
      setScanFeedback(interpolate(t.sell.archivedProductWarning, { name: archivedMatch.name }));
      setScanQuery('');
      setDropdownOpen(false);
      return;
    }

    // 3. Pick highlighted search match if dropdown has results
    if (matchingProducts.length > 0) {
      const target = matchingProducts[highlightedIdx] ?? matchingProducts[0];
      handleAddProduct(target);
      return;
    }

    setScanFeedback(interpolate(t.sell.noActiveBarcodeMatch, { query: raw }));
    setScanQuery('');
    setDropdownOpen(false);
  }

  const todayYmd = formatLocalYmd(new Date());

  return (
    <div className="flex-1 flex flex-col min-w-0 md:h-screen md:overflow-hidden bg-white">
      {/* Top Header */}
      <header className="min-h-16 px-4 md:px-6 py-3 md:py-0 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0 bg-white">
        <div className="flex items-baseline gap-3 min-w-0 flex-wrap">
          <h1 className="text-lg font-bold text-slate-950 tracking-tight whitespace-nowrap">
            {t.sell.title}
          </h1>
          <span className="text-xs text-slate-500 whitespace-nowrap">{t.sell.subtitle}</span>
        </div>

        <div className="hidden lg:flex items-center gap-4 text-xs text-slate-500 whitespace-nowrap">
          <span>
            <kbd
              dir="ltr"
              className="ltr-isolate px-1.5 py-0.5 rounded border border-slate-300 bg-slate-50 font-mono text-[11px] text-slate-700"
            >
              Enter
            </kbd>{' '}
            {t.sell.kbdConfirm}
          </span>
          <span>
            <kbd
              dir="ltr"
              className="ltr-isolate px-1.5 py-0.5 rounded border border-slate-300 bg-slate-50 font-mono text-[11px] text-slate-700"
            >
              Ctrl+Enter
            </kbd>{' '}
            {t.sell.kbdComplete}
          </span>
          <span>
            <kbd
              dir="ltr"
              className="ltr-isolate px-1.5 py-0.5 rounded border border-slate-300 bg-slate-50 font-mono text-[11px] text-slate-700"
            >
              Esc
            </kbd>{' '}
            {t.sell.kbdClear}
          </span>
        </div>
      </header>

      {/* Mobile POS / History Sub-navigation */}
      <div className="md:hidden px-4 py-2.5 border-b border-slate-200 bg-slate-50/80 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMobileSubTab('pos')}
          className={`flex-1 min-h-[40px] px-3 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
            mobileSubTab === 'pos'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700'
          }`}
        >
          {t.sell.posTab}
        </button>
        <button
          type="button"
          onClick={() => setMobileSubTab('history')}
          className={`flex-1 min-h-[40px] px-3 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
            mobileSubTab === 'history'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700'
          }`}
        >
          {t.sell.historyTab} (
          <span dir="ltr" className="ltr-isolate font-mono">
            {formatNumber(dailyRecon.todaySalesCount)}
          </span>
          )
        </button>
      </div>

      {/* Main Split Workspace */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 md:overflow-hidden">
        {/* Start Side: Active Cash Counter */}
        <section
          aria-label={t.sell.currentCashSaleAria}
          className={`${
            mobileSubTab === 'pos' ? 'flex' : 'hidden md:flex'
          } flex-1 flex-col min-w-0 min-h-0 bg-white`}
        >
          {/* Scan / Search Bar */}
          <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-200 bg-slate-50/60 shrink-0">
            <div className="relative">
              <Search
                className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                ref={scanInputRef}
                id="sell-scan-input"
                type="text"
                role="combobox"
                aria-label={t.sell.scanAria}
                aria-expanded={dropdownOpen && matchingProducts.length > 0}
                aria-controls="sell-product-suggestions"
                aria-autocomplete="list"
                value={scanQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setScanQuery(val);
                  setScanFeedback(null);
                  setHighlightedIdx(0);
                  setDropdownOpen(val.trim().length > 0);
                }}
                onFocus={() => {
                  if (scanQuery.trim().length > 0) setDropdownOpen(true);
                }}
                onKeyDown={handleScanKeyDown}
                placeholder={t.sell.scanPlaceholder}
                autoComplete="off"
                className="w-full h-11 ps-10 pe-24 rounded-lg border border-slate-300 bg-white text-sm text-slate-950 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
              {scanQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setScanQuery('');
                    setDropdownOpen(false);
                    setScanFeedback(null);
                    focusScanInput();
                  }}
                  aria-label={t.sell.clearSearchTextAria}
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 h-7 px-2 rounded text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                >
                  {t.common.clear}
                </button>
              )}

              {/* Autocomplete Product Suggestions */}
              {dropdownOpen && scanQuery.trim().length > 0 && (
                <div
                  ref={dropdownRef}
                  id="sell-product-suggestions"
                  role="listbox"
                  className="absolute z-30 mt-1.5 w-full max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg py-1"
                >
                  {matchingProducts.length === 0 ? (
                    <div className="px-4 py-4 text-xs text-slate-500 text-center">
                      {interpolate(t.sell.noProductsMatch, { query: scanQuery.trim() })}
                    </div>
                  ) : (
                    matchingProducts.map((product, idx) => (
                      <button
                        key={product.id}
                        type="button"
                        role="option"
                        aria-selected={idx === highlightedIdx}
                        onMouseEnter={() => setHighlightedIdx(idx)}
                        onClick={() => handleAddProduct(product)}
                        className={`w-full px-3.5 py-2.5 text-start flex items-center justify-between gap-4 transition-colors ${
                          idx === highlightedIdx ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-md border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
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
                            <p className="text-sm font-semibold text-slate-950 truncate">
                              {product.name}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {product.barcode ? (
                                <span dir="ltr" className="ltr-isolate font-mono">
                                  {product.barcode}
                                </span>
                              ) : (
                                t.common.noBarcode
                              )}
                              {product.variantLabel ? ` · ${product.variantLabel}` : ''}
                              <span className="tabular-nums">
                                {' '}
                                ·{' '}
                                <span dir="ltr" className="ltr-isolate font-mono">
                                  {formatNumber(product.quantityInStock)}
                                </span>{' '}
                                {t.common.inStock}
                              </span>
                            </p>
                          </div>
                        </div>
                        <span
                          dir="ltr"
                          className="ltr-isolate font-mono font-bold text-sm tabular-nums text-slate-950 shrink-0"
                        >
                          {formatCurrencyLocalized(product.sellingPrice, currency)}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {scanFeedback && (
              <p role="alert" className="mt-2 text-xs font-medium text-red-700">
                {scanFeedback}
              </p>
            )}
          </div>

          {/* Last completed sale quick receipt banner */}
          {lastCompletedSale && (
            <div
              role="status"
              className="mx-4 md:mx-6 mt-3 md:mt-4 px-4 py-2.5 rounded-lg border border-emerald-200 bg-emerald-50 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shrink-0 toast-enter"
            >
              <div className="flex items-center gap-2 text-xs text-emerald-950 min-w-0 flex-wrap">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                <span className="font-semibold">
                  {t.sell.saleCompleted} ·{' '}
                  <span dir="ltr" className="ltr-isolate font-mono">
                    {formatCurrencyLocalized(lastCompletedSale.totalAmount, currency)}
                  </span>
                </span>
                <span className="px-1.5 py-0.5 rounded border border-emerald-300 bg-white text-[11px] font-semibold text-emerald-900 whitespace-nowrap">
                  {paymentLabel(lastCompletedSale.paymentMethod)}
                </span>
                <span className="text-emerald-800 truncate">
                  (
                  <span dir="ltr" className="ltr-isolate font-mono">
                    {formatNumber(lastCompletedSale.itemCount)}
                  </span>{' '}
                  {lastCompletedSale.itemCount === 1 ? t.common.item : t.common.items}
                  {lastCompletedSale.note ? ` · ${lastCompletedSale.note}` : ''})
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setReceiptSale(lastCompletedSale)}
                  className="min-h-[36px] px-2.5 rounded-md bg-white border border-emerald-300 text-xs font-semibold text-emerald-900 hover:bg-emerald-100/60 active:scale-[0.98] transition-all inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                  {t.sell.printReceipt}
                </button>
                <button
                  type="button"
                  onClick={() => setLastCompletedSale(null)}
                  aria-label={t.sell.dismissNoticeAria}
                  className="w-8 h-8 rounded-md text-emerald-700 hover:bg-emerald-100 flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {submitError && (
            <div
              role="alert"
              className="mx-4 md:mx-6 mt-3 md:mt-4 px-4 py-2.5 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 shrink-0"
            >
              {submitError}
            </div>
          )}

          {/* Mobile Quick-Tap Product Grid (< md) */}
          <div className="md:hidden px-4 py-4 space-y-3 pb-40">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                {t.sell.quickTapTitle} (
                <span dir="ltr" className="ltr-isolate font-mono">
                  {formatNumber(activeProducts.length)}
                </span>
                )
              </h2>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMobileCartOpen(true)}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-900"
                >
                  {interpolate(t.sell.viewInCart, {
                    count: formatNumber(cartSummary.itemCount),
                  })}
                </button>
              )}
            </div>

            {activeProducts.length === 0 ? (
              <div className="py-12 px-4 text-center rounded-xl border border-slate-200 bg-slate-50/70">
                <Package className="w-6 h-6 text-slate-400 mx-auto mb-2" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-900">{t.sell.noActiveToys}</p>
                <p className="mt-1 text-xs text-slate-500">{t.sell.addProductsHint}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {activeProducts.map((product) => {
                  const inCartQty = cartQtyByProductId.get(product.id) ?? 0;
                  const lowStock =
                    product.reorderLevel !== null &&
                    product.reorderLevel !== undefined &&
                    product.quantityInStock <= product.reorderLevel;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleAddProduct(product)}
                      className="min-h-[44px] rounded-xl border border-slate-200 bg-white p-2.5 text-start hover:border-slate-300 active:scale-[0.98] transition-all duration-150 flex flex-col gap-2 relative shadow-xs"
                    >
                      <div className="relative w-full h-20 rounded-lg bg-slate-100 border border-slate-200/80 overflow-hidden flex items-center justify-center">
                        {product.photos?.[0] ? (
                          <img
                            src={product.photos[0]}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-slate-400" aria-hidden="true" />
                        )}
                        {inCartQty > 0 && (
                          <span
                            dir="ltr"
                            className="ltr-isolate absolute top-1.5 end-1.5 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[11px] font-mono font-bold tabular-nums shadow-xs"
                          >
                            {inCartQty}×
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 flex flex-col justify-between">
                        <p className="text-xs font-semibold text-slate-950 leading-snug line-clamp-2">
                          {product.name}
                        </p>
                        <div className="mt-1.5 flex items-baseline justify-between gap-1">
                          <span
                            className={`text-[11px] tabular-nums ${
                              lowStock ? 'text-amber-700 font-semibold' : 'text-slate-500'
                            }`}
                          >
                            <span dir="ltr" className="ltr-isolate font-mono">
                              {formatNumber(product.quantityInStock)}
                            </span>{' '}
                            {t.sell.leftSuffix}
                          </span>
                          <span
                            dir="ltr"
                            className="ltr-isolate text-xs font-mono font-bold tabular-nums text-slate-950 whitespace-nowrap"
                          >
                            {formatCurrencyLocalized(product.sellingPrice, currency)}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Cart Line Items (Desktop >= md) */}
          <div className="hidden md:block flex-1 overflow-y-auto min-h-0">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-10 text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
                  <ShoppingBag className="w-5 h-5" aria-hidden="true" />
                </div>
                <p className="text-sm font-semibold text-slate-900">{t.sell.readyTitle}</p>
                <p className="mt-1 text-xs text-slate-500 max-w-sm leading-relaxed">
                  {t.sell.readySubtitle}
                </p>
              </div>
            ) : (
              <table className="w-full border-collapse text-start">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <tr>
                    <th scope="col" className="py-2.5 ps-5 pe-3">
                      {t.sell.colItem}
                    </th>
                    <th scope="col" className="py-2.5 px-2 w-28">
                      {t.sell.colQty}
                    </th>
                    <th scope="col" className="py-2.5 px-2 text-end w-32">
                      {t.sell.colUnitPrice} ({currency})
                    </th>
                    <th scope="col" className="py-2.5 px-2 text-end w-28">
                      {t.sell.colLineTotal}
                    </th>
                    <th scope="col" className="py-2.5 ps-1 pe-4 w-10">
                      <span className="sr-only">{t.sell.colRemove}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {cart.map((line) => (
                    <CartRow
                      key={line.productId}
                      line={line}
                      liveProduct={productMap.get(line.productId)}
                      currency={currency}
                      hideCostDetails={hideCostDetails}
                      onStepQty={(productId, delta) =>
                        setCart((prev) => stepCartItemQuantity(prev, productId, delta))
                      }
                      onChangeQty={(productId, qty) =>
                        setCart((prev) => updateCartItemQuantity(prev, productId, qty))
                      }
                      onChangeUnitPrice={(productId, price) =>
                        setCart((prev) => updateCartItemUnitPrice(prev, productId, price))
                      }
                      onRemove={(productId) =>
                        setCart((prev) => removeCartItem(prev, productId))
                      }
                      onFocusScan={focusScanInput}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Inline Esc Clear Confirmation (Desktop) */}
          {confirmClearOpen && (
            <div
              role="alertdialog"
              aria-modal="false"
              aria-labelledby="clear-sale-confirm-title"
              className="hidden md:flex mx-6 mb-3 px-4 py-3 rounded-lg border border-amber-300 bg-amber-50 items-center justify-between gap-4 shrink-0"
            >
              <div>
                <p id="clear-sale-confirm-title" className="text-sm font-semibold text-amber-950">
                  {t.sell.clearConfirmTitle}
                </p>
                <p className="text-xs text-amber-800">
                  {interpolate(t.sell.clearConfirmDesc, {
                    count: formatNumber(cartSummary.itemCount),
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmClearOpen(false);
                    focusScanInput();
                  }}
                  className="h-9 px-3.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {t.sell.keepEditingEsc}
                </button>
                <button
                  ref={clearConfirmBtnRef}
                  type="button"
                  onClick={confirmClearSale}
                  className="h-9 px-4 rounded-lg bg-red-700 text-white text-xs font-semibold hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                >
                  {t.sell.clearSaleBtn}
                </button>
              </div>
            </div>
          )}

          {/* Checkout Footer (Desktop >= md) */}
          <div className="hidden md:block px-6 py-4 border-t border-slate-200 bg-slate-50 space-y-3.5 shrink-0">
            {(cartSummary.belowCostCount > 0 || cartSummary.exceedingStockCount > 0) && (
              <div className="flex items-center gap-2 text-xs font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
                <span>
                  {[
                    cartSummary.belowCostCount > 0
                      ? interpolate(t.sell.belowCostCountLabel, {
                          count: formatNumber(cartSummary.belowCostCount),
                        })
                      : null,
                    cartSummary.exceedingStockCount > 0
                      ? interpolate(t.sell.exceedsStockCountLabel, {
                          count: formatNumber(cartSummary.exceedingStockCount),
                        })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  {t.sell.saleAllowedSuffix}
                </span>
              </div>
            )}

            <div className="flex items-end gap-3">
              <div className="shrink-0">
                <span className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.sell.paymentMethod}
                </span>
                <div
                  role="radiogroup"
                  aria-label={t.sell.paymentMethod}
                  className="inline-flex items-center gap-1.5"
                >
                  {PAYMENT_METHOD_OPTIONS.map((option) => {
                    const selected = paymentMethod === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => {
                          setPaymentMethod(option.value);
                          focusScanInput();
                        }}
                        className={`h-10 px-3.5 rounded-lg border text-xs font-semibold transition-all duration-150 active:scale-[0.98] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                          selected
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {paymentLabel(option.value)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label
                  htmlFor="sell-note-input"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  {t.sell.saleNote}
                </label>
                <input
                  id="sell-note-input"
                  type="text"
                  value={saleNote}
                  onChange={(e) => setSaleNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                      e.preventDefault();
                      focusScanInput();
                    }
                  }}
                  maxLength={500}
                  placeholder={t.sell.saleNotePlaceholder}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                />
              </div>
            </div>

            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500 tabular-nums">
                  {t.sell.totalLabel} (
                  <span dir="ltr" className="ltr-isolate font-mono">
                    {formatNumber(cartSummary.itemCount)}
                  </span>{' '}
                  {cartSummary.itemCount === 1 ? t.common.item : t.common.items})
                </p>
                <p
                  data-testid="sale-grand-total"
                  className="text-3xl font-bold font-mono tracking-tight tabular-nums text-slate-950 leading-none mt-1 whitespace-nowrap"
                >
                  <span dir="ltr" className="ltr-isolate">
                    {formatCurrencyLocalized(cartSummary.totalAmount, currency)}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  disabled={cart.length === 0 && saleNote.trim() === ''}
                  onClick={() => setConfirmClearOpen(true)}
                  className="h-11 px-4 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-45 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.98] whitespace-nowrap"
                >
                  {t.sell.clearEsc}
                </button>
                <button
                  type="button"
                  disabled={cart.length === 0 || isCompleting}
                  onClick={() => void handleCompleteSale()}
                  className="h-11 px-5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-45 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.98] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  {isCompleting ? t.sell.savingSale : t.sell.completeSaleShortcut}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Sticky Bottom Checkout Bar (< md) */}
          <div className="md:hidden fixed bottom-16 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2.5 flex items-center justify-between gap-3 shadow-sm">
            <button
              type="button"
              onClick={() => {
                if (cart.length > 0) setMobileCartOpen(true);
              }}
              className="text-start min-w-0 flex-1"
            >
              <p className="text-[11px] font-medium text-slate-500 tabular-nums">
                <span dir="ltr" className="ltr-isolate font-mono">
                  {formatNumber(cartSummary.itemCount)}
                </span>{' '}
                {cartSummary.itemCount === 1 ? t.common.item : t.common.items} {t.sell.inCartSuffix}
              </p>
              <p className="text-lg font-bold font-mono tabular-nums text-slate-950 truncate">
                <span dir="ltr" className="ltr-isolate">
                  {formatCurrencyLocalized(cartSummary.totalAmount, currency)}
                </span>
              </p>
            </button>
            <button
              type="button"
              data-testid="mobile-open-cart-btn"
              disabled={cart.length === 0}
              onClick={() => setMobileCartOpen(true)}
              className="min-h-[44px] px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-45 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-150 inline-flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <ShoppingBag className="w-4 h-4" aria-hidden="true" />
              <span>
                {t.sell.checkout} (
                <span dir="ltr" className="ltr-isolate font-mono">
                  {formatNumber(cartSummary.itemCount)}
                </span>
                )
              </span>
            </button>
          </div>
        </section>

        {/* End Side: Today's Reconciliation & Sales History */}
        <aside
          aria-label={t.sell.todaySummaryAria}
          className={`${
            mobileSubTab === 'history' ? 'flex' : 'hidden md:flex'
          } w-full md:w-[370px] xl:w-[440px] shrink-0 md:border-s border-slate-200 bg-slate-50/60 flex-col min-h-0 pb-24 md:pb-0`}
        >
          {/* Today's Cash Summary & Noted Sales */}
          <div className="p-5 border-b border-slate-200 bg-white space-y-4 shrink-0">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70">
                <p className="text-xs font-medium text-slate-500">{t.sell.todayTotal}</p>
                <p
                  data-testid="today-reconciliation-total"
                  className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-950"
                >
                  <span dir="ltr" className="ltr-isolate">
                    {formatCurrencyLocalized(dailyRecon.todayTotal, currency)}
                  </span>
                </p>
                <div className="mt-2 pt-1.5 border-t border-slate-200/80 space-y-0.5 text-[11px] tabular-nums">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">{t.sell.cash}</span>
                    <span
                      dir="ltr"
                      className="ltr-isolate font-mono font-semibold text-slate-800"
                    >
                      {formatCurrencyLocalized(dailyRecon.todayCashTotal, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">{t.sell.digital}</span>
                    <span
                      dir="ltr"
                      className="ltr-isolate font-mono font-semibold text-blue-700"
                    >
                      {formatCurrencyLocalized(dailyRecon.todayDigitalTotal, currency)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70">
                <p className="text-xs font-medium text-slate-500">{t.sell.salesToday}</p>
                <p
                  data-testid="today-reconciliation-count"
                  className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-950"
                >
                  <span dir="ltr" className="ltr-isolate">
                    {formatNumber(dailyRecon.todaySalesCount)}
                  </span>
                </p>
                {dailyRecon.todayVoidedCount > 0 && (
                  <p className="text-[11px] text-slate-500 tabular-nums">
                    <span dir="ltr" className="ltr-isolate font-mono">
                      {formatNumber(dailyRecon.todayVoidedCount)}
                    </span>{' '}
                    {t.sell.voidedExcluded}
                  </p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />
                  {t.sell.todayNotedSales} (
                  <span dir="ltr" className="ltr-isolate font-mono">
                    {formatNumber(dailyRecon.notedSalesToday.length)}
                  </span>
                  )
                </h2>
              </div>

              {dailyRecon.notedSalesToday.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">{t.sell.noNotedSalesToday}</p>
              ) : (
                <div className="max-h-32 overflow-y-auto divide-y divide-slate-200 border border-slate-200 rounded-lg bg-amber-50/40">
                  {dailyRecon.notedSalesToday.map((sale) => {
                    const recordedBy = resolveRecordedByLabel(sale, users);
                    return (
                      <button
                        key={sale.id}
                        type="button"
                        onClick={() => setSelectedSaleId(sale.id)}
                        className="w-full px-3 py-2 text-start hover:bg-amber-50 transition-colors flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">{sale.note}</p>
                          <p className="text-[11px] text-slate-500 tabular-nums truncate">
                            <span dir="ltr" className="ltr-isolate font-mono">
                              {formatSaleTime(sale.createdAt, lang)}
                            </span>{' '}
                            ·{' '}
                            <span dir="ltr" className="ltr-isolate font-mono">
                              {formatNumber(sale.itemCount)}
                            </span>{' '}
                            {sale.itemCount === 1 ? t.common.item : t.common.items}
                            {recordedBy ? ` · ${recordedBy}` : ''}
                          </p>
                        </div>
                        <span
                          dir="ltr"
                          className="ltr-isolate text-xs font-mono font-bold tabular-nums text-slate-950 shrink-0"
                        >
                          {formatCurrencyLocalized(sale.totalAmount, currency)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sales History Header + Date Filter */}
          <div className="px-4 md:px-5 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <h2 className="text-sm font-bold text-slate-950 whitespace-nowrap">
              {t.sell.salesHistory}{' '}
              <span className="text-xs font-medium text-slate-500 tabular-nums">
                (
                <span dir="ltr" className="ltr-isolate font-mono">
                  {formatNumber(filteredSales.length)}
                </span>
                )
              </span>
            </h2>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() =>
                  setHistoryDateFilter((prev) => (prev === todayYmd ? '' : todayYmd))
                }
                className={`min-h-[36px] px-2.5 rounded-md border text-xs font-medium transition-colors whitespace-nowrap ${
                  historyDateFilter === todayYmd
                    ? 'border-blue-600 bg-blue-50 text-blue-800'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {t.common.today}
              </button>
              <div dir="ltr" className="relative flex items-center">
                <Calendar
                  className="w-3.5 h-3.5 text-slate-400 absolute left-2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="date"
                  dir="ltr"
                  aria-label={t.sell.filterDateAria}
                  value={historyDateFilter}
                  onChange={(e) => setHistoryDateFilter(e.target.value)}
                  className="ltr-isolate min-h-[36px] pl-7 pr-2 rounded-md border border-slate-300 bg-white text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-600"
                />
              </div>
              {historyDateFilter && (
                <button
                  type="button"
                  onClick={() => setHistoryDateFilter('')}
                  aria-label={t.sell.showAllDatesAria}
                  className="min-h-[36px] px-2 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
                >
                  {t.common.all}
                </button>
              )}
            </div>
          </div>

          {/* Sales History List Grouped by Date */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loadError && (
              <div className="m-4 p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800">
                {t.sell.loadSalesError} {loadError}
              </div>
            )}

            {isLoadingSales ? (
              <div className="p-4 space-y-2.5" aria-label={t.sell.loadingSalesAria}>
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-14 rounded-lg border border-slate-200 bg-white animate-pulse"
                  />
                ))}
              </div>
            ) : groupedSales.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <p className="text-sm font-semibold text-slate-900">
                  {sales.length === 0 ? t.sell.noSalesTitle : t.sell.noSalesOnDateTitle}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {sales.length === 0 ? t.sell.noSalesEmptyHint : t.sell.noSalesDateHint}
                </p>
              </div>
            ) : (
              <div>
                {groupedSales.map((group) => (
                  <div key={group.ymd}>
                    <div className="sticky top-0 z-10 px-5 py-1.5 bg-slate-100/95 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      {group.label}
                    </div>
                    <div className="divide-y divide-slate-200 bg-white">
                      {group.items.map((sale) => {
                        const isVoided = sale.status === 'voided';
                        const firstTitle = sale.items[0]?.productName ?? t.sell.saleFallbackTitle;
                        const extraLines = sale.items.length - 1;
                        const methodLabel = paymentLabel(sale.paymentMethod);
                        const isDigital = isDigitalPaymentMethod(sale.paymentMethod);
                        const recordedBy = resolveRecordedByLabel(sale, users);
                        return (
                          <button
                            key={sale.id}
                            type="button"
                            onClick={() => setSelectedSaleId(sale.id)}
                            className="w-full px-5 py-3 text-start hover:bg-slate-50 transition-colors flex items-start justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  dir="ltr"
                                  className="ltr-isolate text-xs font-mono text-slate-500 tabular-nums"
                                >
                                  {formatSaleTime(sale.createdAt, lang)}
                                </span>
                                <span className="text-xs font-semibold text-slate-950 truncate">
                                  {firstTitle}
                                  {extraLines > 0
                                    ? ` ${interpolate(t.sell.moreSuffix, { count: extraLines })}`
                                    : ''}
                                </span>
                              </div>
                              <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-slate-500">
                                <span
                                  data-testid={`sale-payment-badge-${sale.id}`}
                                  className={`px-1.5 py-0.5 rounded border text-[11px] font-semibold leading-none whitespace-nowrap ${
                                    isDigital
                                      ? 'border-blue-200 bg-blue-50 text-blue-800'
                                      : 'border-slate-200 bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {methodLabel}
                                </span>
                                <span className="tabular-nums">
                                  <span dir="ltr" className="ltr-isolate font-mono">
                                    {formatNumber(sale.itemCount)}
                                  </span>{' '}
                                  {sale.itemCount === 1 ? t.common.item : t.common.items}
                                </span>
                                {recordedBy && (
                                  <span dir="auto" className="text-[11px] text-slate-500 truncate max-w-[140px]">
                                    · {recordedBy}
                                  </span>
                                )}
                                {isVoided && (
                                  <span className="inline-flex items-center gap-1 font-semibold text-red-700">
                                    <Ban className="w-3 h-3" aria-hidden="true" />
                                    {t.sell.voidedBadge}
                                  </span>
                                )}
                                {sale.note ? (
                                  <span className="text-amber-800 font-medium truncate max-w-[180px]">
                                    · {sale.note}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <span
                              dir="ltr"
                              className={`ltr-isolate text-sm font-mono font-bold tabular-nums shrink-0 ${
                                isVoided ? 'line-through text-slate-400' : 'text-slate-950'
                              }`}
                            >
                              {formatCurrencyLocalized(sale.totalAmount, currency)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile Expandable Cart Drawer (< md) */}
      {mobileCartOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.sell.mobileCartAria}
          className="md:hidden fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-xs modal-backdrop-enter flex flex-col justify-end"
        >
          <div className="bg-white rounded-t-2xl border-t border-slate-200 shadow-2xl max-h-[88vh] flex flex-col overflow-hidden drawer-up-enter">
            <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  {t.sell.mobileCartTitle} (
                  <span dir="ltr" className="ltr-isolate font-mono">
                    {formatNumber(cartSummary.itemCount)}
                  </span>{' '}
                  {cartSummary.itemCount === 1 ? t.common.item : t.common.items})
                </h2>
                <p className="text-xs text-slate-500">{t.sell.mobileCartSubtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileCartOpen(false)}
                aria-label={t.sell.closeCartAria}
                className="w-10 h-10 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-200 px-4">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  {t.sell.emptyCartText}
                </div>
              ) : (
                cart.map((line) => {
                  const liveProduct = productMap.get(line.productId);
                  const effectiveStock = liveProduct ? liveProduct.quantityInStock : line.availableStock;
                  const effectiveCost = liveProduct ? liveProduct.costPrice : line.costPrice;
                  const belowCost = isLineBelowCost(line, liveProduct);
                  const exceedsStock = isLineExceedingStock(line, liveProduct);
                  return (
                    <div key={line.productId} className="py-3.5 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                            {line.photo ? (
                              <img
                                src={line.photo}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-4 h-4 text-slate-400" aria-hidden="true" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-950 leading-snug">
                              {line.productName}
                            </p>
                            <p className="text-xs text-slate-500 tabular-nums">
                              <span dir="ltr" className="ltr-isolate font-mono">
                                {formatNumber(effectiveStock)}
                              </span>{' '}
                              {t.common.inStock}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCart((prev) => removeCartItem(prev, line.productId))}
                          aria-label={interpolate(t.sell.removeFromSaleAria, {
                            name: line.productName,
                          })}
                          className="w-9 h-9 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 flex items-center justify-center shrink-0"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>

                      {(belowCost || exceedsStock) && (
                        <div className="space-y-0.5 text-xs font-semibold">
                          {belowCost && (
                            <p className="text-red-700 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              {hideCostDetails
                                ? t.sell.belowMinCost
                                : interpolate(t.sell.belowCost, {
                                    cost: formatCurrencyLocalized(effectiveCost, currency),
                                  })}
                            </p>
                          )}
                          {exceedsStock && (
                            <p className="text-amber-700 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              {t.sell.exceedsStock} (
                              <span dir="ltr" className="ltr-isolate font-mono">
                                {formatNumber(effectiveStock - line.quantity)}
                              </span>
                              )
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-3">
                        <div
                          dir="ltr"
                          className="inline-flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setCart((prev) => stepCartItemQuantity(prev, line.productId, -1))
                            }
                            aria-label={interpolate(t.sell.decreaseQtyAria, {
                              name: line.productName,
                            })}
                            className="w-10 h-10 flex items-center justify-center text-slate-700 hover:bg-slate-100"
                          >
                            <Minus className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <span className="w-10 text-center text-sm font-mono font-semibold tabular-nums text-slate-950">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setCart((prev) => stepCartItemQuantity(prev, line.productId, 1))
                            }
                            aria-label={interpolate(t.sell.increaseQtyAria, {
                              name: line.productName,
                            })}
                            className="w-10 h-10 flex items-center justify-center text-slate-700 hover:bg-slate-100"
                          >
                            <Plus className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 min-w-0">
                          <label className="sr-only" htmlFor={`mobile-price-${line.productId}`}>
                            {interpolate(t.sell.unitPriceForAria, { name: line.productName })}
                          </label>
                          <input
                            id={`mobile-price-${line.productId}`}
                            type="number"
                            dir="ltr"
                            min={0}
                            step={currency === 'USD' ? '0.01' : '1'}
                            value={line.unitPrice}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              if (e.target.value !== '' && Number.isFinite(val) && val >= 0) {
                                setCart((prev) =>
                                  updateCartItemUnitPrice(
                                    prev,
                                    line.productId,
                                    Math.round(val * 100) / 100
                                  )
                                );
                              }
                            }}
                            className="ltr-isolate w-28 min-h-[40px] px-2.5 rounded-lg border border-slate-300 text-right text-sm font-mono font-semibold tabular-nums text-slate-950"
                          />
                          <span
                            dir="ltr"
                            className="ltr-isolate text-sm font-mono font-bold tabular-nums text-slate-950 whitespace-nowrap"
                          >
                            {formatCurrencyLocalized(line.quantity * line.unitPrice, currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-4 py-4 border-t border-slate-200 bg-slate-50 space-y-3 shrink-0">
              {confirmClearOpen && (
                <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-amber-950">
                    {t.sell.clearThisSale}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmClearOpen(false)}
                      className="min-h-[36px] px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700"
                    >
                      {t.sell.keepShort}
                    </button>
                    <button
                      type="button"
                      onClick={confirmClearSale}
                      className="min-h-[36px] px-3 rounded-lg bg-red-700 text-white text-xs font-semibold"
                    >
                      {t.sell.clearShort}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t.sell.paymentMethod}
                </span>
                <div
                  role="radiogroup"
                  aria-label={t.sell.mobilePaymentMethodAria}
                  className="grid grid-cols-3 gap-1.5"
                >
                  {PAYMENT_METHOD_OPTIONS.map((option) => {
                    const selected = paymentMethod === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setPaymentMethod(option.value)}
                        className={`min-h-[40px] px-2 rounded-lg border text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
                          selected
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-white border-slate-300 text-slate-700'
                        }`}
                      >
                        {paymentLabel(option.value)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <input
                type="text"
                aria-label={t.sell.saleNote}
                value={saleNote}
                onChange={(e) => setSaleNote(e.target.value)}
                maxLength={500}
                placeholder={t.sell.saleNotePlaceholder}
                className="w-full min-h-[40px] px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400"
              />

              <div className="flex items-center justify-between gap-3 pt-1">
                <div>
                  <p className="text-[11px] font-medium text-slate-500">{t.sell.grandTotal}</p>
                  <p
                    data-testid="mobile-sale-grand-total"
                    className="text-xl font-bold font-mono tabular-nums text-slate-950"
                  >
                    <span dir="ltr" className="ltr-isolate">
                      {formatCurrencyLocalized(cartSummary.totalAmount, currency)}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={cart.length === 0 && saleNote.trim() === ''}
                    onClick={() => setConfirmClearOpen(true)}
                    className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-700 disabled:opacity-45"
                  >
                    {t.sell.clearShort}
                  </button>
                  <button
                    type="button"
                    disabled={cart.length === 0 || isCompleting}
                    onClick={() => void handleCompleteSale()}
                    className="min-h-[44px] px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-45 active:scale-[0.98] transition-all duration-150 whitespace-nowrap"
                  >
                    {isCompleting ? t.sell.savingShort : t.sell.completeSale}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedSale && (
        <SaleDetailsModal
          sale={selectedSale}
          users={users}
          currency={currency}
          hideCostDetails={hideCostDetails}
          onPrintReceipt={(sale) => {
            setReceiptSale(sale);
          }}
          onVoidSale={onVoidSale}
          onClose={() => {
            setSelectedSaleId(null);
            focusScanInput();
          }}
        />
      )}

      {receiptSale && (
        <ReceiptModal
          sale={receiptSale}
          users={users}
          shopName={shopName}
          storeSubtitle={storeSubtitle}
          receiptFooter={receiptFooter}
          logoUrl={logoUrl}
          currency={currency}
          onClose={() => {
            setReceiptSale(null);
            focusScanInput();
          }}
        />
      )}
    </div>
  );
}
