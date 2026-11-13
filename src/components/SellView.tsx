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
import type { CartLineItem, Product, Sale, SaleLineItem } from '../types/inventory';
import {
  findProductByBarcode,
  formatActionError,
  formatCurrency,
  formatNumber,
} from '../utils/formatters';
import {
  addProductToCart,
  buildSaleLineItems,
  computeCartSummary,
  computeDailyReconciliation,
  filterSales,
  formatLocalYmd,
  formatSaleTime,
  isLineBelowCost,
  isLineExceedingStock,
  removeCartItem,
  stepCartItemQuantity,
  updateCartItemQuantity,
  updateCartItemUnitPrice,
} from '../utils/sales';
import { SaleDetailsModal } from './SaleDetailsModal';
import { ReceiptModal } from './ReceiptModal';

interface SellViewProps {
  products: Product[];
  sales: Sale[];
  isLoadingSales: boolean;
  loadError: string | null;
  shopName: string;
  currency: string;
  onCompleteSale: (lineItems: SaleLineItem[], note: string) => Promise<Sale>;
  onVoidSale: (saleId: string) => Promise<void>;
}

interface CartRowProps {
  line: CartLineItem;
  liveProduct?: Product;
  currency: string;
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
  onStepQty,
  onChangeQty,
  onChangeUnitPrice,
  onRemove,
  onFocusScan,
}: CartRowProps) {
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
      const rounded = Math.round(parsed);
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
      <td className="py-3 pl-5 pr-3 align-top">
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
            <p className="text-sm font-semibold text-slate-950 leading-snug">
              {line.productName}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5 flex-wrap text-xs text-slate-500">
              {line.variantLabel ? <span>{line.variantLabel} ·</span> : null}
              <span className="font-mono tabular-nums">
                {formatNumber(effectiveStock)} in stock
              </span>
              {bargained ? (
                <span className="font-mono tabular-nums text-slate-400">
                  · List {formatCurrency(effectiveListPrice, currency)}
                </span>
              ) : null}
            </div>
            {(belowCost || exceedsStock) && (
              <div className="mt-1.5 flex flex-col gap-0.5">
                {belowCost && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Below cost ({formatCurrency(effectiveCost, currency)})</span>
                  </span>
                )}
                {exceedsStock && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Exceeds stock (goes to {formatNumber(projectedStock)})</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Quantity */}
      <td className="py-3 px-2 align-top w-28">
        <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => {
              onStepQty(line.productId, -1);
              onFocusScan();
            }}
            aria-label={`Decrease quantity of ${line.productName}`}
            className="w-7 h-9 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-950 transition-colors"
          >
            <Minus className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <input
            type="number"
            min={1}
            step={1}
            aria-label={`Quantity for ${line.productName}`}
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
            aria-label={`Increase quantity of ${line.productName}`}
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
            min={0}
            step={1}
            aria-label={`Unit price for ${line.productName}`}
            value={priceDraft}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              const next = e.target.value;
              setPriceDraft(next);
              const parsed = Number(next.trim());
              if (next.trim() !== '' && Number.isFinite(parsed) && parsed >= 0) {
                onChangeUnitPrice(line.productId, Math.round(parsed));
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
            className={`w-full h-9 px-2.5 rounded-lg border text-right text-sm font-mono font-semibold tabular-nums focus:outline-none focus:ring-2 ${
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
      <td className="py-3 px-2 align-top text-right font-mono font-bold text-sm tabular-nums text-slate-950 whitespace-nowrap pt-4 w-28">
        {formatCurrency(lineTotal, currency)}
      </td>

      {/* Remove */}
      <td className="py-3 pl-1 pr-4 align-top w-10 pt-3">
        <button
          type="button"
          onClick={() => {
            onRemove(line.productId);
            onFocusScan();
          }}
          aria-label={`Remove ${line.productName} from sale`}
          className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 flex items-center justify-center transition-colors"
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}

function getDateHeadingLabel(date: Date, todayYmd: string, yesterdayYmd: string): string {
  const ymd = formatLocalYmd(date);
  if (ymd === todayYmd) return 'Today';
  if (ymd === yesterdayYmd) return 'Yesterday';
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
  isLoadingSales,
  loadError,
  shopName,
  currency,
  onCompleteSale,
  onVoidSale,
}: SellViewProps) {
  const scanInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const clearConfirmBtnRef = useRef<HTMLButtonElement>(null);

  const [scanQuery, setScanQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  const [cart, setCart] = useState<CartLineItem[]>([]);
  const [saleNote, setSaleNote] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);

  // History & Modals
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const activeProducts = useMemo(() => products.filter((p) => !p.isArchived), [products]);

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
          label: getDateHeadingLabel(sale.createdAt, todayYmd, yesterdayYmd),
          items: [sale],
        });
      }
    }
    return groups;
  }, [filteredSales]);

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
      const savedSale = await onCompleteSale(lineItems, saleNote);
      setCart([]);
      setSaleNote('');
      setScanQuery('');
      setScanFeedback(null);
      setConfirmClearOpen(false);
      setLastCompletedSale(savedSale);
    } catch (err) {
      setSubmitError(formatActionError(err, 'Failed to complete sale.'));
    } finally {
      setIsCompleting(false);
      focusScanInput();
    }
  }

  function confirmClearSale() {
    setCart([]);
    setSaleNote('');
    setScanQuery('');
    setScanFeedback(null);
    setSubmitError(null);
    setConfirmClearOpen(false);
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
      setScanFeedback(
        `"${archivedMatch.name}" is archived. Unarchive it in Products before selling.`
      );
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

    setScanFeedback(`No active product matched "${raw}".`);
    setScanQuery('');
    setDropdownOpen(false);
  }

  const todayYmd = formatLocalYmd(new Date());

  return (
    <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-white">
      {/* Top Header */}
      <header className="h-16 px-6 border-b border-slate-200 flex items-center justify-between gap-6 shrink-0 bg-white">
        <div className="flex items-baseline gap-4 min-w-0">
          <h1 className="text-lg font-bold text-slate-950 tracking-tight whitespace-nowrap">
            Sell
          </h1>
          <span className="text-xs text-slate-500 whitespace-nowrap">
            Cash counter · Barcode &amp; keyboard ready
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500 whitespace-nowrap">
          <span>
            <kbd className="px-1.5 py-0.5 rounded border border-slate-300 bg-slate-50 font-mono text-[11px] text-slate-700">
              Enter
            </kbd>{' '}
            Confirm edit
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded border border-slate-300 bg-slate-50 font-mono text-[11px] text-slate-700">
              Ctrl+Enter
            </kbd>{' '}
            Complete sale
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded border border-slate-300 bg-slate-50 font-mono text-[11px] text-slate-700">
              Esc
            </kbd>{' '}
            Clear
          </span>
        </div>
      </header>

      {/* Main Split Workspace */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: Active Cash Counter */}
        <section
          aria-label="Current cash sale"
          className="flex-1 flex flex-col min-w-0 min-h-0 bg-white"
        >
          {/* Scan / Search Bar */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/60 shrink-0">
            <div className="relative">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                ref={scanInputRef}
                id="sell-scan-input"
                type="text"
                role="combobox"
                aria-label="Scan barcode or search product to add"
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
                placeholder="Scan barcode or type toy name to add..."
                autoComplete="off"
                className="w-full h-11 pl-10 pr-24 rounded-lg border border-slate-300 bg-white text-sm text-slate-950 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
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
                  aria-label="Clear search text"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 h-7 px-2 rounded text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                >
                  Clear
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
                      No active products match &ldquo;{scanQuery.trim()}&rdquo;.
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
                        className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-4 transition-colors ${
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
                                <span className="font-mono">{product.barcode}</span>
                              ) : (
                                'No barcode'
                              )}
                              {product.variantLabel ? ` · ${product.variantLabel}` : ''}
                              <span className="font-mono tabular-nums">
                                {' '}
                                · {formatNumber(product.quantityInStock)} in stock
                              </span>
                            </p>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-sm tabular-nums text-slate-950 shrink-0">
                          {formatCurrency(product.sellingPrice, currency)}
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
              className="mx-6 mt-4 px-4 py-2.5 rounded-lg border border-emerald-200 bg-emerald-50 flex items-center justify-between gap-4 shrink-0"
            >
              <div className="flex items-center gap-2 text-xs text-emerald-950 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                <span className="font-semibold">
                  Sale completed · {formatCurrency(lastCompletedSale.totalAmount, currency)}
                </span>
                <span className="text-emerald-800 truncate">
                  ({formatNumber(lastCompletedSale.itemCount)} item
                  {lastCompletedSale.itemCount === 1 ? '' : 's'}
                  {lastCompletedSale.note ? ` · ${lastCompletedSale.note}` : ''})
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setReceiptSale(lastCompletedSale)}
                  className="h-7 px-2.5 rounded-md bg-white border border-emerald-300 text-xs font-semibold text-emerald-900 hover:bg-emerald-100/60 inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                  Print receipt
                </button>
                <button
                  type="button"
                  onClick={() => setLastCompletedSale(null)}
                  aria-label="Dismiss completed sale notice"
                  className="w-7 h-7 rounded-md text-emerald-700 hover:bg-emerald-100 flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {submitError && (
            <div
              role="alert"
              className="mx-6 mt-4 px-4 py-2.5 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 shrink-0"
            >
              {submitError}
            </div>
          )}

          {/* Active Cart Line Items */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-10 text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
                  <ShoppingBag className="w-5 h-5" aria-hidden="true" />
                </div>
                <p className="text-sm font-semibold text-slate-900">Ready for next customer</p>
                <p className="mt-1 text-xs text-slate-500 max-w-sm leading-relaxed">
                  Scan a toy&apos;s barcode with the USB scanner or type its name above to start a
                  cash sale. Scan again to add another unit.
                </p>
              </div>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <tr>
                    <th scope="col" className="py-2.5 pl-5 pr-3">
                      Item
                    </th>
                    <th scope="col" className="py-2.5 px-2 w-28">
                      Qty
                    </th>
                    <th scope="col" className="py-2.5 px-2 text-right w-32">
                      Unit Price ({currency})
                    </th>
                    <th scope="col" className="py-2.5 px-2 text-right w-28">
                      Line Total
                    </th>
                    <th scope="col" className="py-2.5 pl-1 pr-4 w-10">
                      <span className="sr-only">Remove</span>
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

          {/* Inline Esc Clear Confirmation */}
          {confirmClearOpen && (
            <div
              role="alertdialog"
              aria-modal="false"
              aria-labelledby="clear-sale-confirm-title"
              className="mx-6 mb-3 px-4 py-3 rounded-lg border border-amber-300 bg-amber-50 flex items-center justify-between gap-4 shrink-0"
            >
              <div>
                <p id="clear-sale-confirm-title" className="text-sm font-semibold text-amber-950">
                  Clear current sale?
                </p>
                <p className="text-xs text-amber-800">
                  This removes all {formatNumber(cartSummary.itemCount)} item(s) and clears the
                  note.
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
                  Keep editing (Esc)
                </button>
                <button
                  ref={clearConfirmBtnRef}
                  type="button"
                  onClick={confirmClearSale}
                  className="h-9 px-4 rounded-lg bg-red-700 text-white text-xs font-semibold hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                >
                  Clear sale
                </button>
              </div>
            </div>
          )}

          {/* Checkout Footer */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 space-y-3.5 shrink-0">
            {(cartSummary.belowCostCount > 0 || cartSummary.exceedingStockCount > 0) && (
              <div className="flex items-center gap-2 text-xs font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
                <span>
                  {[
                    cartSummary.belowCostCount > 0
                      ? `${cartSummary.belowCostCount} item${cartSummary.belowCostCount === 1 ? '' : 's'} priced below cost`
                      : null,
                    cartSummary.exceedingStockCount > 0
                      ? `${cartSummary.exceedingStockCount} item${cartSummary.exceedingStockCount === 1 ? '' : 's'} exceeding stock (stock will go negative)`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  . Sale is still allowed.
                </span>
              </div>
            )}

            <div>
              <label
                htmlFor="sell-note-input"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Sale note (optional)
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
                placeholder="e.g. Paid via FIB, gift wrap..."
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
            </div>

            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500 tabular-nums">
                  Total ({formatNumber(cartSummary.itemCount)} item
                  {cartSummary.itemCount === 1 ? '' : 's'})
                </p>
                <p
                  data-testid="sale-grand-total"
                  className="text-3xl font-bold font-mono tracking-tight tabular-nums text-slate-950 leading-none mt-1 whitespace-nowrap"
                >
                  {formatCurrency(cartSummary.totalAmount, currency)}
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  disabled={cart.length === 0 && saleNote.trim() === ''}
                  onClick={() => setConfirmClearOpen(true)}
                  className="h-11 px-4 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  Clear (Esc)
                </button>
                <button
                  type="button"
                  disabled={cart.length === 0 || isCompleting}
                  onClick={() => void handleCompleteSale()}
                  className="h-11 px-5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  {isCompleting ? 'Saving sale...' : 'Complete sale (Ctrl+Enter)'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Right: Today's Reconciliation & Sales History */}
        <aside
          aria-label="Today's summary and sales history"
          className="w-[370px] xl:w-[440px] shrink-0 border-l border-slate-200 bg-slate-50/60 flex flex-col min-h-0"
        >
          {/* Today's Cash Summary & Noted Sales */}
          <div className="p-5 border-b border-slate-200 bg-white space-y-4 shrink-0">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70">
                <p className="text-xs font-medium text-slate-500">Today&apos;s Total</p>
                <p
                  data-testid="today-reconciliation-total"
                  className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-950"
                >
                  {formatCurrency(dailyRecon.todayTotal, currency)}
                </p>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70">
                <p className="text-xs font-medium text-slate-500">Sales Today</p>
                <p
                  data-testid="today-reconciliation-count"
                  className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-950"
                >
                  {formatNumber(dailyRecon.todaySalesCount)}
                </p>
                {dailyRecon.todayVoidedCount > 0 && (
                  <p className="text-[11px] text-slate-500 tabular-nums">
                    {formatNumber(dailyRecon.todayVoidedCount)} voided excluded
                  </p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />
                  Today&apos;s Sales with Notes ({formatNumber(dailyRecon.notedSalesToday.length)})
                </h2>
              </div>

              {dailyRecon.notedSalesToday.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">
                  No noted sales today. Add a note (e.g. Paid via FIB) during checkout to track it
                  here.
                </p>
              ) : (
                <div className="max-h-32 overflow-y-auto divide-y divide-slate-200 border border-slate-200 rounded-lg bg-amber-50/40">
                  {dailyRecon.notedSalesToday.map((sale) => (
                    <button
                      key={sale.id}
                      type="button"
                      onClick={() => setSelectedSaleId(sale.id)}
                      className="w-full px-3 py-2 text-left hover:bg-amber-50 transition-colors flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">{sale.note}</p>
                        <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                          {formatSaleTime(sale.createdAt)} · {formatNumber(sale.itemCount)} item
                          {sale.itemCount === 1 ? '' : 's'}
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold tabular-nums text-slate-950 shrink-0">
                        {formatCurrency(sale.totalAmount, currency)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sales History Header + Date Filter */}
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
            <h2 className="text-sm font-bold text-slate-950 whitespace-nowrap">
              Sales History{' '}
              <span className="text-xs font-medium text-slate-500 tabular-nums">
                ({formatNumber(filteredSales.length)})
              </span>
            </h2>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setHistoryDateFilter((prev) => (prev === todayYmd ? '' : todayYmd))
                }
                className={`h-8 px-2.5 rounded-md border text-xs font-medium transition-colors whitespace-nowrap ${
                  historyDateFilter === todayYmd
                    ? 'border-blue-600 bg-blue-50 text-blue-800'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                Today
              </button>
              <div className="relative flex items-center">
                <Calendar
                  className="w-3.5 h-3.5 text-slate-400 absolute left-2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="date"
                  aria-label="Filter sales history by date"
                  value={historyDateFilter}
                  onChange={(e) => setHistoryDateFilter(e.target.value)}
                  className="h-8 pl-7 pr-2 rounded-md border border-slate-300 bg-white text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-600"
                />
              </div>
              {historyDateFilter && (
                <button
                  type="button"
                  onClick={() => setHistoryDateFilter('')}
                  aria-label="Show all dates"
                  className="h-8 px-2 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
                >
                  All
                </button>
              )}
            </div>
          </div>

          {/* Sales History List Grouped by Date */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loadError && (
              <div className="m-4 p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800">
                Could not load sales: {loadError}
              </div>
            )}

            {isLoadingSales ? (
              <div className="p-4 space-y-2.5" aria-label="Loading sales history">
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
                  {sales.length === 0 ? 'No sales recorded yet' : 'No sales on this date'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {sales.length === 0
                    ? 'Completed sales will appear here for receipt printing and voiding.'
                    : 'Clear the date filter to view sales from other days.'}
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
                        const firstTitle = sale.items[0]?.productName ?? 'Sale';
                        const extraLines = sale.items.length - 1;
                        return (
                          <button
                            key={sale.id}
                            type="button"
                            onClick={() => setSelectedSaleId(sale.id)}
                            className="w-full px-5 py-3 text-left hover:bg-slate-50 transition-colors flex items-start justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-slate-500 tabular-nums">
                                  {formatSaleTime(sale.createdAt)}
                                </span>
                                <span className="text-xs font-semibold text-slate-950 truncate">
                                  {firstTitle}
                                  {extraLines > 0 ? ` +${extraLines} more` : ''}
                                </span>
                              </div>
                              <div className="mt-0.5 flex items-center gap-2 flex-wrap text-xs text-slate-500">
                                <span className="tabular-nums">
                                  {formatNumber(sale.itemCount)} item
                                  {sale.itemCount === 1 ? '' : 's'}
                                </span>
                                {isVoided && (
                                  <span className="inline-flex items-center gap-1 font-semibold text-red-700">
                                    <Ban className="w-3 h-3" aria-hidden="true" />
                                    Voided
                                  </span>
                                )}
                                {sale.note ? (
                                  <span className="text-amber-800 font-medium truncate max-w-[210px]">
                                    · {sale.note}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <span
                              className={`text-sm font-mono font-bold tabular-nums shrink-0 ${
                                isVoided ? 'line-through text-slate-400' : 'text-slate-950'
                              }`}
                            >
                              {formatCurrency(sale.totalAmount, currency)}
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

      {selectedSale && (
        <SaleDetailsModal
          sale={selectedSale}
          currency={currency}
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
          shopName={shopName}
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
