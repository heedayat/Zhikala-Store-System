import {
  collection,
  deleteField,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, handleFirestoreError, OperationType, storage } from '../firebase';
import type {
  AppUser,
  PaymentMethod,
  Product,
  Sale,
  SaleLineItem,
  ShopSettings,
  StockMovement,
  StockMovementReason,
  StockMovementType,
  UserRole,
} from '../types/inventory';
import type { ValidatedProductPayload } from '../utils/productValidation';
import { normalizeLogoUrl } from '../utils/formatters';
import { DEFAULT_WEEK_START_DAY, normalizeWeekStartDay } from '../utils/reports';
import { normalizePaymentMethod } from '../utils/sales';
import type { ValidatedStockAdjustment } from '../utils/stockMovements';
import {
  BOOTSTRAP_ADMIN_EMAIL,
  INITIAL_OWNER_EMAIL,
  isAuthorizedUserRecord,
  isBootstrapAdminEmail,
  isValidUserRole,
  normalizeEmail,
} from '../utils/users';

const USERS_COLLECTION = 'users';
const PRODUCTS_COLLECTION = 'products';
const STOCK_MOVEMENTS_COLLECTION = 'stockMovements';
const SALES_COLLECTION = 'sales';
const SETTINGS_COLLECTION = 'settings';
const SHOP_SETTINGS_DOC_ID = 'shop';

export const MAX_INLINE_PHOTOS = 4;

export class StockTransactionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StockTransactionError';
  }
}

export function generateDocumentId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function parseUserDoc(emailId: string, data: Record<string, unknown>): AppUser {
  const rawRole = String(data.role ?? '');
  const role: UserRole = isValidUserRole(rawRole) ? rawRole : 'cashier';
  const tsCreated = data.createdAt as { toDate?: () => Date } | undefined;
  const tsUpdated = data.updatedAt as { toDate?: () => Date } | undefined;
  return {
    email: normalizeEmail(emailId),
    displayName: String(data.displayName ?? ''),
    role,
    active: Boolean(data.active),
    createdAt: tsCreated?.toDate ? tsCreated.toDate() : null,
    updatedAt: tsUpdated?.toDate ? tsUpdated.toDate() : null,
  };
}

let bootstrapAttemptedForEmail: string | null = null;
let bootstrapInFlight: Promise<void> | null = null;

export async function ensureBootstrapShopUsers(
  rawEmail: string,
  fallbackDisplayName?: string | null
): Promise<void> {
  const emailId = normalizeEmail(rawEmail);
  if (!isBootstrapAdminEmail(emailId)) return;
  if (bootstrapInFlight) return bootstrapInFlight;

  bootstrapAttemptedForEmail = emailId;
  const adminRef = doc(db, USERS_COLLECTION, BOOTSTRAP_ADMIN_EMAIL);
  const ownerRef = doc(db, USERS_COLLECTION, INITIAL_OWNER_EMAIL);
  const cleanFallbackName = (fallbackDisplayName ?? '').trim().slice(0, 80) || 'Hidayat';

  bootstrapInFlight = runTransaction(db, async (tx) => {
    const [adminSnap, ownerSnap] = await Promise.all([tx.get(adminRef), tx.get(ownerRef)]);

    if (!adminSnap.exists()) {
      tx.set(adminRef, {
        displayName: cleanFallbackName,
        role: 'admin',
        active: true,
        createdAt: serverTimestamp(),
      });
    } else {
      const adminData = adminSnap.data() as Record<string, unknown>;
      const existingName =
        typeof adminData.displayName === 'string' && adminData.displayName.trim()
          ? adminData.displayName.trim().slice(0, 80)
          : cleanFallbackName;
      const tsCreated = adminData.createdAt as { toDate?: unknown } | undefined;
      const hasValidCreatedAt = Boolean(tsCreated && typeof tsCreated.toDate === 'function');
      const needsAdminRepair =
        adminData.role !== 'admin' ||
        adminData.active !== true ||
        typeof adminData.displayName !== 'string' ||
        !adminData.displayName.trim() ||
        !hasValidCreatedAt;

      if (needsAdminRepair) {
        if (!hasValidCreatedAt) {
          tx.set(adminRef, {
            displayName: existingName,
            role: 'admin',
            active: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          tx.update(adminRef, {
            displayName: existingName,
            role: 'admin',
            active: true,
            updatedAt: serverTimestamp(),
          });
        }
      }
    }

    if (!ownerSnap.exists()) {
      tx.set(ownerRef, {
        displayName: 'Shakar',
        role: 'owner',
        active: true,
        createdAt: serverTimestamp(),
      });
    }
  })
    .catch((err) => {
      bootstrapAttemptedForEmail = null;
      throw err;
    })
    .finally(() => {
      bootstrapInFlight = null;
    });

  return bootstrapInFlight;
}

export function subscribeToCurrentUserAccess(
  rawEmail: string,
  onAuthorized: (userRecord: AppUser) => void,
  onDenied: () => void,
  onError: (err: Error) => void,
  fallbackDisplayName?: string | null
): Unsubscribe {
  const emailId = normalizeEmail(rawEmail);
  const path = `${USERS_COLLECTION}/${emailId}`;
  const docRef = doc(db, USERS_COLLECTION, emailId);
  const isBootstrap = isBootstrapAdminEmail(emailId);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        if (isBootstrap) {
          void ensureBootstrapShopUsers(emailId, fallbackDisplayName).catch(() => {});
          onAuthorized({
            email: emailId,
            displayName: (fallbackDisplayName ?? '').trim().slice(0, 80) || 'Hidayat',
            role: 'admin',
            active: true,
          });
          return;
        }
        onDenied();
        return;
      }
      const data = snapshot.data() as Record<string, unknown>;
      const rawRole = String(data.role ?? '');
      const record = parseUserDoc(snapshot.id, data);
      if (!isValidUserRole(rawRole) || !isAuthorizedUserRecord(record)) {
        if (isBootstrap) {
          void ensureBootstrapShopUsers(emailId, fallbackDisplayName).catch(() => {});
          onAuthorized({
            email: emailId,
            displayName: record.displayName || (fallbackDisplayName ?? '').trim().slice(0, 80) || 'Hidayat',
            role: 'admin',
            active: true,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
          });
          return;
        }
        onDenied();
        return;
      }

      if (isBootstrap && bootstrapAttemptedForEmail !== emailId) {
        void ensureBootstrapShopUsers(emailId, fallbackDisplayName).catch(() => {});
      }
      onAuthorized(record);
    },
    (error) => {
      const code = (error as { code?: string }).code ?? '';
      const msg = error instanceof Error ? error.message.toLowerCase() : '';
      if (code === 'permission-denied' || msg.includes('missing or insufficient permissions')) {
        onDenied();
        return;
      }
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeToAllUsers(
  onData: (users: AppUser[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = USERS_COLLECTION;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const list: AppUser[] = snapshot.docs.map((docSnap) =>
        parseUserDoc(docSnap.id, docSnap.data() as Record<string, unknown>)
      );
      const roleRank: Record<UserRole, number> = { admin: 0, owner: 1, cashier: 2 };
      list.sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        if (a.role !== b.role) return roleRank[a.role] - roleRank[b.role];
        return a.email.localeCompare(b.email);
      });
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function createShopUser(input: {
  email: string;
  displayName: string;
  role: UserRole;
}): Promise<void> {
  const emailId = normalizeEmail(input.email);
  const path = `${USERS_COLLECTION}/${emailId}`;
  const docRef = doc(db, USERS_COLLECTION, emailId);
  try {
    await runTransaction(db, async (tx) => {
      const existingSnap = await tx.get(docRef);
      if (existingSnap.exists()) {
        throw new StockTransactionError('A user with this email address already exists.');
      }
      tx.set(docRef, {
        displayName: input.displayName.trim().slice(0, 80),
        role: input.role,
        active: true,
        createdAt: serverTimestamp(),
      });
    });
  } catch (error) {
    if (error instanceof StockTransactionError) throw error;
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateShopUser(
  rawEmail: string,
  updates: Partial<Pick<AppUser, 'displayName' | 'role' | 'active'>>
): Promise<void> {
  const emailId = normalizeEmail(rawEmail);
  const path = `${USERS_COLLECTION}/${emailId}`;
  const docRef = doc(db, USERS_COLLECTION, emailId);
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (updates.displayName !== undefined) {
    payload.displayName = updates.displayName.trim().slice(0, 80);
  }
  if (updates.role !== undefined) {
    payload.role = updates.role;
  }
  if (updates.active !== undefined) {
    payload.active = updates.active;
  }

  try {
    await updateDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeToProducts(
  onData: (products: Product[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = PRODUCTS_COLLECTION;

  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: Product[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ownerId: String(data.ownerId ?? ''),
          name: String(data.name ?? ''),
          barcode: String(data.barcode ?? ''),
          category: String(data.category ?? ''),
          sellingPrice: Number(data.sellingPrice ?? 0),
          costPrice: Number(data.costPrice ?? 0),
          quantityInStock: Number(data.quantityInStock ?? 0),
          reorderLevel:
            data.reorderLevel === undefined || data.reorderLevel === null
              ? null
              : Number(data.reorderLevel),
          photos: Array.isArray(data.photos) ? data.photos.map(String) : [],
          brand: data.brand ? String(data.brand) : '',
          ageRange: data.ageRange ? String(data.ageRange) : '',
          supplier: data.supplier ? String(data.supplier) : '',
          variantLabel: data.variantLabel ? String(data.variantLabel) : '',
          notes: data.notes ? String(data.notes) : '',
          isArchived: Boolean(data.isArchived),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : null,
        };
      });
      items.sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeToStockMovements(
  onData: (movements: StockMovement[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = STOCK_MOVEMENTS_COLLECTION;

  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: StockMovement[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const rawType = String(data.type ?? 'add');
        const movementType: StockMovementType =
          rawType === 'remove' || rawType === 'sale' || rawType === 'void'
            ? rawType
            : 'add';
        return {
          id: docSnap.id,
          ownerId: String(data.ownerId ?? ''),
          productId: String(data.productId ?? ''),
          productName: String(data.productName ?? ''),
          type: movementType,
          quantityChange: Number(data.quantityChange ?? 0),
          reason: String(data.reason ?? 'Correction') as StockMovementReason,
          note: data.note ? String(data.note) : '',
          costPrice:
            data.costPrice === undefined || data.costPrice === null
              ? null
              : Number(data.costPrice),
          saleId: data.saleId ? String(data.saleId) : undefined,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        };
      });
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeToSales(
  onData: (sales: Sale[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = SALES_COLLECTION;

  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: Sale[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const rawItems = Array.isArray(data.items) ? data.items : [];
        const lineItems: SaleLineItem[] = rawItems.map((entry: Record<string, unknown>) => ({
          productId: String(entry.productId ?? ''),
          productName: String(entry.productName ?? ''),
          barcode: String(entry.barcode ?? ''),
          quantity: Number(entry.quantity ?? 0),
          listPrice: Number(entry.listPrice ?? 0),
          unitPrice: Number(entry.unitPrice ?? 0),
          costPrice: Number(entry.costPrice ?? 0),
          lineTotal: Number(entry.lineTotal ?? 0),
        }));

        return {
          id: docSnap.id,
          ownerId: String(data.ownerId ?? ''),
          items: lineItems,
          totalAmount: Number(data.totalAmount ?? 0),
          totalCost: Number(data.totalCost ?? 0),
          itemCount: Number(data.itemCount ?? 0),
          paymentMethod: normalizePaymentMethod(data.paymentMethod),
          note: data.note ? String(data.note) : '',
          status: data.status === 'voided' ? 'voided' : 'completed',
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : null,
          voidedAt: data.voidedAt?.toDate ? data.voidedAt.toDate() : null,
        };
      });
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeToShopSettings(
  fallbackOwnerId: string,
  onData: (settings: ShopSettings | null) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const docPath = `${SETTINGS_COLLECTION}/${SHOP_SETTINGS_DOC_ID}`;

  return onSnapshot(
    collection(db, SETTINGS_COLLECTION),
    (snapshot) => {
      const match = snapshot.docs.find((d) => d.id === SHOP_SETTINGS_DOC_ID) ?? snapshot.docs[0];
      if (!match) {
        onData(null);
        return;
      }
      const data = match.data();
      onData({
        ownerId: String(data.ownerId ?? fallbackOwnerId),
        shopName: String(data.shopName ?? 'Little Wonders'),
        storeSubtitle: typeof data.storeSubtitle === 'string' ? data.storeSubtitle : '',
        receiptFooter: typeof data.receiptFooter === 'string' ? data.receiptFooter : '',
        logoUrl: normalizeLogoUrl(data.logoUrl),
        currency: String(data.currency ?? '').toUpperCase() === 'USD' ? 'USD' : 'IQD',
        weekStartDay: normalizeWeekStartDay(
          typeof data.weekStartDay === 'number' ? data.weekStartDay : DEFAULT_WEEK_START_DAY
        ),
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, docPath);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function saveShopSettings(
  ownerId: string,
  input: {
    shopName: string;
    storeSubtitle: string;
    receiptFooter: string;
    logoUrl?: string;
    currency: string;
    weekStartDay: number;
  },
  hasExistingSettings: boolean
): Promise<void> {
  const path = `${SETTINGS_COLLECTION}/${SHOP_SETTINGS_DOC_ID}`;
  const docRef = doc(db, SETTINGS_COLLECTION, SHOP_SETTINGS_DOC_ID);
  const cleanName = input.shopName.trim().slice(0, 80) || 'Little Wonders';
  const cleanSubtitle = input.storeSubtitle.trim().slice(0, 120);
  const cleanReceiptFooter = input.receiptFooter.trim().slice(0, 240);
  const cleanLogoUrl = normalizeLogoUrl(input.logoUrl);
  const cleanCurrency = input.currency.trim().toUpperCase() === 'USD' ? 'USD' : 'IQD';
  const cleanWeekStart = normalizeWeekStartDay(input.weekStartDay);

  try {
    if (hasExistingSettings) {
      await updateDoc(docRef, {
        shopName: cleanName,
        storeSubtitle: cleanSubtitle,
        receiptFooter: cleanReceiptFooter,
        logoUrl: cleanLogoUrl,
        currency: cleanCurrency,
        weekStartDay: cleanWeekStart,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        ownerId,
        shopName: cleanName,
        storeSubtitle: cleanSubtitle,
        receiptFooter: cleanReceiptFooter,
        logoUrl: cleanLogoUrl,
        currency: cleanCurrency,
        weekStartDay: cleanWeekStart,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      hasExistingSettings ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function createProduct(
  ownerId: string,
  productId: string,
  payload: ValidatedProductPayload
): Promise<void> {
  const path = `${PRODUCTS_COLLECTION}/${productId}`;
  const productRef = doc(db, PRODUCTS_COLLECTION, productId);

  const docData: Record<string, unknown> = {
    ownerId,
    name: payload.name,
    barcode: payload.barcode,
    category: payload.category,
    sellingPrice: payload.sellingPrice,
    costPrice: payload.costPrice,
    quantityInStock: payload.quantityInStock,
    photos: payload.photos,
    brand: payload.brand,
    ageRange: payload.ageRange,
    supplier: payload.supplier,
    variantLabel: payload.variantLabel,
    notes: payload.notes,
    isArchived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (payload.reorderLevel !== null) {
    docData.reorderLevel = payload.reorderLevel;
  }

  try {
    await runTransaction(db, async (tx) => {
      tx.set(productRef, docData);
      if (payload.quantityInStock > 0) {
        const movementRef = doc(db, STOCK_MOVEMENTS_COLLECTION, generateDocumentId());
        tx.set(movementRef, {
          ownerId,
          productId,
          productName: payload.name,
          type: 'add',
          quantityChange: payload.quantityInStock,
          reason: 'New stock arrived',
          note: 'Initial stock on product creation',
          costPrice: payload.costPrice,
          createdAt: serverTimestamp(),
        });
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateProduct(
  ownerId: string,
  productId: string,
  payload: ValidatedProductPayload
): Promise<void> {
  const path = `${PRODUCTS_COLLECTION}/${productId}`;
  const productRef = doc(db, PRODUCTS_COLLECTION, productId);

  const updateData: Record<string, unknown> = {
    name: payload.name,
    barcode: payload.barcode,
    category: payload.category,
    sellingPrice: payload.sellingPrice,
    costPrice: payload.costPrice,
    quantityInStock: payload.quantityInStock,
    photos: payload.photos,
    brand: payload.brand,
    ageRange: payload.ageRange,
    supplier: payload.supplier,
    variantLabel: payload.variantLabel,
    notes: payload.notes,
    reorderLevel: payload.reorderLevel !== null ? payload.reorderLevel : deleteField(),
    updatedAt: serverTimestamp(),
  };

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(productRef);
      if (!snap.exists()) {
        throw new StockTransactionError('Product no longer exists.');
      }
      const prevQty = Number(snap.data().quantityInStock ?? 0);
      const delta = payload.quantityInStock - prevQty;

      tx.update(productRef, updateData);

      if (delta !== 0) {
        const movementRef = doc(db, STOCK_MOVEMENTS_COLLECTION, generateDocumentId());
        tx.set(movementRef, {
          ownerId,
          productId,
          productName: payload.name,
          type: delta > 0 ? 'add' : 'remove',
          quantityChange: delta,
          reason: 'Correction',
          note: 'Adjusted in product editor',
          createdAt: serverTimestamp(),
        });
      }
    });
  } catch (error) {
    if (error instanceof StockTransactionError) throw error;
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function recordStockAdjustment(
  ownerId: string,
  adjustment: ValidatedStockAdjustment
): Promise<void> {
  const productRef = doc(db, PRODUCTS_COLLECTION, adjustment.productId);
  const movementId = generateDocumentId();
  const movementRef = doc(db, STOCK_MOVEMENTS_COLLECTION, movementId);
  const path = `${STOCK_MOVEMENTS_COLLECTION}/${movementId}`;

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(productRef);
      if (!snap.exists()) {
        throw new StockTransactionError('Selected product could not be found.');
      }

      const data = snap.data();
      const currentQty = Number(data.quantityInStock ?? 0);
      const nextQty = currentQty + adjustment.quantityChange;
      if (nextQty < 0) {
        throw new StockTransactionError(
          `Cannot remove ${Math.abs(adjustment.quantityChange)}; only ${currentQty} in stock.`
        );
      }

      const productUpdate: Record<string, unknown> = {
        quantityInStock: nextQty,
        updatedAt: serverTimestamp(),
      };
      if (adjustment.type === 'add' && adjustment.costPrice !== null) {
        productUpdate.costPrice = adjustment.costPrice;
      }

      const movementDoc: Record<string, unknown> = {
        ownerId,
        productId: adjustment.productId,
        productName: String(data.name ?? adjustment.productName),
        type: adjustment.type,
        quantityChange: adjustment.quantityChange,
        reason: adjustment.reason,
        createdAt: serverTimestamp(),
      };
      if (adjustment.note) {
        movementDoc.note = adjustment.note;
      }
      if (adjustment.type === 'add' && adjustment.costPrice !== null) {
        movementDoc.costPrice = adjustment.costPrice;
      }

      tx.update(productRef, productUpdate);
      tx.set(movementRef, movementDoc);
    });
  } catch (error) {
    if (error instanceof StockTransactionError) throw error;
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function completeSaleTransaction(
  ownerId: string,
  lineItems: SaleLineItem[],
  note: string,
  paymentMethod: PaymentMethod = 'cash'
): Promise<string> {
  if (lineItems.length === 0) {
    throw new StockTransactionError('Add at least one item before completing the sale.');
  }

  const saleId = generateDocumentId();
  const saleRef = doc(db, SALES_COLLECTION, saleId);
  const path = `${SALES_COLLECTION}/${saleId}`;
  const cleanNote = note.trim().slice(0, 500);
  const cleanPaymentMethod = normalizePaymentMethod(paymentMethod);

  // Aggregate quantities per productId so each product doc is read & updated once
  const qtyByProduct = new Map<string, { quantity: number; fallbackName: string }>();
  for (const item of lineItems) {
    const existing = qtyByProduct.get(item.productId);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      qtyByProduct.set(item.productId, {
        quantity: item.quantity,
        fallbackName: item.productName,
      });
    }
  }

  try {
    await runTransaction(db, async (tx) => {
      const productSnaps = new Map<string, { name: string; currentQty: number; sellingPrice: number; costPrice: number; barcode: string }>();

      // All reads must happen before any writes in a Firestore transaction
      for (const productId of qtyByProduct.keys()) {
        const productRef = doc(db, PRODUCTS_COLLECTION, productId);
        const snap = await tx.get(productRef);
        if (!snap.exists()) {
          const fallback = qtyByProduct.get(productId)?.fallbackName ?? 'Product';
          throw new StockTransactionError(`"${fallback}" no longer exists in inventory.`);
        }
        const data = snap.data();
        productSnaps.set(productId, {
          name: String(data.name ?? ''),
          currentQty: Number(data.quantityInStock ?? 0),
          sellingPrice: Number(data.sellingPrice ?? 0),
          costPrice: Number(data.costPrice ?? 0),
          barcode: String(data.barcode ?? ''),
        });
      }

      const finalItems: SaleLineItem[] = lineItems.map((item) => {
        const live = productSnaps.get(item.productId)!;
        const unitPrice = Math.max(0, Math.round(item.unitPrice * 100) / 100);
        return {
          productId: item.productId,
          productName: live.name || item.productName,
          barcode: live.barcode,
          quantity: item.quantity,
          listPrice: live.sellingPrice,
          unitPrice,
          costPrice: live.costPrice,
          lineTotal: Math.round(item.quantity * unitPrice * 100) / 100,
        };
      });

      const totalAmount =
        Math.round(finalItems.reduce((sum, i) => sum + i.lineTotal, 0) * 100) / 100;
      const totalCost =
        Math.round(finalItems.reduce((sum, i) => sum + i.quantity * i.costPrice, 0) * 100) / 100;
      const itemCount = finalItems.reduce((sum, i) => sum + i.quantity, 0);

      const saleDoc: Record<string, unknown> = {
        ownerId,
        items: finalItems,
        totalAmount,
        totalCost,
        itemCount,
        paymentMethod: cleanPaymentMethod,
        status: 'completed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (cleanNote) {
        saleDoc.note = cleanNote;
      }

      tx.set(saleRef, saleDoc);

      for (const [productId, agg] of qtyByProduct.entries()) {
        const live = productSnaps.get(productId)!;
        const nextQty = live.currentQty - agg.quantity;
        const productRef = doc(db, PRODUCTS_COLLECTION, productId);
        tx.update(productRef, {
          quantityInStock: nextQty,
          updatedAt: serverTimestamp(),
        });

        const movementRef = doc(db, STOCK_MOVEMENTS_COLLECTION, generateDocumentId());
        const movementDoc: Record<string, unknown> = {
          ownerId,
          productId,
          productName: live.name || agg.fallbackName,
          type: 'sale',
          quantityChange: -agg.quantity,
          reason: 'Sale',
          saleId,
          createdAt: serverTimestamp(),
        };
        if (cleanNote) {
          movementDoc.note = cleanNote;
        }
        tx.set(movementRef, movementDoc);
      }
    });
    return saleId;
  } catch (error) {
    if (error instanceof StockTransactionError) throw error;
    handleFirestoreError(error, OperationType.WRITE, path);
  }
  return saleId;
}

export async function voidSaleTransaction(
  ownerId: string,
  saleId: string
): Promise<void> {
  const saleRef = doc(db, SALES_COLLECTION, saleId);
  const path = `${SALES_COLLECTION}/${saleId}`;

  try {
    await runTransaction(db, async (tx) => {
      const saleSnap = await tx.get(saleRef);
      if (!saleSnap.exists()) {
        throw new StockTransactionError('Sale record no longer exists.');
      }
      const saleData = saleSnap.data();
      if (saleData.status === 'voided') {
        throw new StockTransactionError('This sale has already been voided.');
      }

      const rawItems = Array.isArray(saleData.items) ? saleData.items : [];
      const qtyByProduct = new Map<string, { quantity: number; productName: string }>();
      for (const entry of rawItems) {
        const pid = String(entry.productId ?? '');
        const qty = Number(entry.quantity ?? 0);
        const pname = String(entry.productName ?? 'Product');
        if (!pid || qty <= 0) continue;
        const prev = qtyByProduct.get(pid);
        if (prev) {
          prev.quantity += qty;
        } else {
          qtyByProduct.set(pid, { quantity: qty, productName: pname });
        }
      }

      const productSnaps = new Map<string, { name: string; currentQty: number }>();
      for (const productId of qtyByProduct.keys()) {
        const productRef = doc(db, PRODUCTS_COLLECTION, productId);
        const snap = await tx.get(productRef);
        if (snap.exists()) {
          const pData = snap.data();
          productSnaps.set(productId, {
            name: String(pData.name ?? ''),
            currentQty: Number(pData.quantityInStock ?? 0),
          });
        }
      }

      tx.update(saleRef, {
        status: 'voided',
        voidedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      for (const [productId, agg] of qtyByProduct.entries()) {
        const live = productSnaps.get(productId);
        if (!live) continue;
        const productRef = doc(db, PRODUCTS_COLLECTION, productId);
        tx.update(productRef, {
          quantityInStock: live.currentQty + agg.quantity,
          updatedAt: serverTimestamp(),
        });

        const movementRef = doc(db, STOCK_MOVEMENTS_COLLECTION, generateDocumentId());
        tx.set(movementRef, {
          ownerId,
          productId,
          productName: live.name || agg.productName,
          type: 'void',
          quantityChange: agg.quantity,
          reason: 'Sale voided',
          saleId,
          createdAt: serverTimestamp(),
        });
      }
    });
  } catch (error) {
    if (error instanceof StockTransactionError) throw error;
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function setProductArchived(productId: string, isArchived: boolean): Promise<void> {
  const path = `${PRODUCTS_COLLECTION}/${productId}`;
  const docRef = doc(db, PRODUCTS_COLLECTION, productId);
  try {
    await updateDoc(docRef, {
      isArchived,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Attempts to upload a compressed JPEG blob to Firebase Storage.
 * If Storage is not provisioned/authorized in this project, throws gracefully so the caller
 * falls back to inline compressed JPEG data URLs (capped at 4 photos per product).
 */
export async function tryUploadProductPhotoToStorage(
  ownerId: string,
  productId: string,
  blob: Blob
): Promise<{ url: string; usedStorage: boolean }> {
  if (!storage) {
    throw new Error('Firebase Storage is not configured.');
  }

  const photoId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const storageRef = ref(storage, `products/${ownerId}/${productId}/${photoId}.jpg`);

  const uploadWithTimeout = Promise.race([
    uploadBytes(storageRef, blob, { contentType: 'image/jpeg' }).then((snap) =>
      getDownloadURL(snap.ref)
    ),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Storage upload timed out')), 4500)
    ),
  ]);

  const url = await uploadWithTimeout;
  return { url, usedStorage: true };
}
