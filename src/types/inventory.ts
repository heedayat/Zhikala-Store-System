export type NavSection = 'products' | 'sell' | 'stock' | 'reports' | 'users';

export type UserRole = 'admin' | 'owner' | 'cashier';

export type SupportedCurrency = 'IQD' | 'USD';

export type PaymentMethod = 'cash' | 'fib' | 'card';

export interface AppUser {
  email: string; // normalized lowercase email (Firestore doc ID)
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

export type StockMovementType = 'add' | 'remove' | 'sale' | 'void';

export type AddStockReason = 'New stock arrived' | 'Customer return' | 'Correction';
export type RemoveStockReason = 'Damaged' | 'Lost' | 'Correction' | 'Other';
export type StockMovementReason = AddStockReason | RemoveStockReason | 'Sale' | 'Sale voided';

export const ADD_STOCK_REASONS: AddStockReason[] = [
  'New stock arrived',
  'Customer return',
  'Correction',
];

export const REMOVE_STOCK_REASONS: RemoveStockReason[] = [
  'Damaged',
  'Lost',
  'Correction',
  'Other',
];

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
  recordedByName?: string;
  recordedByEmail?: string;
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
  photo: string;
  variantLabel: string;
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
  paymentMethod: PaymentMethod;
  note?: string;
  status: SaleStatus;
  recordedByName?: string;
  recordedByEmail?: string;
  createdAt: Date;
  updatedAt?: Date | null;
  voidedAt?: Date | null;
}

export interface ShopSettings {
  ownerId: string;
  shopName: string;
  storeSubtitle?: string;
  receiptFooter?: string;
  logoUrl?: string;
  currency: string;
  weekStartDay?: number;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}
