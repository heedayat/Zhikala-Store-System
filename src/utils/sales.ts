import type {
  CartLineItem,
  PaymentMethod,
  Product,
  Sale,
  SaleLineItem,
} from '../types/inventory';

export const PAYMENT_METHOD_OPTIONS: {
  value: PaymentMethod;
  label: string;
  isDigital: boolean;
}[] = [
  { value: 'cash', label: 'Cash', isDigital: false },
  { value: 'fib', label: 'FIB', isDigital: true },
  { value: 'card', label: 'FastPay / Card', isDigital: true },
];

export function normalizePaymentMethod(raw: unknown): PaymentMethod {
  if (raw === 'fib') return 'fib';
  if (raw === 'card') return 'card';
  return 'cash';
}

export function getPaymentMethodLabel(method: PaymentMethod | string | undefined | null): string {
  const normalized = normalizePaymentMethod(method);
  if (normalized === 'fib') return 'FIB';
  if (normalized === 'card') return 'FastPay / Card';
  return 'Cash';
}

export function isDigitalPaymentMethod(method: PaymentMethod | string | undefined | null): boolean {
  const normalized = normalizePaymentMethod(method);
  return normalized === 'fib' || normalized === 'card';
}

export function addProductToCart(
  cart: CartLineItem[],
  product: Product
): CartLineItem[] {
  const existingIndex = cart.findIndex((item) => item.productId === product.id);
  if (existingIndex >= 0) {
    return cart.map((item, idx) =>
      idx === existingIndex
        ? {
            ...item,
            productName: product.name,
            barcode: product.barcode,
            variantLabel: product.variantLabel ?? '',
            photo: product.photos?.[0] ?? '',
            availableStock: product.quantityInStock,
            quantity: item.quantity + 1,
          }
        : item
    );
  }

  return [
    ...cart,
    {
      productId: product.id,
      productName: product.name,
      barcode: product.barcode,
      variantLabel: product.variantLabel ?? '',
      photo: product.photos?.[0] ?? '',
      quantity: 1,
      listPrice: product.sellingPrice,
      unitPrice: product.sellingPrice,
      costPrice: product.costPrice,
      availableStock: product.quantityInStock,
    },
  ];
}

export function stepCartItemQuantity(
  cart: CartLineItem[],
  productId: string,
  delta: number
): CartLineItem[] {
  return cart.flatMap((item) => {
    if (item.productId !== productId) return [item];
    const nextQty = item.quantity + delta;
    if (nextQty <= 0) return [];
    return [{ ...item, quantity: nextQty }];
  });
}

export function updateCartItemQuantity(
  cart: CartLineItem[],
  productId: string,
  nextQuantity: number
): CartLineItem[] {
  if (!Number.isFinite(nextQuantity) || !Number.isInteger(nextQuantity) || nextQuantity < 1) {
    return cart;
  }
  return cart.map((item) =>
    item.productId === productId ? { ...item, quantity: nextQuantity } : item
  );
}

export function updateCartItemUnitPrice(
  cart: CartLineItem[],
  productId: string,
  nextUnitPrice: number
): CartLineItem[] {
  if (!Number.isFinite(nextUnitPrice) || nextUnitPrice < 0) {
    return cart;
  }
  const cleanPrice = Math.round(nextUnitPrice * 100) / 100;
  return cart.map((item) =>
    item.productId === productId ? { ...item, unitPrice: cleanPrice } : item
  );
}

export function removeCartItem(cart: CartLineItem[], productId: string): CartLineItem[] {
  return cart.filter((item) => item.productId !== productId);
}

export function isLineBelowCost(
  line: Pick<CartLineItem, 'unitPrice' | 'costPrice'>,
  liveProduct?: Pick<Product, 'costPrice'>
): boolean {
  const cost = liveProduct ? liveProduct.costPrice : line.costPrice;
  return line.unitPrice < cost;
}

export function isLineExceedingStock(
  line: Pick<CartLineItem, 'quantity' | 'availableStock'>,
  liveProduct?: Pick<Product, 'quantityInStock'>
): boolean {
  const stock = liveProduct ? liveProduct.quantityInStock : line.availableStock;
  return line.quantity > stock;
}

export interface CartSummary {
  totalAmount: number;
  totalCost: number;
  itemCount: number;
  belowCostCount: number;
  exceedingStockCount: number;
}

export function computeCartSummary(
  cart: CartLineItem[],
  products?: Product[]
): CartSummary {
  const productMap = products ? new Map(products.map((p) => [p.id, p])) : null;
  let totalAmount = 0;
  let totalCost = 0;
  let itemCount = 0;
  let belowCostCount = 0;
  let exceedingStockCount = 0;

  for (const line of cart) {
    const live = productMap?.get(line.productId);
    const effectiveCost = live ? live.costPrice : line.costPrice;
    totalAmount += line.quantity * line.unitPrice;
    totalCost += line.quantity * effectiveCost;
    itemCount += line.quantity;

    if (isLineBelowCost(line, live)) {
      belowCostCount += 1;
    }
    if (isLineExceedingStock(line, live)) {
      exceedingStockCount += 1;
    }
  }

  return {
    totalAmount: Math.round(totalAmount * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    itemCount,
    belowCostCount,
    exceedingStockCount,
  };
}

export function buildSaleLineItems(
  cart: CartLineItem[],
  products: Product[]
): SaleLineItem[] {
  const productMap = new Map(products.map((p) => [p.id, p]));
  return cart.map((line) => {
    const live = productMap.get(line.productId);
    const listPrice = live ? live.sellingPrice : line.listPrice;
    const costPrice = live ? live.costPrice : line.costPrice;
    const unitPrice = Math.max(0, Math.round(line.unitPrice * 100) / 100);
    return {
      productId: line.productId,
      productName: live ? live.name : line.productName,
      barcode: live ? live.barcode : line.barcode,
      quantity: line.quantity,
      listPrice,
      unitPrice,
      costPrice,
      lineTotal: Math.round(line.quantity * unitPrice * 100) / 100,
    };
  });
}

export function formatLocalYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export interface DailyReconciliation {
  todayTotal: number;
  todaySalesCount: number;
  todayVoidedCount: number;
  todayCashTotal: number;
  todayDigitalTotal: number;
  todayCashCount: number;
  todayDigitalCount: number;
  notedSalesToday: Sale[];
}

export function computeDailyReconciliation(
  sales: Sale[],
  referenceDate: Date = new Date()
): DailyReconciliation {
  let todayTotal = 0;
  let todaySalesCount = 0;
  let todayVoidedCount = 0;
  let todayCashTotal = 0;
  let todayDigitalTotal = 0;
  let todayCashCount = 0;
  let todayDigitalCount = 0;
  const notedSalesToday: Sale[] = [];

  for (const sale of sales) {
    if (!isSameLocalDay(sale.createdAt, referenceDate)) {
      continue;
    }
    if (sale.status === 'voided') {
      todayVoidedCount += 1;
      continue;
    }
    todaySalesCount += 1;
    todayTotal += sale.totalAmount;
    if (isDigitalPaymentMethod(sale.paymentMethod)) {
      todayDigitalTotal += sale.totalAmount;
      todayDigitalCount += 1;
    } else {
      todayCashTotal += sale.totalAmount;
      todayCashCount += 1;
    }
    if ((sale.note ?? '').trim().length > 0) {
      notedSalesToday.push(sale);
    }
  }

  notedSalesToday.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return {
    todayTotal: Math.round(todayTotal * 100) / 100,
    todaySalesCount,
    todayVoidedCount,
    todayCashTotal: Math.round(todayCashTotal * 100) / 100,
    todayDigitalTotal: Math.round(todayDigitalTotal * 100) / 100,
    todayCashCount,
    todayDigitalCount,
    notedSalesToday,
  };
}

export function filterSales(
  sales: Sale[],
  options: { dateYmd?: string; includeVoided?: boolean } = {}
): Sale[] {
  const { dateYmd = '', includeVoided = true } = options;
  const trimmedDate = dateYmd.trim();

  return sales
    .filter((sale) => {
      if (!includeVoided && sale.status === 'voided') {
        return false;
      }
      if (trimmedDate && formatLocalYmd(sale.createdAt) !== trimmedDate) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function formatSaleDateTime(date: Date, lang: 'en' | 'ku' = 'en'): string {
  if (lang === 'ku') {
    const ymd = formatLocalYmd(date);
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${ymd} ${hh}:${mm}`;
  }
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatSaleTime(date: Date, lang: 'en' | 'ku' = 'en'): string {
  if (lang === 'ku') {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
