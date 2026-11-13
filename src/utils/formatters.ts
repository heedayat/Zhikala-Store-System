import type { Product } from '../types/inventory';

export interface ProductFilters {
  search: string;
  category: string;
  lowStockOnly: boolean;
  showArchived: boolean;
}

export function formatCurrency(amount: number, currency = 'IQD', lang: 'en' | 'ku' = 'en'): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const cleanCurrency = currency.trim() || 'IQD';
  if (cleanCurrency.toUpperCase() === 'USD') {
    const roundedUsd = Math.round(safeAmount * 100) / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(roundedUsd);
  }
  const wholeAmount = Math.round(safeAmount);
  const formattedNumber = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(wholeAmount);
  const displayCurrency =
    cleanCurrency.toUpperCase() === 'IQD' && lang === 'ku' ? 'د.ع' : cleanCurrency;
  return `${formattedNumber} ${displayCurrency}`;
}

export function formatNumber(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(safeValue);
}

export function isLowStock(product: Pick<Product, 'quantityInStock' | 'reorderLevel'>): boolean {
  if (product.reorderLevel === undefined || product.reorderLevel === null) {
    return false;
  }
  return product.quantityInStock <= product.reorderLevel;
}

export function extractUsedCategories(products: Pick<Product, 'category'>[]): string[] {
  const seen = new Map<string, string>();
  for (const product of products) {
    const raw = (product.category ?? '').trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, raw);
    }
  }
  return Array.from(seen.values()).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
}

export function findProductByBarcode(products: Product[], rawCode: string): Product | undefined {
  const normalized = rawCode.trim();
  if (!normalized) return undefined;
  return products.find((p) => (p.barcode ?? '').trim() === normalized);
}

export function filterProducts(products: Product[], filters: ProductFilters): Product[] {
  const query = filters.search.trim().toLowerCase();
  const categoryFilter = filters.category.trim().toLowerCase();

  return products.filter((product) => {
    if (Boolean(product.isArchived) !== filters.showArchived) {
      return false;
    }

    if (categoryFilter && (product.category ?? '').trim().toLowerCase() !== categoryFilter) {
      return false;
    }

    if (filters.lowStockOnly && !isLowStock(product)) {
      return false;
    }

    if (query) {
      const haystack = [
        product.name,
        product.barcode,
        product.category,
        product.brand,
        product.variantLabel,
        product.supplier,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(query)) {
        return false;
      }
    }

    return true;
  });
}

export function computeInventorySummary(products: Product[]) {
  const activeProducts = products.filter((p) => !p.isArchived);
  const archivedCount = products.length - activeProducts.length;
  const lowStockCount = activeProducts.filter((p) => isLowStock(p)).length;
  const outOfStockCount = activeProducts.filter((p) => p.quantityInStock <= 0).length;
  const totalUnits = activeProducts.reduce((sum, p) => sum + Math.max(0, p.quantityInStock), 0);
  const totalRetailValue = activeProducts.reduce(
    (sum, p) => sum + Math.max(0, p.quantityInStock) * Math.max(0, p.sellingPrice),
    0
  );

  return {
    activeCount: activeProducts.length,
    archivedCount,
    lowStockCount,
    outOfStockCount,
    totalUnits,
    totalRetailValue,
  };
}

export function formatActionError(error: unknown, fallbackMessage: string): string {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  if (!raw.trim()) return fallbackMessage;

  let extracted = raw.trim();
  if (extracted.startsWith('{')) {
    try {
      const parsed = JSON.parse(extracted) as { error?: unknown };
      if (typeof parsed.error === 'string' && parsed.error.trim()) {
        extracted = parsed.error.trim();
      }
    } catch {
      // Keep original string if not valid JSON
    }
  }

  const lower = extracted.toLowerCase();
  if (lower.includes('auth/popup-blocked')) {
    return 'The Google sign-in popup was blocked by your browser. Allow popups for this site and click Sign in with Google again.';
  }
  if (lower.includes('auth/unauthorized-domain')) {
    return 'This app domain is not authorized in Firebase Authentication. Add this hostname under Firebase Console > Authentication > Settings > Authorized domains.';
  }
  if (lower.includes('auth/operation-not-allowed')) {
    return 'Google Sign-In is disabled in Firebase Authentication. Enable the Google provider in the Firebase Console.';
  }
  if (lower.includes('auth/network-request-failed')) {
    return 'Network error while signing in with Google. Check your internet connection and try again.';
  }
  if (lower.includes('permission-denied') || lower.includes('missing or insufficient permissions')) {
    return 'You do not have permission to save this change. Check your account role or verify every field is valid.';
  }
  if (lower.includes('client is offline') || lower.includes('unavailable') || lower.includes('network')) {
    return 'Could not reach the server. Check your internet connection and try again.';
  }
  if (lower.includes('quota exceeded')) {
    return 'Database daily quota was exceeded. Please try again tomorrow or check your Firebase plan.';
  }

  return extracted || fallbackMessage;
}

export const MAX_LOGO_URL_LENGTH = 200_000;

export function normalizeLogoUrl(raw: string | null | undefined): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return '';
  if (trimmed.length > MAX_LOGO_URL_LENGTH) {
    return '';
  }
  if (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('/')
  ) {
    return trimmed;
  }
  return '';
}
