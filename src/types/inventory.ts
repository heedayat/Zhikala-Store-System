export type UserRole = 'admin' | 'owner';

export type NavSection = 'products' | 'sell' | 'stock' | 'reports' | 'users';

export interface AppUser {
  email: string;
  displayName: string;
  role: UserRole;
  active: boolean;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface Product {
  id: string;
  ownerId: string;
  name: string;
  barcode: string;
  category: string;
  sellingPrice: number;
  costPrice: number;
  quantityInStock: number;
  reorderLevel?: number | null;
  photos: string[];
  brand?: string;
  ageRange?: string;
  supplier?: string;
  variantLabel?: string;
  notes?: string;
  isArchived: boolean;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface ProductFormValues {
  name: string;
  barcode: string;
  category: string;
  sellingPrice: string;
  costPrice: string;
  quantityInStock: string;
  reorderLevel: string;
  photos: string[];
  brand: string;
  ageRange: string;
  supplier: string;
  variantLabel: string;
  notes: string;
}

export interface ShopSettings {
  ownerId: string;
  shopName: string;
  currency: string;
  weekStartDay?: number;
}

export type StockMovementType = 'add' | 'remove' | 'sale' | 'void';

export const ADD_STOCK_REASONS = [
  'New stock arrived',
  'Customer return',
  'Correction',
] as const;

export const REMOVE_STOCK_REASONS = [
  'Damaged',
  'Lost',
  'Correction',
  'Other',
] as const;

export const SALE_STOCK_REASONS = ['Sale', 'Sale voided'] as const;

export type AddStockReason = (typeof ADD_STOCK_REASONS)[number];
export type RemoveStockReason = (typeof REMOVE_STOCK_REASONS)[number];
export type SaleStockReason = (typeof SALE_STOCK_REASONS)[number];
export type StockMovementReason = AddStockReason | RemoveStockReason | SaleStockReason;

export interface StockMovement {
  id: string;
  ownerId: string;
  productId: string;
  productName: string;
  type: StockMovementType;
  quantityChange: number;
  reason: StockMovementReason;
  note?: string;
  costPrice?: number | null;
  saleId?: string;
  createdAt: Date;
}

export interface SaleLineItem {
  productId: string;
  productName: string;
  barcode: string;
  quantity: number;
  listPrice: number;
  unitPrice: number;
  costPrice: number;
  lineTotal: number;
}

export interface CartLineItem {
  productId: string;
  productName: string;
  barcode: string;
  variantLabel?: string;
  photo?: string;
  quantity: number;
  listPrice: number;
  unitPrice: number;
  costPrice: number;
  availableStock: number;
}

export type SaleStatus = 'completed' | 'voided';

export interface Sale {
  id: string;
  ownerId: string;
  items: SaleLineItem[];
  totalAmount: number;
  totalCost: number;
  itemCount: number;
  paymentMethod: 'cash';
  note?: string;
  status: SaleStatus;
  createdAt: Date;
  updatedAt?: Date | null;
  voidedAt?: Date | null;
}
