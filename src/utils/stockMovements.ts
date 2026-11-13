import {
  ADD_STOCK_REASONS,
  REMOVE_STOCK_REASONS,
  type Product,
  type StockMovement,
  type StockMovementReason,
  type StockMovementType,
} from '../types/inventory';

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
  input: StockAdjustmentInput
):
  | { valid: true; data: ValidatedStockAdjustment }
  | { valid: false; errors: StockAdjustmentValidationErrors } {
  const errors: StockAdjustmentValidationErrors = {};

  if (!input.product) {
    errors.product = 'Select a product by searching or scanning its barcode.';
  }

  const qtyRaw = input.quantity.trim();
  const parsedQty = Number(qtyRaw);
  if (!qtyRaw || !Number.isFinite(parsedQty) || !Number.isInteger(parsedQty) || parsedQty < 1) {
    errors.quantity = 'Enter a whole quantity of 1 or more.';
  } else if (parsedQty > 1_000_000) {
    errors.quantity = 'Quantity is too large.';
  } else if (input.type === 'remove' && input.product && parsedQty > input.product.quantityInStock) {
    errors.quantity = `Cannot remove ${parsedQty}; only ${input.product.quantityInStock} in stock.`;
  }

  const allowedReasons: readonly string[] =
    input.type === 'add' ? ADD_STOCK_REASONS : REMOVE_STOCK_REASONS;
  if (!allowedReasons.includes(input.reason)) {
    errors.reason = 'Choose a valid reason.';
  }

  let parsedCostPrice: number | null = null;
  if (input.type === 'add') {
    const costRaw = input.costPrice.trim();
    if (costRaw !== '') {
      const val = Number(costRaw);
      if (!Number.isFinite(val) || val < 0) {
        errors.costPrice = 'Enter a valid cost price (0 or higher).';
      } else if (val > 1_000_000_000) {
        errors.costPrice = 'Cost price is too large.';
      } else {
        parsedCostPrice = Math.round(val);
      }
    }
  }

  const note = input.note.trim();
  if (note.length > 500) {
    errors.note = 'Note must be 500 characters or fewer.';
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

export function formatMovementDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
