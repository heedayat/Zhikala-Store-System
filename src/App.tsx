import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { RefreshCw, ShieldAlert } from 'lucide-react';
import { auth, googleProvider } from './firebase';
import {
  completeSaleTransaction,
  createProduct,
  createShopUser,
  generateDocumentId,
  recordStockAdjustment,
  saveShopSettings,
  setProductArchived,
  subscribeToAllUsers,
  subscribeToCurrentUserAccess,
  subscribeToProducts,
  subscribeToSales,
  subscribeToShopSettings,
  subscribeToStockMovements,
  updateProduct,
  updateShopUser,
  voidSaleTransaction,
} from './services/inventoryService';
import type {
  AppUser,
  NavSection,
  Product,
  Sale,
  SaleLineItem,
  ShopSettings,
  StockMovement,
  UserRole,
} from './types/inventory';
import { extractUsedCategories, formatActionError } from './utils/formatters';
import type { ValidatedProductPayload } from './utils/productValidation';
import type { ValidatedStockAdjustment } from './utils/stockMovements';
import {
  PREVIEW_DEFAULT_SETTINGS,
  PREVIEW_SEED_MOVEMENTS,
  PREVIEW_SEED_PRODUCTS,
  PREVIEW_SEED_SALES,
  PREVIEW_SEED_USERS,
} from './utils/previewData';
import { DEFAULT_WEEK_START_DAY, normalizeWeekStartDay } from './utils/reports';
import {
  canModifyUserRole,
  canToggleUserActive,
  isAuthorizedUserRecord,
  normalizeEmail,
  validateNewUserForm,
} from './utils/users';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { ProductsView } from './components/ProductsView';
import { SellView } from './components/SellView';
import { StockView } from './components/StockView';
import { ReportsView } from './components/ReportsView';
import { UsersView } from './components/UsersView';
import { ProductFormModal } from './components/ProductFormModal';
import { BarcodeLabelModal } from './components/BarcodeLabelModal';
import { ShopSettingsModal } from './components/ShopSettingsModal';

const PREVIEW_STORAGE_KEY = 'toybox_preview_products_v1';
const PREVIEW_MOVEMENTS_KEY = 'toybox_preview_movements_v1';
const PREVIEW_SALES_KEY = 'toybox_preview_sales_v1';
const PREVIEW_SETTINGS_KEY = 'toybox_preview_settings_v1';
const PREVIEW_USERS_KEY = 'toybox_preview_users_v1';

type AccessState = 'loading' | 'authorized' | 'denied' | 'error';
type PreviewModeVariant = 'admin' | 'owner' | 'denied';

interface PrintableLabelTarget {
  name: string;
  barcode: string;
  sellingPrice: number;
  variantLabel?: string;
}

function isAutostartPreview(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('autostart') === '1';
}

function getPreviewModeVariant(): PreviewModeVariant {
  if (typeof window === 'undefined') return 'admin';
  const params = new URLSearchParams(window.location.search);
  if (params.get('access') === 'denied') return 'denied';
  if (params.get('role') === 'owner') return 'owner';
  return 'admin';
}

function loadPreviewMovements(): StockMovement[] {
  try {
    const saved = localStorage.getItem(PREVIEW_MOVEMENTS_KEY);
    if (!saved) return PREVIEW_SEED_MOVEMENTS;
    const parsed = JSON.parse(saved) as (Omit<StockMovement, 'createdAt'> & {
      createdAt: string;
    })[];
    return parsed.map((m) => ({
      ...m,
      createdAt: new Date(m.createdAt),
    }));
  } catch {
    return PREVIEW_SEED_MOVEMENTS;
  }
}

function loadPreviewSales(): Sale[] {
  try {
    const saved = localStorage.getItem(PREVIEW_SALES_KEY);
    if (!saved) return PREVIEW_SEED_SALES;
    const parsed = JSON.parse(saved) as (Omit<Sale, 'createdAt' | 'updatedAt' | 'voidedAt'> & {
      createdAt: string;
      updatedAt?: string | null;
      voidedAt?: string | null;
    })[];
    return parsed.map((s) => ({
      ...s,
      createdAt: new Date(s.createdAt),
      updatedAt: s.updatedAt ? new Date(s.updatedAt) : null,
      voidedAt: s.voidedAt ? new Date(s.voidedAt) : null,
    }));
  } catch {
    return PREVIEW_SEED_SALES;
  }
}

function loadPreviewUsers(): AppUser[] {
  try {
    const saved = localStorage.getItem(PREVIEW_USERS_KEY);
    if (!saved) return PREVIEW_SEED_USERS;
    const parsed = JSON.parse(saved) as (Omit<AppUser, 'createdAt' | 'updatedAt'> & {
      createdAt?: string | null;
      updatedAt?: string | null;
    })[];
    return parsed.map((u) => ({
      ...u,
      email: normalizeEmail(u.email),
      createdAt: u.createdAt ? new Date(u.createdAt) : null,
      updatedAt: u.updatedAt ? new Date(u.updatedAt) : null,
    }));
  } catch {
    return PREVIEW_SEED_USERS;
  }
}

export default function App() {
  const [previewMode] = useState<boolean>(() => isAutostartPreview());
  const [previewVariant] = useState<PreviewModeVariant>(() => getPreviewModeVariant());
  const [authReady, setAuthReady] = useState<boolean>(previewMode);
  const [user, setUser] = useState<User | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [accessState, setAccessState] = useState<AccessState>(() =>
    previewMode ? (previewVariant === 'denied' ? 'denied' : 'authorized') : 'loading'
  );
  const [accessError, setAccessError] = useState<string | null>(null);
  const [accessCheckTick, setAccessCheckTick] = useState(0);
  const [currentUserRecord, setCurrentUserRecord] = useState<AppUser | null>(() => {
    if (!previewMode || previewVariant === 'denied') return null;
    if (previewVariant === 'owner') {
      return (
        PREVIEW_SEED_USERS.find((u) => u.role === 'owner') ?? {
          email: 'shakarawat007@gmail.com',
          displayName: 'Shakar',
          role: 'owner',
          active: true,
        }
      );
    }
    return (
      PREVIEW_SEED_USERS.find((u) => u.role === 'admin') ?? {
        email: 'gamerhidayatgamer@gmail.com',
        displayName: 'Hidayat',
        role: 'admin',
        active: true,
      }
    );
  });

  const [activeSection, setActiveSection] = useState<NavSection>('products');
  const [products, setProducts] = useState<Product[]>(() => {
    if (!previewMode || previewVariant === 'denied') return [];
    try {
      const saved = localStorage.getItem(PREVIEW_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as Product[]) : PREVIEW_SEED_PRODUCTS;
    } catch {
      return PREVIEW_SEED_PRODUCTS;
    }
  });
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(!previewMode);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [movements, setMovements] = useState<StockMovement[]>(() =>
    previewMode && previewVariant !== 'denied' ? loadPreviewMovements() : []
  );
  const [isLoadingMovements, setIsLoadingMovements] = useState<boolean>(!previewMode);
  const [movementsLoadError, setMovementsLoadError] = useState<string | null>(null);

  const [sales, setSales] = useState<Sale[]>(() =>
    previewMode && previewVariant !== 'denied' ? loadPreviewSales() : []
  );
  const [isLoadingSales, setIsLoadingSales] = useState<boolean>(!previewMode);
  const [salesLoadError, setSalesLoadError] = useState<string | null>(null);

  const [usersList, setUsersList] = useState<AppUser[]>(() =>
    previewMode && previewVariant === 'admin' ? loadPreviewUsers() : []
  );
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(!previewMode);
  const [usersLoadError, setUsersLoadError] = useState<string | null>(null);

  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(() => {
    if (!previewMode || previewVariant === 'denied') return null;
    try {
      const saved = localStorage.getItem(PREVIEW_SETTINGS_KEY);
      return saved ? (JSON.parse(saved) as ShopSettings) : PREVIEW_DEFAULT_SETTINGS;
    } catch {
      return PREVIEW_DEFAULT_SETTINGS;
    }
  });

  // Modal states
  const [formModalState, setFormModalState] = useState<{
    open: boolean;
    editingProduct: Product | null;
    initialBarcode?: string;
  }>({ open: false, editingProduct: null });
  const [labelTarget, setLabelTarget] = useState<PrintableLabelTarget | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const effectiveShopName = shopSettings?.shopName || 'Little Wonders';
  const effectiveCurrency = shopSettings?.currency || 'IQD';
  const effectiveWeekStartDay = normalizeWeekStartDay(
    shopSettings?.weekStartDay ?? DEFAULT_WEEK_START_DAY
  );

  useEffect(() => {
    document.title = `${effectiveShopName} Inventory`;
  }, [effectiveShopName]);

  // Firebase Auth listener
  useEffect(() => {
    if (previewMode) return;
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      setAuthError(null);
      if (!nextUser) {
        setAccessState('loading');
        setCurrentUserRecord(null);
        setAccessError(null);
        setProducts([]);
        setMovements([]);
        setSales([]);
        setUsersList([]);
        setShopSettings(null);
      }
    });
    return () => unsubscribe();
  }, [previewMode]);

  // Firestore allowlist / role listener (`users/{email}`)
  useEffect(() => {
    if (previewMode || !authReady || !user) return;

    if (!user.email || !user.emailVerified) {
      setCurrentUserRecord(null);
      setAccessError(null);
      setAccessState('denied');
      return;
    }

    setAccessState('loading');
    setAccessError(null);

    const unsubscribe = subscribeToCurrentUserAccess(
      user.email,
      (record) => {
        if (!isAuthorizedUserRecord(record)) {
          setCurrentUserRecord(null);
          setAccessState('denied');
          return;
        }
        setCurrentUserRecord(record);
        setAccessError(null);
        setAccessState('authorized');
      },
      () => {
        setCurrentUserRecord(null);
        setAccessError(null);
        setAccessState('denied');
      },
      (err) => {
        setCurrentUserRecord(null);
        setAccessError(formatActionError(err, 'Unable to verify your account access.'));
        setAccessState('error');
      },
      user.displayName
    );

    return () => unsubscribe();
  }, [previewMode, authReady, user, accessCheckTick]);

  const isAuthorized = previewMode
    ? previewVariant !== 'denied'
    : Boolean(user && accessState === 'authorized' && isAuthorizedUserRecord(currentUserRecord));

  const effectiveRole: UserRole = currentUserRecord?.role === 'admin' ? 'admin' : 'owner';

  // Ensure non-admins never stay on the Users section
  useEffect(() => {
    if (activeSection === 'users' && effectiveRole !== 'admin') {
      setActiveSection('products');
    }
  }, [activeSection, effectiveRole]);

  // Shared store collections (attached only after allowlist authorization)
  useEffect(() => {
    if (previewMode || !authReady || !user || !isAuthorized) {
      if (!previewMode) {
        setIsLoadingProducts(false);
        setIsLoadingMovements(false);
        setIsLoadingSales(false);
        setProducts([]);
        setMovements([]);
        setSales([]);
      }
      return;
    }

    setIsLoadingProducts(true);
    setIsLoadingMovements(true);
    setIsLoadingSales(true);
    setLoadError(null);
    setMovementsLoadError(null);
    setSalesLoadError(null);

    const unsubProducts = subscribeToProducts(
      (items) => {
        setProducts(items);
        setIsLoadingProducts(false);
      },
      (err) => {
        setLoadError(formatActionError(err, 'Failed to load products.'));
        setIsLoadingProducts(false);
      }
    );

    const unsubMovements = subscribeToStockMovements(
      (items) => {
        setMovements(items);
        setIsLoadingMovements(false);
      },
      (err) => {
        setMovementsLoadError(formatActionError(err, 'Failed to load stock history.'));
        setIsLoadingMovements(false);
      }
    );

    const unsubSales = subscribeToSales(
      (items) => {
        setSales(items);
        setIsLoadingSales(false);
      },
      (err) => {
        setSalesLoadError(formatActionError(err, 'Failed to load sales history.'));
        setIsLoadingSales(false);
      }
    );

    const unsubSettings = subscribeToShopSettings(
      user.uid,
      (settings) => {
        setShopSettings(settings);
      },
      () => {
        // Non-fatal if settings doc hasn't been created yet
      }
    );

    return () => {
      unsubProducts();
      unsubMovements();
      unsubSales();
      unsubSettings();
    };
  }, [previewMode, authReady, user, isAuthorized]);

  // Users directory subscription (admin only)
  useEffect(() => {
    if (previewMode) {
      setIsLoadingUsers(false);
      if (effectiveRole !== 'admin') {
        setUsersList([]);
      }
      return;
    }

    if (!authReady || !user || !isAuthorized || effectiveRole !== 'admin') {
      setUsersList([]);
      setIsLoadingUsers(false);
      setUsersLoadError(null);
      return;
    }

    setIsLoadingUsers(true);
    setUsersLoadError(null);

    const unsubUsers = subscribeToAllUsers(
      (list) => {
        setUsersList(list);
        setIsLoadingUsers(false);
      },
      (err) => {
        setUsersLoadError(formatActionError(err, 'Failed to load users list.'));
        setIsLoadingUsers(false);
      }
    );

    return () => unsubUsers();
  }, [previewMode, authReady, user, isAuthorized, effectiveRole]);

  const usedCategories = useMemo(() => extractUsedCategories(products), [products]);

  async function handleSignIn() {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      if (!msg.includes('popup-closed-by-user') && !msg.includes('cancelled-popup-request')) {
        setAuthError(formatActionError(err, 'Google sign-in failed.'));
      }
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleSignOut() {
    if (previewMode) return;
    await signOut(auth);
    setProducts([]);
    setMovements([]);
    setSales([]);
    setUsersList([]);
    setShopSettings(null);
    setCurrentUserRecord(null);
    setAccessState('loading');
    setAccessError(null);
    setActiveSection('products');
  }

  function persistPreviewState(
    nextProducts: Product[],
    nextMovements?: StockMovement[],
    nextSales?: Sale[]
  ) {
    try {
      localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(nextProducts));
      if (nextMovements) {
        localStorage.setItem(PREVIEW_MOVEMENTS_KEY, JSON.stringify(nextMovements));
      }
      if (nextSales) {
        localStorage.setItem(PREVIEW_SALES_KEY, JSON.stringify(nextSales));
      }
    } catch {
      // Ignore storage quota issues in preview
    }
  }

  function persistPreviewUsers(nextUsers: AppUser[]) {
    try {
      localStorage.setItem(PREVIEW_USERS_KEY, JSON.stringify(nextUsers));
    } catch {
      // Ignore storage quota issues in preview
    }
  }

  async function handleSaveProduct(
    productId: string,
    payload: ValidatedProductPayload,
    isNew: boolean
  ) {
    if (previewMode) {
      const existing = products.find((p) => p.id === productId);
      const prevQty = existing ? existing.quantityInStock : 0;
      const nextItem: Product = {
        id: productId,
        ownerId: 'preview-owner',
        name: payload.name,
        barcode: payload.barcode,
        category: payload.category,
        sellingPrice: payload.sellingPrice,
        costPrice: payload.costPrice,
        quantityInStock: payload.quantityInStock,
        reorderLevel: payload.reorderLevel,
        photos: payload.photos,
        brand: payload.brand,
        ageRange: payload.ageRange,
        supplier: payload.supplier,
        variantLabel: payload.variantLabel,
        notes: payload.notes,
        isArchived: isNew ? false : (existing?.isArchived ?? false),
      };

      const updatedProducts = isNew
        ? [nextItem, ...products]
        : products.map((p) => (p.id === productId ? nextItem : p));

      let updatedMovements = movements;
      const delta = isNew ? payload.quantityInStock : payload.quantityInStock - prevQty;
      if (delta !== 0) {
        const movement: StockMovement = {
          id: generateDocumentId(),
          ownerId: 'preview-owner',
          productId,
          productName: payload.name,
          type: delta > 0 ? 'add' : 'remove',
          quantityChange: delta,
          reason: isNew ? 'New stock arrived' : 'Correction',
          note: isNew ? 'Initial stock on product creation' : 'Adjusted in product editor',
          costPrice: isNew ? payload.costPrice : null,
          createdAt: new Date(),
        };
        updatedMovements = [movement, ...movements];
        setMovements(updatedMovements);
      }

      setProducts(updatedProducts);
      persistPreviewState(updatedProducts, updatedMovements);
      return;
    }

    if (!user) throw new Error('You must be signed in.');
    if (isNew) {
      await createProduct(user.uid, productId, payload);
    } else {
      await updateProduct(user.uid, productId, payload);
    }
  }

  async function handleRecordStockAdjustment(adjustment: ValidatedStockAdjustment) {
    if (previewMode) {
      const target = products.find((p) => p.id === adjustment.productId);
      if (!target) {
        throw new Error('Selected product could not be found.');
      }
      const nextQty = target.quantityInStock + adjustment.quantityChange;
      if (nextQty < 0) {
        throw new Error(
          `Cannot remove ${Math.abs(adjustment.quantityChange)}; only ${target.quantityInStock} in stock.`
        );
      }

      const updatedProducts = products.map((p) =>
        p.id === adjustment.productId
          ? {
              ...p,
              quantityInStock: nextQty,
              costPrice:
                adjustment.type === 'add' && adjustment.costPrice !== null
                  ? adjustment.costPrice
                  : p.costPrice,
            }
          : p
      );

      const movement: StockMovement = {
        id: generateDocumentId(),
        ownerId: 'preview-owner',
        productId: adjustment.productId,
        productName: target.name,
        type: adjustment.type,
        quantityChange: adjustment.quantityChange,
        reason: adjustment.reason,
        note: adjustment.note,
        costPrice: adjustment.costPrice,
        createdAt: new Date(),
      };
      const updatedMovements = [movement, ...movements];

      setProducts(updatedProducts);
      setMovements(updatedMovements);
      persistPreviewState(updatedProducts, updatedMovements);
      return;
    }

    if (!user) throw new Error('You must be signed in.');
    await recordStockAdjustment(user.uid, adjustment);
  }

  async function handleCompleteSale(lineItems: SaleLineItem[], note: string): Promise<Sale> {
    const cleanNote = note.trim().slice(0, 500);
    const totalAmount = lineItems.reduce((sum, i) => sum + i.lineTotal, 0);
    const totalCost = lineItems.reduce((sum, i) => sum + i.quantity * i.costPrice, 0);
    const itemCount = lineItems.reduce((sum, i) => sum + i.quantity, 0);

    if (previewMode) {
      const saleId = generateDocumentId();
      const now = new Date();
      const qtyByProduct = new Map<string, number>();
      for (const item of lineItems) {
        qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) ?? 0) + item.quantity);
      }

      const updatedProducts = products.map((p) => {
        const soldQty = qtyByProduct.get(p.id);
        return soldQty ? { ...p, quantityInStock: p.quantityInStock - soldQty } : p;
      });

      const newMovements: StockMovement[] = [];
      for (const [productId, soldQty] of qtyByProduct.entries()) {
        const prod = products.find((p) => p.id === productId);
        newMovements.push({
          id: generateDocumentId(),
          ownerId: 'preview-owner',
          productId,
          productName: prod?.name ?? 'Product',
          type: 'sale',
          quantityChange: -soldQty,
          reason: 'Sale',
          note: cleanNote,
          costPrice: null,
          saleId,
          createdAt: now,
        });
      }

      const newSale: Sale = {
        id: saleId,
        ownerId: 'preview-owner',
        items: lineItems,
        totalAmount,
        totalCost,
        itemCount,
        paymentMethod: 'cash',
        note: cleanNote,
        status: 'completed',
        createdAt: now,
        updatedAt: now,
        voidedAt: null,
      };

      const updatedMovements = [...newMovements, ...movements];
      const updatedSales = [newSale, ...sales];
      setProducts(updatedProducts);
      setMovements(updatedMovements);
      setSales(updatedSales);
      persistPreviewState(updatedProducts, updatedMovements, updatedSales);
      return newSale;
    }

    if (!user) throw new Error('You must be signed in.');
    const saleId = await completeSaleTransaction(user.uid, lineItems, cleanNote);
    return {
      id: saleId,
      ownerId: user.uid,
      items: lineItems,
      totalAmount,
      totalCost,
      itemCount,
      paymentMethod: 'cash',
      note: cleanNote,
      status: 'completed',
      createdAt: new Date(),
    };
  }

  async function handleVoidSale(saleId: string): Promise<void> {
    if (previewMode) {
      const targetSale = sales.find((s) => s.id === saleId);
      if (!targetSale || targetSale.status === 'voided') {
        throw new Error('This sale cannot be voided.');
      }

      const now = new Date();
      const qtyByProduct = new Map<string, number>();
      for (const item of targetSale.items) {
        qtyByProduct.set(
          item.productId,
          (qtyByProduct.get(item.productId) ?? 0) + item.quantity
        );
      }

      const updatedProducts = products.map((p) => {
        const restoreQty = qtyByProduct.get(p.id);
        return restoreQty ? { ...p, quantityInStock: p.quantityInStock + restoreQty } : p;
      });

      const restoreMovements: StockMovement[] = [];
      for (const [productId, restoreQty] of qtyByProduct.entries()) {
        const prod = products.find((p) => p.id === productId);
        restoreMovements.push({
          id: generateDocumentId(),
          ownerId: 'preview-owner',
          productId,
          productName: prod?.name ?? 'Product',
          type: 'void',
          quantityChange: restoreQty,
          reason: 'Sale voided',
          note: '',
          costPrice: null,
          saleId,
          createdAt: now,
        });
      }

      const updatedSales = sales.map((s) =>
        s.id === saleId
          ? { ...s, status: 'voided' as const, voidedAt: now, updatedAt: now }
          : s
      );
      const updatedMovements = [...restoreMovements, ...movements];

      setProducts(updatedProducts);
      setMovements(updatedMovements);
      setSales(updatedSales);
      persistPreviewState(updatedProducts, updatedMovements, updatedSales);
      return;
    }

    if (!user) throw new Error('You must be signed in.');
    await voidSaleTransaction(user.uid, saleId);
  }

  async function handleArchiveToggle(productId: string, archive: boolean) {
    if (previewMode) {
      const updated = products.map((p) =>
        p.id === productId ? { ...p, isArchived: archive } : p
      );
      setProducts(updated);
      persistPreviewState(updated);
      return;
    }
    await setProductArchived(productId, archive);
  }

  async function handleSaveSettings(
    nextShopName: string,
    nextCurrency: string,
    nextWeekStartDay: number
  ) {
    const cleanWeekStart = normalizeWeekStartDay(nextWeekStartDay);
    if (previewMode) {
      const updated: ShopSettings = {
        ownerId: 'preview-owner',
        shopName: nextShopName,
        currency: nextCurrency,
        weekStartDay: cleanWeekStart,
      };
      setShopSettings(updated);
      try {
        localStorage.setItem(PREVIEW_SETTINGS_KEY, JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return;
    }
    if (!user) throw new Error('You must be signed in.');
    await saveShopSettings(
      user.uid,
      nextShopName,
      nextCurrency,
      cleanWeekStart,
      shopSettings !== null
    );
  }

  const displayEmail = previewMode
    ? currentUserRecord?.email ?? 'gamerhidayatgamer@gmail.com'
    : currentUserRecord?.email ?? normalizeEmail(user?.email ?? '');

  async function handleAddUser(input: { email: string; displayName: string; role: UserRole }) {
    if (effectiveRole !== 'admin') {
      throw new Error('Only admins can add users.');
    }
    const validation = validateNewUserForm(input, usersList);
    if (!validation.valid) {
      const firstError =
        validation.errors.email ??
        validation.errors.displayName ??
        validation.errors.role ??
        'Invalid user details.';
      throw new Error(firstError);
    }

    if (previewMode) {
      const now = new Date();
      const newUser: AppUser = {
        email: validation.data.email,
        displayName: validation.data.displayName,
        role: validation.data.role,
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      const nextUsers = [...usersList, newUser].sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        if (a.role !== b.role) return a.role === 'admin' ? -1 : 1;
        return a.email.localeCompare(b.email);
      });
      setUsersList(nextUsers);
      persistPreviewUsers(nextUsers);
      return;
    }

    await createShopUser(validation.data);
  }

  async function handleUpdateUser(
    rawEmail: string,
    updates: Partial<Pick<AppUser, 'displayName' | 'role' | 'active'>>
  ) {
    if (effectiveRole !== 'admin') {
      throw new Error('Only admins can modify user access.');
    }

    const emailId = normalizeEmail(rawEmail);
    const targetUser = usersList.find((u) => normalizeEmail(u.email) === emailId);
    if (!targetUser) {
      throw new Error('User record could not be found.');
    }

    if (updates.role !== undefined) {
      const guard = canModifyUserRole(targetUser, updates.role, displayEmail, usersList);
      if (!guard.allowed) {
        throw new Error(guard.reason ?? 'Cannot modify this user role.');
      }
    }

    if (updates.active !== undefined) {
      const guard = canToggleUserActive(targetUser, updates.active, displayEmail, usersList);
      if (!guard.allowed) {
        throw new Error(guard.reason ?? 'Cannot update user status.');
      }
    }

    if (previewMode) {
      const now = new Date();
      const nextUsers = usersList
        .map((u) =>
          normalizeEmail(u.email) === emailId
            ? {
                ...u,
                ...(updates.displayName !== undefined
                  ? { displayName: updates.displayName.trim().slice(0, 80) }
                  : {}),
                ...(updates.role !== undefined ? { role: updates.role } : {}),
                ...(updates.active !== undefined ? { active: updates.active } : {}),
                updatedAt: now,
              }
            : u
        )
        .sort((a, b) => {
          if (a.active !== b.active) return a.active ? -1 : 1;
          if (a.role !== b.role) return a.role === 'admin' ? -1 : 1;
          return a.email.localeCompare(b.email);
        });
      setUsersList(nextUsers);
      persistPreviewUsers(nextUsers);
      return;
    }

    await updateShopUser(emailId, updates);
  }

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-500">Loading workspace...</p>
      </div>
    );
  }

  if (previewMode && previewVariant === 'denied') {
    return (
      <LoginScreen
        shopName={effectiveShopName}
        isSigningIn={false}
        errorMessage={null}
        unauthorizedEmail="visitor@example.com"
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />
    );
  }

  if (!previewMode && !user) {
    return (
      <LoginScreen
        shopName={effectiveShopName}
        isSigningIn={isSigningIn}
        errorMessage={authError}
        unauthorizedEmail={null}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />
    );
  }

  if (!previewMode && user && accessState === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="bg-white border border-slate-200 rounded-xl px-6 py-5 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-900">Checking store access...</p>
          <p className="text-xs font-mono text-slate-500">{user.email}</p>
        </div>
      </div>
    );
  }

  if (!previewMode && user && accessState === 'error') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <main className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-7 space-y-4">
          <div className="flex items-start gap-3 text-red-900">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h1 className="text-base font-bold text-slate-950">Could not verify access</h1>
              <p className="mt-1 text-sm text-slate-600">
                {accessError ?? 'A temporary connection error prevented verifying your account.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setAccessCheckTick((t) => t + 1)}
              className="flex-1 h-10 px-4 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 inline-flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Retry
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="h-10 px-4 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <LoginScreen
        shopName={effectiveShopName}
        isSigningIn={isSigningIn}
        errorMessage={authError}
        unauthorizedEmail={user?.email ?? 'Unknown account'}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />
    );
  }

  const ownerId = previewMode ? 'preview-owner' : user!.uid;
  const resolvedSection: NavSection =
    activeSection === 'users' && effectiveRole !== 'admin' ? 'products' : activeSection;

  return (
    <div className="min-h-screen flex bg-white text-slate-900">
      <Sidebar
        shopName={effectiveShopName}
        currency={effectiveCurrency}
        activeSection={resolvedSection}
        onSelectSection={setActiveSection}
        userEmail={displayEmail}
        userRole={effectiveRole}
        onOpenSettings={() => setSettingsOpen(true)}
        onSignOut={handleSignOut}
      />

      {resolvedSection === 'products' ? (
        <ProductsView
          products={products}
          isLoading={isLoadingProducts}
          loadError={loadError}
          currency={effectiveCurrency}
          onAddProduct={(prefillBarcode) =>
            setFormModalState({
              open: true,
              editingProduct: null,
              initialBarcode: prefillBarcode,
            })
          }
          onEditProduct={(product) =>
            setFormModalState({
              open: true,
              editingProduct: product,
            })
          }
          onPrintLabel={(product) =>
            setLabelTarget({
              name: product.name,
              barcode: product.barcode,
              sellingPrice: product.sellingPrice,
              variantLabel: product.variantLabel,
            })
          }
        />
      ) : resolvedSection === 'sell' ? (
        <SellView
          products={products}
          sales={sales}
          isLoadingSales={isLoadingSales}
          loadError={salesLoadError}
          shopName={effectiveShopName}
          currency={effectiveCurrency}
          onCompleteSale={handleCompleteSale}
          onVoidSale={handleVoidSale}
        />
      ) : resolvedSection === 'stock' ? (
        <StockView
          products={products}
          movements={movements}
          isLoadingMovements={isLoadingMovements}
          loadError={movementsLoadError}
          currency={effectiveCurrency}
          onRecordAdjustment={handleRecordStockAdjustment}
        />
      ) : resolvedSection === 'users' ? (
        <UsersView
          users={usersList}
          isLoading={isLoadingUsers}
          loadError={usersLoadError}
          currentUserEmail={displayEmail}
          onAddUser={handleAddUser}
          onUpdateUser={handleUpdateUser}
        />
      ) : (
        <ReportsView
          products={products}
          sales={sales}
          movements={movements}
          isLoading={isLoadingProducts || isLoadingSales}
          loadError={loadError ?? salesLoadError}
          shopName={effectiveShopName}
          currency={effectiveCurrency}
          weekStartDay={effectiveWeekStartDay}
          onChangeWeekStartDay={(day) =>
            handleSaveSettings(effectiveShopName, effectiveCurrency, day)
          }
          onVoidSale={handleVoidSale}
        />
      )}

      {formModalState.open && (
        <ProductFormModal
          ownerId={ownerId}
          editingProduct={formModalState.editingProduct}
          initialBarcode={formModalState.initialBarcode}
          allProducts={products}
          usedCategories={usedCategories}
          currency={effectiveCurrency}
          isPreviewMode={previewMode}
          onSave={handleSaveProduct}
          onArchiveToggle={handleArchiveToggle}
          onPrintLabel={(preview) => setLabelTarget(preview)}
          onClose={() => setFormModalState({ open: false, editingProduct: null })}
        />
      )}

      {labelTarget && (
        <BarcodeLabelModal
          product={labelTarget}
          shopName={effectiveShopName}
          currency={effectiveCurrency}
          onClose={() => setLabelTarget(null)}
        />
      )}

      {settingsOpen && (
        <ShopSettingsModal
          initialShopName={effectiveShopName}
          initialCurrency={effectiveCurrency}
          initialWeekStartDay={effectiveWeekStartDay}
          products={products}
          sales={sales}
          movements={movements}
          onSave={handleSaveSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
