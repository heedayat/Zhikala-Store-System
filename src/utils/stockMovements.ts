import {
  ADD_STOCK_REASONS,
  REMOVE_STOCK_REASONS,
  type Product,
  type StockMovement,
  type StockMovementReason,
  type StockMovementType,
} from '../types/inventory';
import { getTranslations, interpolate, type AppLanguage } from './i18n';
import { formatLocalYmd } from './sales';

export interface StockAdjustmentInput {
  type: 'add' | 'remove';
  product: Pick<Product, 'id' | 'name' | 'quantityInStock'> | null;
  quantity: string;
  costPrice: string;
  reason: string;
  note: string;
}

export interface StockAdjustmentValidationErrors {
  product?: string;
  quantity?: string;
  costPrice?: string;
  reason?: string;
  note?: string;
}

export interface ValidatedStockAdjustment {
  type: 'add' | 'remove';
  productId: string;
  productName: string;
  quantityChange: number;
  nextQuantityInStock: number;
  reason: StockMovementReason;
  note: string;
  costPrice: number | null;
}

export interface StockHistoryFilters {
  productId: string;
  type: 'all' | StockMovementType;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;   // YYYY-MM-DD
}

export function validateStockAdjustment(
  input: StockAdjustmentInput,
  lang: AppLanguage = 'en'
):
  | { valid: true; data: ValidatedStockAdjustment }
  | { valid: false; errors: StockAdjustmentValidationErrors } {
  const v = getTranslations(lang).validation;
  const errors: StockAdjustmentValidationErrors = {};

  if (!input.product) {
    errors.product = v.stockProductRequired;
  }

  const qtyRaw = input.quantity.trim();
  const parsedQty = Number(qtyRaw);
  if (!qtyRaw || !Number.isFinite(parsedQty) || !Number.isInteger(parsedQty) || parsedQty < 1) {
    errors.quantity = v.stockQtyInvalidWhole;
  } else if (parsedQty > 1_000_000) {
    errors.quantity = v.stockQtyTooLarge;
  } else if (input.type === 'remove' && input.product && parsedQty > input.product.quantityInStock) {
    errors.quantity = interpolate(v.stockRemoveExceeds, {
      requested: parsedQty,
      available: input.product.quantityInStock,
    });
  }

  const allowedReasons: readonly string[] =
    input.type === 'add' ? ADD_STOCK_REASONS : REMOVE_STOCK_REASONS;
  if (!allowedReasons.includes(input.reason)) {
    errors.reason = v.stockReasonInvalid;
  }

  let parsedCostPrice: number | null = null;
  if (input.type === 'add') {
    const costRaw = input.costPrice.trim();
    if (costRaw !== '') {
      const val = Number(costRaw);
      if (!Number.isFinite(val) || val < 0) {
        errors.costPrice = v.stockCostInvalid;
      } else if (val > 1_000_000_000) {
        errors.costPrice = v.stockCostTooLarge;
      } else {
        parsedCostPrice = Math.round(val * 100) / 100;
      }
    }
  }

  const note = input.note.trim();
  if (note.length > 500) {
    errors.note = v.stockNoteMax;
  }

  if (Object.keys(errors).length > 0 || !input.product) {
    return { valid: false, errors };
  }

  const quantityChange = input.type === 'add' ? parsedQty : -parsedQty;
  const nextQuantityInStock = input.product.quantityInStock + quantityChange;

  return {
    valid: true,
    data: {
      type: input.type,
      productId: input.product.id,
      productName: input.product.name,
      quantityChange,
      nextQuantityInStock,
      reason: input.reason as StockMovementReason,
      note,
      costPrice: parsedCostPrice,
    },
  };
}

function parseLocalDateStart(ymd: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0).getTime();
}

function parseLocalDateEnd(ymd: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999).getTime();
}

export function sortStockMovementsNewestFirst(movements: StockMovement[]): StockMovement[] {
  return [...movements].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function filterStockMovements(
  movements: StockMovement[],
  filters: StockHistoryFilters
): StockMovement[] {
  const fromMs = filters.dateFrom ? parseLocalDateStart(filters.dateFrom) : null;
  const toMs = filters.dateTo ? parseLocalDateEnd(filters.dateTo) : null;

  const filtered = movements.filter((m) => {
    if (filters.productId && m.productId !== filters.productId) {
      return false;
    }

    if (filters.type !== 'all' && m.type !== filters.type) {
      return false;
    }

    const ts = m.createdAt.getTime();
    if (fromMs !== null && ts < fromMs) {
      return false;
    }
    if (toMs !== null && ts > toMs) {
      return false;
    }

    return true;
  });

  return sortStockMovementsNewestFirst(filtered);
}

export function formatMovementDateTime(date: Date, lang: AppLanguage = 'en'): string {
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
