import type {
  AppUser,
  NetworkSyncStatus,
  PaymentMethod,
  Product,
  Sale,
  SaleLineItem,
  ShopSettings,
  UserRole,
} from '../types/inventory';

export const OFFLINE_PRODUCTS_CACHE_KEY = 'toybox_offline_products_v1';
export const OFFLINE_SALES_CACHE_KEY = 'toybox_offline_sales_v1';
export const OFFLINE_SETTINGS_CACHE_KEY = 'toybox_offline_settings_v1';
export const OFFLINE_USER_CACHE_PREFIX = 'toybox_offline_user_v1_';
export const OFFLINE_PENDING_SALES_KEY = 'toybox_offline_pending_sales_v1';

export interface PendingOfflineSale {
  saleId: string;
  ownerId: string;
  items: SaleLineItem[];
  totalAmount: number;
  totalCost: number;
  itemCount: number;
  paymentMethod: PaymentMethod;
  note: string;
  recordedByName?: string;
  recordedByEmail?: string;
  createdAtIso: string;
}

export interface NetworkSyncInput {
  isOnline: boolean;
  hasPendingWrites: boolean;
  pendingOfflineQueueCount: number;
}

export function computeNetworkSyncStatus(input: NetworkSyncInput): NetworkSyncStatus {
  if (!input.isOnline) {
    return 'offline';
  }
  if (input.hasPendingWrites || input.pendingOfflineQueueCount > 0) {
    return 'syncing';
  }
  return 'online';
}

export function hasUnsyncedLocalChanges(input: NetworkSyncInput): boolean {
  return input.hasPendingWrites || input.pendingOfflineQueueCount > 0;
}

function safeParseDate(raw: unknown, fallback: Date | null = null): Date | null {
  if (typeof raw !== 'string' || !raw) return fallback;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export function serializeCachedProducts(products: Product[]): string {
  return JSON.stringify(
    products.map((p) => ({
      ...p,
      createdAt: p.createdAt ? p.createdAt.toISOString() : null,
      updatedAt: p.updatedAt ? p.updatedAt.toISOString() : null,
    }))
  );
}

export function deserializeCachedProducts(raw: string | null): Product[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.map((entry: Record<string, unknown>) => ({
      id: String(entry.id ?? ''),
      ownerId: String(entry.ownerId ?? ''),
      name: String(entry.name ?? ''),
      barcode: String(entry.barcode ?? ''),
      category: String(entry.category ?? ''),
      sellingPrice: Number(entry.sellingPrice ?? 0),
      costPrice: Number(entry.costPrice ?? 0),
      quantityInStock: Number(entry.quantityInStock ?? 0),
      reorderLevel:
        entry.reorderLevel === null || entry.reorderLevel === undefined
          ? null
          : Number(entry.reorderLevel),
      photos: Array.isArray(entry.photos) ? entry.photos.map(String) : [],
      brand: entry.brand ? String(entry.brand) : '',
      ageRange: entry.ageRange ? String(entry.ageRange) : '',
      supplier: entry.supplier ? String(entry.supplier) : '',
      variantLabel: entry.variantLabel ? String(entry.variantLabel) : '',
      notes: entry.notes ? String(entry.notes) : '',
      isArchived: Boolean(entry.isArchived),
      createdAt: safeParseDate(entry.createdAt, null),
      updatedAt: safeParseDate(entry.updatedAt, null),
    }));
  } catch {
    return null;
  }
}

export function serializeCachedSales(sales: Sale[]): string {
  return JSON.stringify(
    sales.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt ? s.updatedAt.toISOString() : null,
      voidedAt: s.voidedAt ? s.voidedAt.toISOString() : null,
    }))
  );
}

export function deserializeCachedSales(raw: string | null): Sale[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.map((entry: Record<string, unknown>) => ({
      id: String(entry.id ?? ''),
      ownerId: String(entry.ownerId ?? ''),
      items: Array.isArray(entry.items)
        ? entry.items.map((item: Record<string, unknown>) => ({
            productId: String(item.productId ?? ''),
            productName: String(item.productName ?? ''),
            barcode: String(item.barcode ?? ''),
            quantity: Number(item.quantity ?? 0),
            listPrice: Number(item.listPrice ?? 0),
            unitPrice: Number(item.unitPrice ?? 0),
            costPrice: Number(item.costPrice ?? 0),
            lineTotal: Number(item.lineTotal ?? 0),
          }))
        : [],
      totalAmount: Number(entry.totalAmount ?? 0),
      totalCost: Number(entry.totalCost ?? 0),
      itemCount: Number(entry.itemCount ?? 0),
      paymentMethod:
        entry.paymentMethod === 'fib' || entry.paymentMethod === 'card'
          ? entry.paymentMethod
          : 'cash',
      note: entry.note ? String(entry.note) : '',
      status: entry.status === 'voided' ? 'voided' : 'completed',
      ...(entry.recordedByName ? { recordedByName: String(entry.recordedByName) } : {}),
      ...(entry.recordedByEmail ? { recordedByEmail: String(entry.recordedByEmail) } : {}),
      createdAt: safeParseDate(entry.createdAt, new Date()) ?? new Date(),
      updatedAt: safeParseDate(entry.updatedAt, null),
      voidedAt: safeParseDate(entry.voidedAt, null),
    }));
  } catch {
    return null;
  }
}

export function applyPendingSalesToProducts(
  products: Product[],
  pendingSales: PendingOfflineSale[]
): Product[] {
  if (pendingSales.length === 0) return products;
  const qtyByProduct = new Map<string, number>();
  for (const sale of pendingSales) {
    for (const item of sale.items) {
      qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) ?? 0) + item.quantity);
    }
  }
  return products.map((product) => {
    const delta = qtyByProduct.get(product.id);
    if (!delta) return product;
    return {
      ...product,
      quantityInStock: product.quantityInStock - delta,
    };
  });
}

export function mergePendingSalesIntoList(
  sales: Sale[],
  pendingSales: PendingOfflineSale[]
): Sale[] {
  if (pendingSales.length === 0) return sales;
  const existingIds = new Set(sales.map((s) => s.id));
  const pendingAsSales: Sale[] = pendingSales
    .filter((p) => !existingIds.has(p.saleId))
    .map((p) => ({
      id: p.saleId,
      ownerId: p.ownerId,
      items: p.items,
      totalAmount: p.totalAmount,
      totalCost: p.totalCost,
      itemCount: p.itemCount,
      paymentMethod: p.paymentMethod,
      note: p.note,
      status: 'completed',
      ...(p.recordedByName ? { recordedByName: p.recordedByName } : {}),
      ...(p.recordedByEmail ? { recordedByEmail: p.recordedByEmail } : {}),
      createdAt: safeParseDate(p.createdAtIso, new Date()) ?? new Date(),
      updatedAt: safeParseDate(p.createdAtIso, new Date()),
      voidedAt: null,
    }));
  if (pendingAsSales.length === 0) return sales;
  return [...pendingAsSales, ...sales].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

export function saveOfflineProductsCache(products: Product[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OFFLINE_PRODUCTS_CACHE_KEY, serializeCachedProducts(products));
  } catch {
    // Ignore storage quota failures
  }
}

export function loadOfflineProductsCache(): Product[] | null {
  if (typeof window === 'undefined') return null;
  try {
    return deserializeCachedProducts(localStorage.getItem(OFFLINE_PRODUCTS_CACHE_KEY));
  } catch {
    return null;
  }
}

export function saveOfflineSalesCache(sales: Sale[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OFFLINE_SALES_CACHE_KEY, serializeCachedSales(sales));
  } catch {
    // Ignore storage quota failures
  }
}

export function loadOfflineSalesCache(): Sale[] | null {
  if (typeof window === 'undefined') return null;
  try {
    return deserializeCachedSales(localStorage.getItem(OFFLINE_SALES_CACHE_KEY));
  } catch {
    return null;
  }
}

export function saveOfflineSettingsCache(settings: ShopSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OFFLINE_SETTINGS_CACHE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore
  }
}

export function loadOfflineSettingsCache(): ShopSettings | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(OFFLINE_SETTINGS_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ShopSettings;
  } catch {
    return null;
  }
}

export function saveOfflineUserCache(user: AppUser): void {
  if (typeof window === 'undefined') return;
  const emailKey = user.email.trim().toLowerCase();
  if (!emailKey) return;
  try {
    localStorage.setItem(
      `${OFFLINE_USER_CACHE_PREFIX}${emailKey}`,
      JSON.stringify({
        ...user,
        email: emailKey,
        createdAt: user.createdAt ? user.createdAt.toISOString() : null,
        updatedAt: user.updatedAt ? user.updatedAt.toISOString() : null,
      })
    );
  } catch {
    // Ignore
  }
}

export function loadOfflineUserCache(rawEmail: string): AppUser | null {
  if (typeof window === 'undefined') return null;
  const emailKey = rawEmail.trim().toLowerCase();
  if (!emailKey) return null;
  try {
    const raw = localStorage.getItem(`${OFFLINE_USER_CACHE_PREFIX}${emailKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const rawRole = String(parsed.role ?? 'cashier');
    const role: UserRole =
      rawRole === 'admin' || rawRole === 'owner' || rawRole === 'cashier' ? rawRole : 'cashier';
    return {
      email: emailKey,
      displayName: String(parsed.displayName ?? ''),
      role,
      active: Boolean(parsed.active),
      ...(typeof parsed.pin === 'string' && /^\d{4}$/.test(parsed.pin)
        ? { pin: parsed.pin }
        : {}),
      createdAt: safeParseDate(parsed.createdAt, null),
      updatedAt: safeParseDate(parsed.updatedAt, null),
    };
  } catch {
    return null;
  }
}

export function loadPendingOfflineSales(): PendingOfflineSale[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_PENDING_SALES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PendingOfflineSale[]) : [];
  } catch {
    return [];
  }
}

export function savePendingOfflineSales(queue: PendingOfflineSale[]): void {
  if (typeof window === 'undefined') return;
  try {
    if (queue.length === 0) {
      localStorage.removeItem(OFFLINE_PENDING_SALES_KEY);
    } else {
      localStorage.setItem(OFFLINE_PENDING_SALES_KEY, JSON.stringify(queue));
    }
  } catch {
    // Ignore storage failures
  }
}

export function enqueuePendingOfflineSale(entry: PendingOfflineSale): PendingOfflineSale[] {
  const existing = loadPendingOfflineSales();
  if (existing.some((item) => item.saleId === entry.saleId)) {
    return existing;
  }
  const next = [...existing, entry];
  savePendingOfflineSales(next);
  return next;
}

export function removePendingOfflineSale(saleId: string): PendingOfflineSale[] {
  const existing = loadPendingOfflineSales();
  const next = existing.filter((item) => item.saleId !== saleId);
  savePendingOfflineSales(next);
  return next;
}
