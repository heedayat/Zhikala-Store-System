import type {
  PaymentMethod,
  StockMovementReason,
  StockMovementType,
  UserRole,
} from '../types/inventory';

export type AppLanguage = 'en' | 'ku';

export const LANGUAGE_STORAGE_KEY = 'toybox_language_v1';

export function normalizeLanguage(raw: unknown): AppLanguage {
  return raw === 'ku' ? 'ku' : 'en';
}

export function loadSavedLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return normalizeLanguage(saved);
  } catch {
    return 'en';
  }
}

export function saveLanguagePreference(lang: AppLanguage): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // Ignore storage failures
  }
}

export interface TranslationDictionary {
  common: {
    cancel: string;
    close: string;
    save: string;
    saving: string;
    working: string;
    clear: string;
    dismiss: string;
    all: string;
    today: string;
    yesterday: string;
    optional: string;
    noBarcode: string;
    inStock: string;
    item: string;
    items: string;
    saleSingular: string;
    salePlural: string;
    retry: string;
    loadingWorkspace: string;
    defaultSubtitle: string;
    currencyIqd: string;
    currencyUsd: string;
    languageLabel: string;
    english: string;
    kurdish: string;
    closeDialogAria: string;
  };
  nav: {
    products: string;
    sell: string;
    stock: string;
    reports: string;
    users: string;
    signOut: string;
    storeSettings: string;
    storeSettingsTooltip: string;
    accountMenu: string;
    mainNavigation: string;
    mobileNavigation: string;
    storeSettingsAndBackup: string;
  };
  roles: {
    admin: string;
    owner: string;
    cashier: string;
    adminOwner: string;
    cashierOptionDesc: string;
    ownerOptionDesc: string;
    adminOptionDesc: string;
  };
  payments: {
    cash: string;
    fib: string;
    card: string;
  };
  weekdays: {
    0: string;
    1: string;
    2: string;
    3: string;
    4: string;
    5: string;
    6: string;
  };
  weekdaysShort: {
    0: string;
    1: string;
    2: string;
    3: string;
    4: string;
    5: string;
    6: string;
  };
  months: {
    0: string;
    1: string;
    2: string;
    3: string;
    4: string;
    5: string;
    6: string;
    7: string;
    8: string;
    9: string;
    10: string;
    11: string;
  };
  monthsShort: {
    0: string;
    1: string;
    2: string;
    3: string;
    4: string;
    5: string;
    6: string;
    7: string;
    8: string;
    9: string;
    10: string;
    11: string;
  };
  stockReasons: {
    'New stock arrived': string;
    'Customer return': string;
    Correction: string;
    Damaged: string;
    Lost: string;
    Other: string;
    Sale: string;
    'Sale voided': string;
  };
  auth: {
    signInPrompt: string;
    signInWithGoogle: string;
    signingIn: string;
    accessDeniedTitle: string;
    accessDeniedSignedInAs: string;
    accessDeniedBody: string;
    switchAccount: string;
    checkingAccess: string;
    verifyErrorTitle: string;
    verifyErrorFallback: string;
    mustBeSignedIn: string;
    unknownAccount: string;
  };
  products: {
    title: string;
    activeLabel: string;
    lowStockLabel: string;
    stockValueLabel: string;
    addProduct: string;
    readOnlyCatalog: string;
    searchPlaceholder: string;
    searchAria: string;
    clearSearch: string;
    allCategories: string;
    filterCategoryAria: string;
    lowStockFilter: string;
    activeTab: string;
    archivedTab: string;
    noMatchingBarcode: string;
    addWithBarcode: string;
    loadError: string;
    loadingAria: string;
    emptyTitle: string;
    emptyReadOnlyBody: string;
    emptyManagerBody: string;
    addFirstProduct: string;
    noMatchesTitle: string;
    noMatchesBody: string;
    clearFilters: string;
    colPhoto: string;
    colProduct: string;
    colBarcode: string;
    colSellingPrice: string;
    colCostPrice: string;
    colStock: string;
    colActions: string;
    outOfStock: string;
    lowStock: string;
    outShort: string;
    lowShort: string;
    printLabelAria: string;
    printLabelTooltip: string;
    labelButton: string;
    editButton: string;
    editAria: string;
    inStockSuffix: string;
    costPrefix: string;
  };
  productForm: {
    editTitle: string;
    addTitle: string;
    archivedBadge: string;
    printLabel: string;
    closeFormAria: string;
    productName: string;
    productNamePlaceholder: string;
    barcode: string;
    barcodePlaceholder: string;
    generateBarcode: string;
    sellingPrice: string;
    costPrice: string;
    quantityInStock: string;
    reorderLevel: string;
    optionalPlaceholder: string;
    category: string;
    categoryPlaceholder: string;
    toggleCategoriesAria: string;
    useNewCategory: string;
    photos: string;
    photosHint: string;
    compressingPhotos: string;
    dragDropPhotos: string;
    selectMultipleHint: string;
    chooseFiles: string;
    mainBadge: string;
    makeMainPhoto: string;
    setMainAria: string;
    removePhoto: string;
    removePhotoAria: string;
    photoAlt: string;
    photoFallbackLabel: string;
    maxPhotosReached: string;
    inlineLimitError: string;
    skippedPhotos: string;
    moreDetails: string;
    filledCount: string;
    brand: string;
    brandPlaceholder: string;
    ageRange: string;
    ageRangePlaceholder: string;
    supplier: string;
    supplierPlaceholder: string;
    variantLabel: string;
    variantPlaceholder: string;
    notes: string;
    notesPlaceholder: string;
    restoreActive: string;
    archiveProduct: string;
    saveChanges: string;
    saveProduct: string;
    archiveConfirmTitle: string;
    archiveConfirmDesc: string;
    archiveConfirmBtn: string;
    keepActiveBtn: string;
    thisProductFallback: string;
  };
  barcodeModal: {
    title: string;
    subtitle: string;
    closeAria: string;
    labelSize: string;
    standardSize: string;
    largeSize: string;
    printLabel: string;
  };
  sell: {
    title: string;
    subtitle: string;
    kbdConfirm: string;
    kbdComplete: string;
    kbdClear: string;
    posTab: string;
    historyTab: string;
    scanPlaceholder: string;
    scanAria: string;
    clearSearchTextAria: string;
    noProductsMatch: string;
    saleCompleted: string;
    printReceipt: string;
    dismissNoticeAria: string;
    quickTapTitle: string;
    viewInCart: string;
    noActiveToys: string;
    addProductsHint: string;
    leftSuffix: string;
    readyTitle: string;
    readySubtitle: string;
    colItem: string;
    colQty: string;
    colUnitPrice: string;
    colLineTotal: string;
    colRemove: string;
    listPrefix: string;
    belowMinCost: string;
    belowCost: string;
    exceedsStock: string;
    goesToPrefix: string;
    decreaseQtyAria: string;
    qtyForAria: string;
    increaseQtyAria: string;
    unitPriceForAria: string;
    removeFromSaleAria: string;
    clearConfirmTitle: string;
    clearConfirmDesc: string;
    keepEditingEsc: string;
    clearSaleBtn: string;
    belowCostCountLabel: string;
    exceedsStockCountLabel: string;
    saleAllowedSuffix: string;
    paymentMethod: string;
    mobilePaymentMethodAria: string;
    saleNote: string;
    saleNotePlaceholder: string;
    totalLabel: string;
    clearEsc: string;
    completeSaleShortcut: string;
    savingSale: string;
    inCartSuffix: string;
    checkout: string;
    todayTotal: string;
    cash: string;
    digital: string;
    salesToday: string;
    voidedExcluded: string;
    todayNotedSales: string;
    noNotedSalesToday: string;
    salesHistory: string;
    filterDateAria: string;
    showAllDatesAria: string;
    loadSalesError: string;
    loadingSalesAria: string;
    noSalesTitle: string;
    noSalesOnDateTitle: string;
    noSalesEmptyHint: string;
    noSalesDateHint: string;
    moreSuffix: string;
    voidedBadge: string;
    mobileCartTitle: string;
    mobileCartSubtitle: string;
    closeCartAria: string;
    emptyCartText: string;
    clearShort: string;
    keepShort: string;
    clearThisSale: string;
    completeSale: string;
    savingShort: string;
    grandTotal: string;
    archivedProductWarning: string;
    noActiveBarcodeMatch: string;
    saleFallbackTitle: string;
    currentCashSaleAria: string;
    todaySummaryAria: string;
    mobileCartAria: string;
  };
  saleDetails: {
    titlePrefix: string;
    voided: string;
    completed: string;
    voidedPrefix: string;
    closeAria: string;
    saleNote: string;
    colItem: string;
    colQty: string;
    colListPrice: string;
    colSoldAt: string;
    colLineTotal: string;
    costPrefix: string;
    soldBelowCost: string;
    totalCostAtSale: string;
    saleTotal: string;
    voidConfirmTitle: string;
    voidConfirmDesc: string;
    confirmVoidBtn: string;
    voiding: string;
    voidSaleBtn: string;
    printReceipt: string;
  };
  receipt: {
    title: string;
    subtitle: string;
    closeAria: string;
    receiptNoPrefix: string;
    voidedSale: string;
    items: string;
    total: string;
    payment: string;
    defaultFooter: string;
    printReceipt: string;
  };
  stock: {
    title: string;
    movementsLogged: string;
    adjustmentAria: string;
    addStock: string;
    removeStock: string;
    stockAfterUpdate: string;
    productLabel: string;
    changeBtn: string;
    changeProductAria: string;
    pickerPlaceholder: string;
    noMatchingProducts: string;
    noActiveMatch: string;
    quantity: string;
    newCost: string;
    reason: string;
    note: string;
    addNotePlaceholder: string;
    removeNotePlaceholder: string;
    recordStockIn: string;
    recordStockOut: string;
    stockHistory: string;
    filterByProductAria: string;
    filterByTypeAria: string;
    allProducts: string;
    allTypes: string;
    typeAddedPlus: string;
    typeRemovedMinus: string;
    typeSaleMinus: string;
    typeVoidPlus: string;
    from: string;
    to: string;
    fromDateAria: string;
    toDateAria: string;
    loadError: string;
    loadingAria: string;
    emptyTitle: string;
    noFilterMatchesTitle: string;
    emptyHint: string;
    filterHint: string;
    colDateTime: string;
    colProduct: string;
    colType: string;
    colReason: string;
    colChange: string;
    colCostPrice: string;
    colNote: string;
    typeSale: string;
    typeVoid: string;
    typeAdded: string;
    typeRemoved: string;
    costPrefix: string;
    newStockLabel: string;
  };
  reports: {
    title: string;
    periodTypeAria: string;
    weekly: string;
    monthly: string;
    previousWeek: string;
    nextWeek: string;
    previousMonth: string;
    nextMonth: string;
    thisWeek: string;
    thisMonth: string;
    weekStarts: string;
    weekStartsAria: string;
    exportCsv: string;
    printReport: string;
    loadError: string;
    loadingAria: string;
    weeklyReportSuffix: string;
    monthlyReportSuffix: string;
    periodPrefix: string;
    weekStartingPrefix: string;
    comparedAgainstPrefix: string;
    printedPrefix: string;
    completedSalesContext: string;
    comparedAgainst: string;
    weekStartsOn: string;
    metricsAria: string;
    totalSales: string;
    cashSalesCount: string;
    fibDigitalCount: string;
    grossProfit: string;
    marginSuffix: string;
    averageSaleValue: string;
    numberOfSales: string;
    itemsSold: string;
    totalDiscountGiven: string;
    vsPrev: string;
    vs: string;
    salesPerDay: string;
    activeSellingDays: string;
    peakDay: string;
    profitPrefix: string;
    noSalesInPeriod: string;
    chartAria: string;
    currentStockValue: string;
    activeToysUnits: string;
    valueAtCost: string;
    valueAtSellingPrice: string;
    potentialRetailMargin: string;
    valuationNote: string;
    top10Title: string;
    shownCount: string;
    noCompletedSales: string;
    colRank: string;
    colProduct: string;
    colQty: string;
    colRevenue: string;
    lowStockTitle: string;
    allAboveReorder: string;
    colStock: string;
    colReorder: string;
    colCostValue: string;
    unsoldTitle: string;
    allSoldHint: string;
    colAtCost: string;
    colAtSelling: string;
    notedSalesTitle: string;
    noNotedSales: string;
    backupAria: string;
    backupTitle: string;
    backupSubtitle: string;
    productsCsv: string;
    salesCsv: string;
    movementsCsv: string;
  };
  users: {
    title: string;
    activeLabel: string;
    managersLabel: string;
    inactiveLabel: string;
    addUser: string;
    searchPlaceholder: string;
    searchAria: string;
    tabAll: string;
    tabActive: string;
    tabInactive: string;
    loadError: string;
    dismissErrorAria: string;
    dismissNoticeAria: string;
    loadingAria: string;
    emptyTitle: string;
    noMatchTitle: string;
    emptyHint: string;
    noMatchHint: string;
    addFirstUser: string;
    resetFilters: string;
    colUser: string;
    colRole: string;
    colStatus: string;
    colAdded: string;
    colActions: string;
    youBadge: string;
    active: string;
    inactive: string;
    deactivate: string;
    reactivate: string;
    cannotChangeOwnRole: string;
    revokeAccessTitle: string;
    roleForAria: string;
    mobileRoleForAria: string;
    addUserTitle: string;
    closeAddModalAria: string;
    googleEmail: string;
    emailHint: string;
    displayName: string;
    displayNamePlaceholder: string;
    role: string;
    adding: string;
    footerNote: string;
    deactivateTitle: string;
    changeRoleTitle: string;
    deactivateDesc: string;
    demoteCashierDesc: string;
    demoteOwnerDesc: string;
    deactivateConfirm: string;
    changeRoleConfirm: string;
    updatedRoleNotice: string;
    reactivatedNotice: string;
    deactivatedNotice: string;
  };
  settings: {
    title: string;
    closeAria: string;
    storeLogoLabel: string;
    storeLogoHint: string;
    resetLogo: string;
    uploadLogoAria: string;
    processingLogo: string;
    uploadPng: string;
    logoUrlPlaceholder: string;
    logoUrlUploadedPlaceholder: string;
    logoUrlAria: string;
    storeName: string;
    storeNamePlaceholder: string;
    storeNameHint: string;
    storeSubtitle: string;
    storeSubtitlePlaceholder: string;
    receiptFooter: string;
    receiptFooterPlaceholder: string;
    currency: string;
    weekStartsOn: string;
    language: string;
    backupTitle: string;
    backupHint: string;
    productsBtn: string;
    salesBtn: string;
    movementsBtn: string;
    saveSettings: string;
    errorNameRequired: string;
    errorLogoInvalid: string;
    errorImageType: string;
    errorLogoProcess: string;
    errorSaveFailed: string;
  };
  validation: {
    productNameRequired: string;
    productNameMax: string;
    barcodeMax: string;
    barcodeDuplicate: string;
    categoryMax: string;
    sellingPriceInvalid: string;
    sellingPriceTooLarge: string;
    costPriceInvalid: string;
    costPriceTooLarge: string;
    stockQtyInvalid: string;
    stockQtyTooLarge: string;
    reorderLevelInvalid: string;
    reorderLevelTooLarge: string;
    brandMax: string;
    ageRangeMax: string;
    supplierMax: string;
    variantMax: string;
    notesMax: string;
    photosMax: string;
    stockProductRequired: string;
    stockQtyInvalidWhole: string;
    stockRemoveExceeds: string;
    stockReasonInvalid: string;
    stockCostInvalid: string;
    stockCostTooLarge: string;
    stockNoteMax: string;
    emailRequired: string;
    emailInvalid: string;
    emailDuplicate: string;
    userNameRequired: string;
    userNameMax: string;
    userRoleInvalid: string;
    cannotDemoteSelfCashier: string;
    cannotRemoveOwnAdmin: string;
    askAnotherAdmin: string;
    lastActiveManagerRole: string;
    lastActiveAdminRole: string;
    cannotDeactivateSelf: string;
    lastActiveManagerDeactivate: string;
    onlyManagersSettings: string;
    onlyManagersAddUsers: string;
    onlyManagersUpdateUsers: string;
  };
}

export const EN_DICTIONARY: TranslationDictionary = {
  common: {
    cancel: 'Cancel',
    close: 'Close',
    save: 'Save',
    saving: 'Saving...',
    working: 'Working...',
    clear: 'Clear',
    dismiss: 'Dismiss',
    all: 'All',
    today: 'Today',
    yesterday: 'Yesterday',
    optional: 'Optional',
    noBarcode: 'No barcode',
    inStock: 'in stock',
    item: 'item',
    items: 'items',
    saleSingular: 'sale',
    salePlural: 'sales',
    retry: 'Retry',
    loadingWorkspace: 'Loading workspace...',
    defaultSubtitle: 'Counter Inventory & Sales System',
    currencyIqd: 'IQD (Iraqi Dinar)',
    currencyUsd: 'USD (US Dollar)',
    languageLabel: 'Language',
    english: 'EN',
    kurdish: 'کوردی',
    closeDialogAria: 'Close confirmation dialog',
  },
  nav: {
    products: 'Products',
    sell: 'Sell',
    stock: 'Stock',
    reports: 'Reports',
    users: 'Users',
    signOut: 'Sign out',
    storeSettings: 'Store settings',
    storeSettingsTooltip: 'Store settings & CSV backups',
    accountMenu: 'Account and store menu',
    mainNavigation: 'Main navigation',
    mobileNavigation: 'Mobile navigation',
    storeSettingsAndBackup: 'Store settings & backup',
  },
  roles: {
    admin: 'Admin',
    owner: 'Owner',
    cashier: 'Cashier',
    adminOwner: 'admin/owner',
    cashierOptionDesc: 'Cashier — Sell POS & read-only Products (no cost/reports)',
    ownerOptionDesc: 'Owner — Full access (Products, Sell, Stock, Reports, Users)',
    adminOptionDesc: 'Admin — Full access (Products, Sell, Stock, Reports, Users)',
  },
  payments: {
    cash: 'Cash',
    fib: 'FIB',
    card: 'FastPay / Card',
  },
  weekdays: {
    0: 'Sunday',
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
  },
  weekdaysShort: {
    0: 'Sun',
    1: 'Mon',
    2: 'Tue',
    3: 'Wed',
    4: 'Thu',
    5: 'Fri',
    6: 'Sat',
  },
  months: {
    0: 'January',
    1: 'February',
    2: 'March',
    3: 'April',
    4: 'May',
    5: 'June',
    6: 'July',
    7: 'August',
    8: 'September',
    9: 'October',
    10: 'November',
    11: 'December',
  },
  monthsShort: {
    0: 'Jan',
    1: 'Feb',
    2: 'Mar',
    3: 'Apr',
    4: 'May',
    5: 'Jun',
    6: 'Jul',
    7: 'Aug',
    8: 'Sep',
    9: 'Oct',
    10: 'Nov',
    11: 'Dec',
  },
  stockReasons: {
    'New stock arrived': 'New stock arrived',
    'Customer return': 'Customer return',
    Correction: 'Correction',
    Damaged: 'Damaged',
    Lost: 'Lost',
    Other: 'Other',
    Sale: 'Sale',
    'Sale voided': 'Sale voided',
  },
  auth: {
    signInPrompt:
      'Sign in with your Google account to manage toy products, print barcode labels, and sync counter stock levels.',
    signInWithGoogle: 'Sign in with Google',
    signingIn: 'Signing in...',
    accessDeniedTitle: 'Access denied, contact the administrator',
    accessDeniedSignedInAs: 'Signed in as',
    accessDeniedBody: 'Your account is not active or does not have permission to access {shopName}.',
    switchAccount: 'Sign out and switch Google account',
    checkingAccess: 'Checking store access...',
    verifyErrorTitle: 'Could not verify access',
    verifyErrorFallback: 'A temporary connection error prevented verifying your account.',
    mustBeSignedIn: 'You must be signed in.',
    unknownAccount: 'Unknown account',
  },
  products: {
    title: 'Products',
    activeLabel: 'active',
    lowStockLabel: 'low stock',
    stockValueLabel: 'Stock value:',
    addProduct: 'Add Product',
    readOnlyCatalog: 'Read-only catalog',
    searchPlaceholder: 'Search name or scan barcode + Enter...',
    searchAria: 'Search by name or scan barcode',
    clearSearch: 'Clear search',
    allCategories: 'All categories',
    filterCategoryAria: 'Filter by category',
    lowStockFilter: 'Low stock',
    activeTab: 'Active',
    archivedTab: 'Archived',
    noMatchingBarcode: 'No product matched barcode',
    addWithBarcode: 'Add product with this barcode',
    loadError: 'Could not load products:',
    loadingAria: 'Loading products',
    emptyTitle: 'No products yet',
    emptyReadOnlyBody: 'Ask an Admin or Owner to add products to the catalog.',
    emptyManagerBody: 'Add your first toy with its selling price, cost, stock count, and optional barcode.',
    addFirstProduct: 'Add first product',
    noMatchesTitle: 'No matching products',
    noMatchesBody: 'Try clearing your search or adjusting the category and stock filters.',
    clearFilters: 'Clear filters',
    colPhoto: 'Photo',
    colProduct: 'Product',
    colBarcode: 'Barcode',
    colSellingPrice: 'Selling Price',
    colCostPrice: 'Cost Price',
    colStock: 'Stock',
    colActions: 'Actions',
    outOfStock: 'Out of stock',
    lowStock: 'Low stock',
    outShort: 'Out',
    lowShort: 'Low',
    printLabelAria: 'Print barcode label for {name}',
    printLabelTooltip: 'Print barcode label',
    labelButton: 'Label',
    editButton: 'Edit',
    editAria: 'Edit {name}',
    inStockSuffix: 'in stock',
    costPrefix: 'Cost:',
  },
  productForm: {
    editTitle: 'Edit Product',
    addTitle: 'Add Product',
    archivedBadge: 'Archived',
    printLabel: 'Print label',
    closeFormAria: 'Close product form',
    productName: 'Product name',
    productNamePlaceholder: 'e.g. Wooden Express Train Set',
    barcode: 'Barcode',
    barcodePlaceholder: 'Scan barcode or click Generate',
    generateBarcode: 'Generate barcode',
    sellingPrice: 'Selling price',
    costPrice: 'Cost price',
    quantityInStock: 'Quantity in stock',
    reorderLevel: 'Reorder level',
    optionalPlaceholder: 'Optional',
    category: 'Category',
    categoryPlaceholder: 'Type or choose a category (e.g. Action Figures)',
    toggleCategoriesAria: 'Toggle category suggestions',
    useNewCategory: 'Use “{value}”',
    photos: 'Photos',
    photosHint: 'Compressed ~800px JPEG · {count}/{max} photos',
    compressingPhotos: 'Compressing and preparing photos...',
    dragDropPhotos: 'Drag and drop product photos here',
    selectMultipleHint: 'Select multiple files from your laptop at once',
    chooseFiles: 'Choose files',
    mainBadge: 'Main',
    makeMainPhoto: 'Make main photo',
    setMainAria: 'Set photo {index} as main',
    removePhoto: 'Remove photo',
    removePhotoAria: 'Remove photo {index}',
    photoAlt: 'Product photo {index}',
    photoFallbackLabel: 'Photo {index}',
    maxPhotosReached: 'Maximum {max} photos reached for this product.',
    inlineLimitError: 'Compressed storage is limited to {max} photos per product.',
    skippedPhotos: 'Added {added} photo(s). {skipped} skipped due to the {max}-photo limit.',
    moreDetails: 'More details',
    filledCount: '({count} filled)',
    brand: 'Brand',
    brandPlaceholder: 'e.g. LEGO, Mattel',
    ageRange: 'Age range',
    ageRangePlaceholder: 'e.g. 3-6 years',
    supplier: 'Supplier',
    supplierPlaceholder: 'e.g. Baghdad Toy Wholesale',
    variantLabel: 'Variant label',
    variantPlaceholder: 'e.g. Blue, Large Box',
    notes: 'Notes',
    notesPlaceholder: 'Battery requirements, shelf spot, or wholesale notes...',
    restoreActive: 'Restore to active',
    archiveProduct: 'Archive product',
    saveChanges: 'Save changes',
    saveProduct: 'Save product',
    archiveConfirmTitle: 'Archive this product?',
    archiveConfirmDesc:
      '"{name}" will be hidden from active inventory and the Sell screen. Historical sales and stock movements will remain intact, and you can restore it anytime from the Archived tab.',
    archiveConfirmBtn: 'Archive product',
    keepActiveBtn: 'Keep active',
    thisProductFallback: 'This product',
  },
  barcodeModal: {
    title: 'Print Barcode Label',
    subtitle: 'Ready for thermal label printers or standard A4 sheets',
    closeAria: 'Close label preview',
    labelSize: 'Label size',
    standardSize: 'Standard (50×30mm)',
    largeSize: 'Large (70×40mm)',
    printLabel: 'Print label',
  },
  sell: {
    title: 'Sell',
    subtitle: 'Counter POS · Barcode & keyboard ready',
    kbdConfirm: 'Confirm edit',
    kbdComplete: 'Complete sale',
    kbdClear: 'Clear',
    posTab: 'POS Register',
    historyTab: 'History & Today',
    scanPlaceholder: 'Scan barcode or type toy name to add...',
    scanAria: 'Scan barcode or search product to add',
    clearSearchTextAria: 'Clear search text',
    noProductsMatch: 'No active products match “{query}”.',
    saleCompleted: 'Sale completed',
    printReceipt: 'Print receipt',
    dismissNoticeAria: 'Dismiss completed sale notice',
    quickTapTitle: 'Quick-Tap Toys',
    viewInCart: 'View {count} in cart',
    noActiveToys: 'No active toys yet',
    addProductsHint: 'Add products in the Products tab to start selling.',
    leftSuffix: 'left',
    readyTitle: 'Ready for next customer',
    readySubtitle:
      "Scan a toy's barcode with the USB scanner or type its name above to start a sale. Scan again to add another unit.",
    colItem: 'Item',
    colQty: 'Qty',
    colUnitPrice: 'Unit Price',
    colLineTotal: 'Line Total',
    colRemove: 'Remove',
    listPrefix: 'List',
    belowMinCost: 'Below minimum cost',
    belowCost: 'Below cost ({cost})',
    exceedsStock: 'Exceeds stock',
    goesToPrefix: 'goes to {qty}',
    decreaseQtyAria: 'Decrease quantity of {name}',
    qtyForAria: 'Quantity for {name}',
    increaseQtyAria: 'Increase quantity of {name}',
    unitPriceForAria: 'Unit price for {name}',
    removeFromSaleAria: 'Remove {name} from sale',
    clearConfirmTitle: 'Clear current sale?',
    clearConfirmDesc: 'This removes all {count} item(s) and clears the note.',
    keepEditingEsc: 'Keep editing (Esc)',
    clearSaleBtn: 'Clear sale',
    belowCostCountLabel: '{count} item(s) priced below cost',
    exceedsStockCountLabel: '{count} item(s) exceeding stock (stock will go negative)',
    saleAllowedSuffix: '. Sale is still allowed.',
    paymentMethod: 'Payment method',
    mobilePaymentMethodAria: 'Mobile payment method',
    saleNote: 'Sale note (optional)',
    saleNotePlaceholder: 'e.g. Gift wrap, customer phone...',
    totalLabel: 'Total',
    clearEsc: 'Clear (Esc)',
    completeSaleShortcut: 'Complete sale (Ctrl+Enter)',
    savingSale: 'Saving sale...',
    inCartSuffix: 'in cart',
    checkout: 'Checkout',
    todayTotal: "Today's Total",
    cash: 'Cash',
    digital: 'FIB / Digital',
    salesToday: 'Sales Today',
    voidedExcluded: 'voided excluded',
    todayNotedSales: "Today's Sales with Notes",
    noNotedSalesToday: 'No noted sales today. Add a note during checkout to track it here.',
    salesHistory: 'Sales History',
    filterDateAria: 'Filter sales history by date',
    showAllDatesAria: 'Show all dates',
    loadSalesError: 'Could not load sales:',
    loadingSalesAria: 'Loading sales history',
    noSalesTitle: 'No sales recorded yet',
    noSalesOnDateTitle: 'No sales on this date',
    noSalesEmptyHint: 'Completed sales will appear here for receipt printing and voiding.',
    noSalesDateHint: 'Clear the date filter to view sales from other days.',
    moreSuffix: '+{count} more',
    voidedBadge: 'Voided',
    mobileCartTitle: 'Current Sale',
    mobileCartSubtitle: 'Adjust quantity or bargain unit price',
    closeCartAria: 'Close cart drawer',
    emptyCartText: 'Cart is empty. Tap a product card to add it.',
    clearShort: 'Clear',
    keepShort: 'Keep',
    clearThisSale: 'Clear this sale?',
    completeSale: 'Complete sale',
    savingShort: 'Saving...',
    grandTotal: 'Grand Total',
    archivedProductWarning: '"{name}" is archived. Unarchive it in Products before selling.',
    noActiveBarcodeMatch: 'No active product matched "{query}".',
    saleFallbackTitle: 'Sale',
    currentCashSaleAria: 'Current cash sale',
    todaySummaryAria: "Today's summary and sales history",
    mobileCartAria: 'Current cart and checkout',
  },
  saleDetails: {
    titlePrefix: 'Sale',
    voided: 'Voided',
    completed: 'Completed',
    voidedPrefix: 'Voided',
    closeAria: 'Close sale details',
    saleNote: 'Sale note',
    colItem: 'Item',
    colQty: 'Qty',
    colListPrice: 'List Price',
    colSoldAt: 'Sold At',
    colLineTotal: 'Line Total',
    costPrefix: 'Cost:',
    soldBelowCost: '· Sold below cost',
    totalCostAtSale: 'Total cost at sale:',
    saleTotal: 'Sale total',
    voidConfirmTitle: 'Void this sale and restore stock?',
    voidConfirmDesc:
      'This marks Sale #{ref} as voided (kept in history) and adds {count} back into inventory via stock movement records.',
    confirmVoidBtn: 'Confirm void & restore stock',
    voiding: 'Voiding sale...',
    voidSaleBtn: 'Void sale',
    printReceipt: 'Print receipt',
  },
  receipt: {
    title: 'Printable Receipt',
    subtitle: '80mm thermal or standard printer friendly',
    closeAria: 'Close receipt preview',
    receiptNoPrefix: 'Receipt',
    voidedSale: 'VOIDED SALE',
    items: 'Items',
    total: 'TOTAL',
    payment: 'Payment',
    defaultFooter: 'Thank you for shopping at {shopName}!',
    printReceipt: 'Print receipt',
  },
  stock: {
    title: 'Stock',
    movementsLogged: 'movements logged',
    adjustmentAria: 'Stock adjustment',
    addStock: 'Add stock',
    removeStock: 'Remove stock',
    stockAfterUpdate: 'Stock after update:',
    productLabel: 'Product',
    changeBtn: 'Change',
    changeProductAria: 'Change selected product',
    pickerPlaceholder: 'Search product name or scan barcode + Enter...',
    noMatchingProducts: 'No active products match “{query}”.',
    noActiveMatch: 'No active product matched "{query}".',
    quantity: 'Quantity',
    newCost: 'New cost',
    reason: 'Reason',
    note: 'Note',
    addNotePlaceholder: 'Optional supplier invoice or shipment note...',
    removeNotePlaceholder: 'Optional note (e.g. broken wheel on display)...',
    recordStockIn: 'Record stock in',
    recordStockOut: 'Record stock out',
    stockHistory: 'Stock History',
    filterByProductAria: 'Filter history by product',
    filterByTypeAria: 'Filter history by type',
    allProducts: 'All products',
    allTypes: 'All types',
    typeAddedPlus: 'Added (+)',
    typeRemovedMinus: 'Removed (-)',
    typeSaleMinus: 'Sale (-)',
    typeVoidPlus: 'Sale voided (+)',
    from: 'From',
    to: 'To',
    fromDateAria: 'From date',
    toDateAria: 'To date',
    loadError: 'Could not load stock movements:',
    loadingAria: 'Loading stock history',
    emptyTitle: 'No stock movements yet',
    noFilterMatchesTitle: 'No movements match these filters',
    emptyHint:
      'Every stock addition or removal you record above will appear here with date, reason, and quantity.',
    filterHint: 'Try adjusting the product, type, or date range filters.',
    colDateTime: 'Date & Time',
    colProduct: 'Product',
    colType: 'Type',
    colReason: 'Reason',
    colChange: 'Change',
    colCostPrice: 'Cost Price',
    colNote: 'Note',
    typeSale: 'Sale',
    typeVoid: 'Voided sale',
    typeAdded: 'Added',
    typeRemoved: 'Removed',
    costPrefix: 'Cost',
    newStockLabel: 'New stock:',
  },
  reports: {
    title: 'Reports',
    periodTypeAria: 'Report period type',
    weekly: 'Weekly',
    monthly: 'Monthly',
    previousWeek: 'Previous week',
    nextWeek: 'Next week',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    thisWeek: 'This week',
    thisMonth: 'This month',
    weekStarts: 'Week starts',
    weekStartsAria: 'Week starts on',
    exportCsv: 'Export CSV',
    printReport: 'Print report',
    loadError: 'Could not load report data:',
    loadingAria: 'Loading reports',
    weeklyReportSuffix: 'Weekly Report',
    monthlyReportSuffix: 'Monthly Report',
    periodPrefix: 'Period:',
    weekStartingPrefix: 'Week starting',
    comparedAgainstPrefix: 'Compared against',
    printedPrefix: 'Printed',
    completedSalesContext: 'Showing completed sales (voided sales excluded) · Compared against',
    comparedAgainst: 'Compared against',
    weekStartsOn: 'Week starts on',
    metricsAria: 'Period performance metrics',
    totalSales: 'Total Sales',
    cashSalesCount: 'Cash Sales',
    fibDigitalCount: 'FIB / Digital',
    grossProfit: 'Gross Profit',
    marginSuffix: 'margin',
    averageSaleValue: 'Average Sale Value',
    numberOfSales: 'Number of Sales',
    itemsSold: 'Items Sold',
    totalDiscountGiven: 'Total Discount Given',
    vsPrev: 'vs prev:',
    vs: 'vs',
    salesPerDay: 'Sales per Day',
    activeSellingDays: '{count} active selling day(s) in this period',
    peakDay: 'Peak day:',
    profitPrefix: 'Profit',
    noSalesInPeriod: 'No sales recorded in period',
    chartAria: 'Bar chart of daily sales for the selected {period} period',
    currentStockValue: 'Current Stock Value',
    activeToysUnits: 'Across {products} active toys · {units} units on hand',
    valueAtCost: 'Value at Cost',
    valueAtSellingPrice: 'Value at Selling Price',
    potentialRetailMargin: 'Potential Retail Margin',
    valuationNote: 'Archived products and negative oversold units are excluded from valuation.',
    top10Title: 'Top 10 Best-Selling Products',
    shownCount: '{count} shown',
    noCompletedSales: 'No completed sales in this period.',
    colRank: '#',
    colProduct: 'Product',
    colQty: 'Qty',
    colRevenue: 'Revenue',
    lowStockTitle: 'Current Low-Stock List',
    allAboveReorder: 'All active products are above their reorder levels.',
    colStock: 'Stock',
    colReorder: 'Reorder',
    colCostValue: 'Cost Value',
    unsoldTitle: 'In Stock With No Sales in Period',
    allSoldHint: 'Every in-stock product recorded at least one sale in this period.',
    colAtCost: 'At Cost',
    colAtSelling: 'At Selling',
    notedSalesTitle: 'Sales With Notes in Period',
    noNotedSales: 'No noted sales recorded in this period.',
    backupAria: 'Full store backup exports',
    backupTitle: 'Full Store Backup (CSV)',
    backupSubtitle:
      'Export complete catalog, sales history, and stock movement records for offline backup.',
    productsCsv: 'Products CSV',
    salesCsv: 'Sales CSV',
    movementsCsv: 'Stock Movements CSV',
  },
  users: {
    title: 'Users',
    activeLabel: 'active',
    managersLabel: 'admin/owner',
    inactiveLabel: 'inactive',
    addUser: 'Add User',
    searchPlaceholder: 'Search by name or email...',
    searchAria: 'Search users by name or email',
    tabAll: 'All',
    tabActive: 'Active',
    tabInactive: 'Inactive',
    loadError: 'Could not load users:',
    dismissErrorAria: 'Dismiss error',
    dismissNoticeAria: 'Dismiss notice',
    loadingAria: 'Loading users',
    emptyTitle: 'No users configured yet',
    noMatchTitle: 'No matching users',
    emptyHint: 'Add an authorized Google account to grant access to the shop.',
    noMatchHint: 'Try clearing the search query or switching the status filter.',
    addFirstUser: 'Add first user',
    resetFilters: 'Reset filters',
    colUser: 'User',
    colRole: 'Role',
    colStatus: 'Status',
    colAdded: 'Added',
    colActions: 'Actions',
    youBadge: '· You',
    active: 'Active',
    inactive: 'Inactive',
    deactivate: 'Deactivate',
    reactivate: 'Reactivate',
    cannotChangeOwnRole: 'You cannot change your own role.',
    revokeAccessTitle: 'Revoke store access for this user',
    roleForAria: 'Role for {email}',
    mobileRoleForAria: 'Mobile role for {email}',
    addUserTitle: 'Add User',
    closeAddModalAria: 'Close add user modal',
    googleEmail: 'Google email address',
    emailHint: 'Stored lowercase as their Google Sign-In allowlist key.',
    displayName: 'Display name',
    displayNamePlaceholder: 'e.g. Shakar',
    role: 'Role',
    adding: 'Adding...',
    footerNote:
      'Admin and Owner accounts have full access to Products, Sell, Stock, Reports, CSV Backups, Store Settings, and Users. Cashiers only see Sell and a read-only Products view (without cost prices or stock values). Self-demotion and deactivating the last active Admin or Owner are blocked.',
    deactivateTitle: 'Deactivate user account?',
    changeRoleTitle: 'Change role to {role}?',
    deactivateDesc:
      '{name} ({email}) will immediately lose access to the store and see an access denied screen.',
    demoteCashierDesc:
      '{name} ({email}) will become a Cashier and only have access to the Sell screen and a read-only Products list.',
    demoteOwnerDesc:
      '{name} ({email}) will change from Admin to Owner while keeping full store management access.',
    deactivateConfirm: 'Deactivate user',
    changeRoleConfirm: 'Change to {role}',
    updatedRoleNotice: '{name} updated to {role}.',
    reactivatedNotice: '{name} reactivated.',
    deactivatedNotice: '{name} deactivated.',
  },
  settings: {
    title: 'Store Settings & Backup',
    closeAria: 'Close store settings',
    storeLogoLabel: 'Store Logo (PNG)',
    storeLogoHint: 'Shown at 36×36px on login, header, sidebar & receipts',
    resetLogo: 'Reset',
    uploadLogoAria: 'Upload store logo PNG',
    processingLogo: 'Processing...',
    uploadPng: 'Upload PNG',
    logoUrlPlaceholder: '/logo.png or https://...',
    logoUrlUploadedPlaceholder: 'Custom PNG uploaded (or paste URL to replace)',
    logoUrlAria: 'Store logo image URL',
    storeName: 'Store name',
    storeNamePlaceholder: 'e.g. Little Wonders',
    storeNameHint: 'Shown on the login screen, sidebar, barcode labels, receipts, and reports.',
    storeSubtitle: 'Store subtitle',
    storeSubtitlePlaceholder: 'e.g. Counter Inventory & Sales System',
    receiptFooter: 'Receipt footer note / phone number',
    receiptFooterPlaceholder: 'e.g. Tel: 0750 123 4567 · Thank you for shopping with us!',
    currency: 'Currency',
    weekStartsOn: 'Week starts on',
    language: 'Display language',
    backupTitle: 'Full Store Backup (CSV)',
    backupHint: 'Download complete records for offline safekeeping or spreadsheet review.',
    productsBtn: 'Products',
    salesBtn: 'Sales',
    movementsBtn: 'Movements',
    saveSettings: 'Save settings',
    errorNameRequired: 'Store name is required.',
    errorLogoInvalid: 'Logo URL must start with https://, http://, /logo.png, or be an uploaded PNG.',
    errorImageType: 'Please select a PNG or image file for the store logo.',
    errorLogoProcess: 'Could not process logo image.',
    errorSaveFailed: 'Failed to save store settings.',
  },
  validation: {
    productNameRequired: 'Product name is required.',
    productNameMax: 'Product name must be 160 characters or fewer.',
    barcodeMax: 'Barcode must be 64 characters or fewer.',
    barcodeDuplicate: 'Barcode "{barcode}" is already used by "{name}".',
    categoryMax: 'Category must be 80 characters or fewer.',
    sellingPriceInvalid: 'Enter a valid selling price (0 or higher).',
    sellingPriceTooLarge: 'Selling price is too large.',
    costPriceInvalid: 'Enter a valid cost price (0 or higher).',
    costPriceTooLarge: 'Cost price is too large.',
    stockQtyInvalid: 'Enter a whole number (0 or higher).',
    stockQtyTooLarge: 'Stock quantity is too large.',
    reorderLevelInvalid: 'Reorder level must be a whole number (0 or higher).',
    reorderLevelTooLarge: 'Reorder level is too large.',
    brandMax: 'Brand must be 80 characters or fewer.',
    ageRangeMax: 'Age range must be 40 characters or fewer.',
    supplierMax: 'Supplier must be 100 characters or fewer.',
    variantMax: 'Variant label must be 60 characters or fewer.',
    notesMax: 'Notes must be 1000 characters or fewer.',
    photosMax: 'Maximum 8 photos allowed per product.',
    stockProductRequired: 'Select a product by searching or scanning its barcode.',
    stockQtyInvalidWhole: 'Enter a whole quantity of 1 or more.',
    stockRemoveExceeds: 'Cannot remove {requested}; only {available} in stock.',
    stockReasonInvalid: 'Choose a valid reason.',
    stockCostInvalid: 'Enter a valid cost price (0 or higher).',
    stockCostTooLarge: 'Cost price is too large.',
    stockNoteMax: 'Note must be 500 characters or fewer.',
    emailRequired: 'Google email address is required.',
    emailInvalid: 'Enter a valid email address (for example, name@gmail.com).',
    emailDuplicate: 'A user with this email address already exists.',
    userNameRequired: 'Name is required.',
    userNameMax: 'Name must be 80 characters or fewer.',
    userRoleInvalid: 'Choose Admin, Owner, or Cashier.',
    cannotDemoteSelfCashier: 'You cannot demote yourself to Cashier.',
    cannotRemoveOwnAdmin: 'You cannot remove your own Admin access.',
    askAnotherAdmin: 'Ask another Admin to change your own role.',
    lastActiveManagerRole: 'At least one active Admin or Owner must remain.',
    lastActiveAdminRole: 'At least one active Admin must remain.',
    cannotDeactivateSelf: 'You cannot deactivate your own account.',
    lastActiveManagerDeactivate: 'Cannot deactivate the last active Admin or Owner.',
    onlyManagersSettings: 'Only Admin or Owner accounts can update store settings.',
    onlyManagersAddUsers: 'Only Admin or Owner accounts can add users.',
    onlyManagersUpdateUsers: 'Only Admin or Owner accounts can modify user access.',
  },
};

export const KU_DICTIONARY: TranslationDictionary = {
  common: {
    cancel: 'پاشگەزبوونەوە',
    close: 'داخستن',
    save: 'پاشەکەوتکردن',
    saving: 'پاشەکەوت دەکرێت...',
    working: 'جێبەجێ دەکرێت...',
    clear: 'سڕینەوە',
    dismiss: 'لابردن',
    all: 'هەموو',
    today: 'ئەمڕۆ',
    yesterday: 'دوێنێ',
    optional: 'ئارەزوومەندانە',
    noBarcode: 'بێ باڕکۆد',
    inStock: 'لە کۆگادا',
    item: 'دانە',
    items: 'دانە',
    saleSingular: 'فرۆشتن',
    salePlural: 'فرۆشتن',
    retry: 'هەوڵدانەوە',
    loadingWorkspace: 'بارکردنی سیستەم...',
    defaultSubtitle: 'سیستەمی بەڕێوەبردنی کۆگا و فرۆشتن',
    currencyIqd: 'دیناری عێراقی (IQD)',
    currencyUsd: 'دۆلاری ئەمریکی (USD)',
    languageLabel: 'زمان',
    english: 'EN',
    kurdish: 'کوردی',
    closeDialogAria: 'داخستنی پەنجەرەی دڵنیابوونەوە',
  },
  nav: {
    products: 'کاڵاکان',
    sell: 'فرۆشتن',
    stock: 'کۆگا',
    reports: 'ڕاپۆرتەکان',
    users: 'بەکارهێنەران',
    signOut: 'چوونەدەرەوە',
    storeSettings: 'ڕێکخستنەکانی فرۆشگا',
    storeSettingsTooltip: 'ڕێکخستنەکانی فرۆشگا و پاشەکەوتی CSV',
    accountMenu: 'لیستی هەژمار و فرۆشگا',
    mainNavigation: 'پێڕستی سەرەکی',
    mobileNavigation: 'پێڕستی مۆبایل',
    storeSettingsAndBackup: 'ڕێکخستنەکانی فرۆشگا و باکاپ',
  },
  roles: {
    admin: 'بەڕێوەبەر',
    owner: 'خاوەن',
    cashier: 'کاشێر',
    adminOwner: 'بەڕێوەبەر / خاوەن',
    cashierOptionDesc: 'کاشێر — تەنها فرۆشتن و بینینی کاڵاکان (بێ نرخی کڕین و ڕاپۆرت)',
    ownerOptionDesc: 'خاوەن — دەسەڵاتی تەواو (کاڵاکان، فرۆشتن، کۆگا، ڕاپۆرتەکان، بەکارهێنەران)',
    adminOptionDesc: 'بەڕێوەبەر — دەسەڵاتی تەواو (کاڵاکان، فرۆشتن، کۆگا، ڕاپۆرتەکان، بەکارهێنەران)',
  },
  payments: {
    cash: 'کاش',
    fib: 'FIB / دیجیتاڵ',
    card: 'FastPay / کارت',
  },
  weekdays: {
    0: 'یەکشەممە',
    1: 'دووشەممە',
    2: 'سێشەممە',
    3: 'چوارشەممە',
    4: 'پێنجشەممە',
    5: 'هەینی',
    6: 'شەممە',
  },
  weekdaysShort: {
    0: 'یەکشەممە',
    1: 'دووشەممە',
    2: 'سێشەممە',
    3: 'چوارشەممە',
    4: 'پێنجشەممە',
    5: 'هەینی',
    6: 'شەممە',
  },
  months: {
    0: 'کانوونی دووەم',
    1: 'شوبات',
    2: 'ئازار',
    3: 'نیسان',
    4: 'ئایار',
    5: 'حوزەیران',
    6: 'تەمموز',
    7: 'ئاب',
    8: 'ئەیلوول',
    9: 'تشرینی یەکەم',
    10: 'تشرینی دووەم',
    11: 'کانوونی یەکەم',
  },
  monthsShort: {
    0: 'کانوونی ٢',
    1: 'شوبات',
    2: 'ئازار',
    3: 'نیسان',
    4: 'ئایار',
    5: 'حوزەیران',
    6: 'تەمموز',
    7: 'ئاب',
    8: 'ئەیلوول',
    9: 'تشرینی ١',
    10: 'تشرینی ٢',
    11: 'کانوونی ١',
  },
  stockReasons: {
    'New stock arrived': 'بارێکی نوێ گەیشت',
    'Customer return': 'گەڕانەوەی کڕیار',
    Correction: 'ڕاستکردنەوە',
    Damaged: 'تێکچووە / شکاوە',
    Lost: 'ونبووە',
    Other: 'هی تر',
    Sale: 'فرۆشتن',
    'Sale voided': 'فرۆشتن هەڵوەشایەوە',
  },
  auth: {
    signInPrompt:
      'بە هەژماری گووگڵەکەت بچۆ ژوورەوە بۆ بەڕێوەبردنی کاڵاکان، چاپکردنی باڕکۆد و چاودێریکردنی کۆگا.',
    signInWithGoogle: 'چوونەژوورەوە لەگەڵ گووگڵ',
    signingIn: 'چوونەژوورەوە...',
    accessDeniedTitle: 'ڕێگەپێدان نییە، پەیوەندی بە بەڕێوەبەرەوە بکە',
    accessDeniedSignedInAs: 'چوونەژوورەوە وەک',
    accessDeniedBody: 'هەژمارەکەت چالاک نییە یان مۆڵەتی چوونەژوورەوەی بۆ {shopName} نییە.',
    switchAccount: 'چوونەدەرەوە و گۆڕینی هەژماری گووگڵ',
    checkingAccess: 'دڵنیابوونەوە لە مۆڵەتی فرۆشگا...',
    verifyErrorTitle: 'نەتوانرا مۆڵەت پشتڕاست بکرێتەوە',
    verifyErrorFallback: 'هەڵەیەکی کاتی لە پەیوەندیدا ڕێگری کرد لە دڵنیابوونەوەی هەژمارەکەت.',
    mustBeSignedIn: 'پێویستە چووبیتە ژوورەوە.',
    unknownAccount: 'هەژماری نەناسراو',
  },
  products: {
    title: 'کاڵاکان',
    activeLabel: 'چالاک',
    lowStockLabel: 'کەمبوونەوەی کۆگا',
    stockValueLabel: 'بەهای کۆگا:',
    addProduct: 'زیادکردنی کاڵا',
    readOnlyCatalog: 'تەنها بۆ خوێندنەوە',
    searchPlaceholder: 'گەڕان بە ناو یان لێدانی باڕکۆد + Enter...',
    searchAria: 'گەڕان بە ناو یان باڕکۆد',
    clearSearch: 'سڕینەوەی گەڕان',
    allCategories: 'هەموو پۆلەکان',
    filterCategoryAria: 'فلتەرکردن بەپێی پۆل',
    lowStockFilter: 'کەمبوونەوەی کۆگا',
    activeTab: 'چالاکەکان',
    archivedTab: 'ئەرشیفکراوەکان',
    noMatchingBarcode: 'هیچ کاڵایەک بەم باڕکۆدە نەدۆزرایەوە:',
    addWithBarcode: 'زیادکردنی کاڵا بەم باڕکۆدە',
    loadError: 'نەتوانرا کاڵاکان باربکرێن:',
    loadingAria: 'بارکردنی کاڵاکان',
    emptyTitle: 'هێشتا هیچ کاڵایەک نییە',
    emptyReadOnlyBody: 'داوا لە بەڕێوەبەر یان خاوەن بکە کاڵا زیاد بکات بۆ لیستەکە.',
    emptyManagerBody: 'یەکەم کاڵا زیاد بکە لەگەڵ نرخی فرۆشتن، نرخی کڕین، بڕ و باڕکۆد.',
    addFirstProduct: 'زیادکردنی یەکەم کاڵا',
    noMatchesTitle: 'هیچ کاڵایەک نەدۆزرایەوە',
    noMatchesBody: 'هەوڵ بدە گەڕانەکە بسڕیتەوە یان فلتەری پۆل و کۆگا بگۆڕیت.',
    clearFilters: 'لابردنی فلتەرەکان',
    colPhoto: 'وێنە',
    colProduct: 'کاڵا',
    colBarcode: 'باڕکۆد',
    colSellingPrice: 'نرخی فرۆشتن',
    colCostPrice: 'نرخی کڕین',
    colStock: 'لە کۆگادا',
    colActions: 'کردارەکان',
    outOfStock: 'لە کۆگادا نەماوە',
    lowStock: 'کەمبوونەوەی کۆگا',
    outShort: 'نەماوە',
    lowShort: 'کەمە',
    printLabelAria: 'چاپکردنی باڕکۆدی {name}',
    printLabelTooltip: 'چاپکردنی لەیبڵی باڕکۆد',
    labelButton: 'باڕکۆد',
    editButton: 'دەستکاری',
    editAria: 'دەستکاری {name}',
    inStockSuffix: 'لە کۆگادا',
    costPrefix: 'کڕین:',
  },
  productForm: {
    editTitle: 'دەستکاری کاڵا',
    addTitle: 'زیادکردنی کاڵا',
    archivedBadge: 'ئەرشیفکراو',
    printLabel: 'چاپکردنی باڕکۆد',
    closeFormAria: 'داخستنی فۆرمی کاڵا',
    productName: 'ناوی کاڵا',
    productNamePlaceholder: 'نموونە: شەمەندەفەری دارین',
    barcode: 'باڕکۆد',
    barcodePlaceholder: 'باڕکۆد لێبدە یان دروستی بکە',
    generateBarcode: 'دروستکردنی باڕکۆد',
    sellingPrice: 'نرخی فرۆشتن',
    costPrice: 'نرخی کڕین',
    quantityInStock: 'بڕ لە کۆگادا',
    reorderLevel: 'ئاستی ئاگادارکردنەوە',
    optionalPlaceholder: 'ئارەزوومەندانە',
    category: 'پۆل',
    categoryPlaceholder: 'پۆل بنووسە یان هەڵبژێرە',
    toggleCategoriesAria: 'پیشاندانی پێشنیاری پۆلەکان',
    useNewCategory: 'بەکارهێنانی «{value}»',
    photos: 'وێنەکان',
    photosHint: 'وێنەی بچووککراوە ~800px JPEG · {count}/{max} وێنە',
    compressingPhotos: 'بچووککردنەوە و ئامادەکردنی وێنەکان...',
    dragDropPhotos: 'وێنەی کاڵا ڕاکێشە و لێرە دایبنێ',
    selectMultipleHint: 'دەتوانیت چەند وێنەیەک بەیەکەوە هەڵبژێریت',
    chooseFiles: 'هەڵبژاردنی فایل',
    mainBadge: 'سەرەکی',
    makeMainPhoto: 'بیکە وێنەی سەرەکی',
    setMainAria: 'دانانی وێنەی {index} وەک سەرەکی',
    removePhoto: 'سڕینەوەی وێنە',
    removePhotoAria: 'سڕینەوەی وێنەی {index}',
    photoAlt: 'وێنەی کاڵا {index}',
    photoFallbackLabel: 'وێنە {index}',
    maxPhotosReached: 'زۆرترین ڕێژەی {max} وێنە بۆ ئەم کاڵایە گەیشتووە.',
    inlineLimitError: 'پاشەکەوتکردنی ناوخۆیی سنووردارە بە {max} وێنە بۆ هەر کاڵایەک.',
    skippedPhotos: '{added} وێنە زیادکرا. {skipped} تێپەڕێندرا بەهۆی سنووری {max} وێنە.',
    moreDetails: 'وردەکاری زیاتر',
    filledCount: '({count} پڕکراوەتەوە)',
    brand: 'براند',
    brandPlaceholder: 'نموونە: LEGO، Mattel',
    ageRange: 'تەمەنی گونجاو',
    ageRangePlaceholder: 'نموونە: 3-6 ساڵ',
    supplier: 'دابینکەر',
    supplierPlaceholder: 'ناوی دابینکەر یان کۆمپانیا',
    variantLabel: 'جۆر / قەبارە',
    variantPlaceholder: 'نموونە: شین، پاکەتی گەورە',
    notes: 'تێبینییەکان',
    notesPlaceholder: 'تێبینی پاتری، شوێنی ڕەفە، یان زانیاری تر...',
    restoreActive: 'گەڕاندنەوە بۆ چالاک',
    archiveProduct: 'ئەرشیفکردنی کاڵا',
    saveChanges: 'پاشەکەوتکردنی گۆڕانکاری',
    saveProduct: 'پاشەکەوتکردنی کاڵا',
    archiveConfirmTitle: 'ئەم کاڵایە ئەرشیف بکرێت؟',
    archiveConfirmDesc:
      '«{name}» لە لیستی چالاک و شاشەی فرۆشتن دەشاردرێتەوە. تۆمارەکانی فرۆشتن و کۆگا وەک خۆیان دەمێننەوە و دەتوانیت هەر کاتێک لە ئەرشیفکراوەکان بیگەڕێنیتەوە.',
    archiveConfirmBtn: 'ئەرشیفکردن',
    keepActiveBtn: 'هێشتنەوە بە چالاک',
    thisProductFallback: 'ئەم کاڵایە',
  },
  barcodeModal: {
    title: 'چاپکردنی باڕکۆد',
    subtitle: 'گونجاو بۆ چاپی باڕکۆدی تێرمەڵ و لاپەڕەی A4',
    closeAria: 'داخستنی پێشبینینی باڕکۆد',
    labelSize: 'قەبارەی لەیبڵ',
    standardSize: 'ئاسایی (50×30mm)',
    largeSize: 'گەورە (70×40mm)',
    printLabel: 'چاپکردن',
  },
  sell: {
    title: 'فرۆشتن',
    subtitle: 'سندوقی فرۆشتن · ئامادەی باڕکۆد و کیبۆرد',
    kbdConfirm: 'جێگیرکردنی نرخ',
    kbdComplete: 'تەواوکردنی فرۆشتن',
    kbdClear: 'سڕینەوە',
    posTab: 'کاشێر',
    historyTab: 'تۆمار و ئەمڕۆ',
    scanPlaceholder: 'باڕکۆد لێبدە یان ناوی کاڵا بنووسە...',
    scanAria: 'باڕکۆد لێبدە یان بە ناو بگەڕێ',
    clearSearchTextAria: 'سڕینەوەی دەقی گەڕان',
    noProductsMatch: 'هیچ کاڵایەکی چالاک لەگەڵ «{query}» ناگونجێت.',
    saleCompleted: 'فرۆشتن تەواو بوو',
    printReceipt: 'چاپکردنی وەسڵ',
    dismissNoticeAria: 'داخستنی ئاگادارکردنەوەی فرۆشتن',
    quickTapTitle: 'کاڵا خێراکان',
    viewInCart: 'بینینی {count} لە سەبەتەدا',
    noActiveToys: 'هیچ کاڵایەکی چالاک نییە',
    addProductsHint: 'لە بەشی کاڵاکان کاڵا زیاد بکە بۆ دەستپێکردنی فرۆشتن.',
    leftSuffix: 'ماوە',
    readyTitle: 'ئامادەیە بۆ کڕیاری داهاتوو',
    readySubtitle:
      'باڕکۆدی کاڵا بە سکانەرەکە لێبدە یان ناوی بنووسە بۆ دەستپێکردنی فرۆشتن. دووبارە لێدانی باڕکۆد بڕەکەی زیاد دەکات.',
    colItem: 'کاڵا',
    colQty: 'بڕ',
    colUnitPrice: 'نرخی دانە',
    colLineTotal: 'کۆی گشتی',
    colRemove: 'لابردن',
    listPrefix: 'لیست',
    belowMinCost: 'لە خوار کەمترین نرخەوەیە',
    belowCost: 'لە خوار نرخی کڕینەوەیە ({cost})',
    exceedsStock: 'لە بڕی کۆگا زیاترە',
    goesToPrefix: 'دەبێتە {qty}',
    decreaseQtyAria: 'کەمکردنەوەی بڕی {name}',
    qtyForAria: 'بڕی {name}',
    increaseQtyAria: 'زیادکردنی بڕی {name}',
    unitPriceForAria: 'نرخی دانە بۆ {name}',
    removeFromSaleAria: 'لابردنی {name} لە فرۆشتن',
    clearConfirmTitle: 'فرۆشتنی ئێستا بسڕدرێتەوە؟',
    clearConfirmDesc: 'ئەمە هەموو {count} دانە و تێبینییەکە دەسڕێتەوە.',
    keepEditingEsc: 'مانەوە (Esc)',
    clearSaleBtn: 'سڕینەوەی فرۆشتن',
    belowCostCountLabel: '{count} کاڵا لە خوار نرخی کڕینەوە دانراوە',
    exceedsStockCountLabel: '{count} کاڵا لە بڕی کۆگا زیاترە (کۆگا دەبێتە سالب)',
    saleAllowedSuffix: '. فرۆشتن هێشتا ڕێگەپێدراوە.',
    paymentMethod: 'شێوازی پارەدان',
    mobilePaymentMethodAria: 'شێوازی پارەدانی مۆبایل',
    saleNote: 'تێبینی فرۆشتن (ئارەزوومەندانە)',
    saleNotePlaceholder: 'نموونە: دیاری، ژمارەی مۆبایل...',
    totalLabel: 'کۆی گشتی',
    clearEsc: 'سڕینەوە (Esc)',
    completeSaleShortcut: 'تەواوکردنی فرۆشتن (Ctrl+Enter)',
    savingSale: 'تۆمارکردنی فرۆشتن...',
    inCartSuffix: 'لە سەبەتەدا',
    checkout: 'تەواوکردن',
    todayTotal: 'کۆی فرۆشتنی ئەمڕۆ',
    cash: 'کاش',
    digital: 'FIB / دیجیتاڵ',
    salesToday: 'فرۆشتنەکانی ئەمڕۆ',
    voidedExcluded: 'هەڵوەشاوەکان لادراون',
    todayNotedSales: 'فرۆشتنە تێبینیدارەکانی ئەمڕۆ',
    noNotedSalesToday: 'ئەمڕۆ هیچ فرۆشتنێک تێبینی نەبووە.',
    salesHistory: 'مێژووی فرۆشتنەکان',
    filterDateAria: 'فلتەرکردنی فرۆشتن بەپێی بەروار',
    showAllDatesAria: 'پیشاندانی هەموو بەروارەکان',
    loadSalesError: 'نەتوانرا مێژووی فرۆشتن باربکرێت:',
    loadingSalesAria: 'بارکردنی مێژووی فرۆشتن',
    noSalesTitle: 'هێشتا هیچ فرۆشتنێک تۆمار نەکراوە',
    noSalesOnDateTitle: 'هیچ فرۆشتنێک لەم بەروارەدا نییە',
    noSalesEmptyHint: 'فرۆشتنە تەواوبووەکان لێرە دەردەکەون بۆ چاپکردنی وەسڵ و هەڵوەشاندنەوە.',
    noSalesDateHint: 'فلتەری بەروار لاببە بۆ بینینی فرۆشتنی ڕۆژەکانی تر.',
    moreSuffix: '+{count} هی تر',
    voidedBadge: 'هەڵوەشاوە',
    mobileCartTitle: 'فرۆشتنی ئێستا',
    mobileCartSubtitle: 'دەستکاری بڕ یان نرخ بکە',
    closeCartAria: 'داخستنی سەبەتە',
    emptyCartText: 'سەبەتە بەتاڵە. دەست بنێ بە کاڵایەکدا بۆ زیادکردن.',
    clearShort: 'سڕینەوە',
    keepShort: 'هێشتنەوە',
    clearThisSale: 'سڕینەوەی ئەم فرۆشتنە؟',
    completeSale: 'تەواوکردنی فرۆشتن',
    savingShort: 'تۆمار دەکرێت...',
    grandTotal: 'کۆی گشتی',
    archivedProductWarning: '«{name}» ئەرشیف کراوە. پێش فرۆشتن لە بەشی کاڵاکان چالاکی بکەرەوە.',
    noActiveBarcodeMatch: 'هیچ کاڵایەکی چالاک بە «{query}» نەدۆزرایەوە.',
    saleFallbackTitle: 'فرۆشتن',
    currentCashSaleAria: 'فرۆشتنی ئێستا',
    todaySummaryAria: 'کورتەی ئەمڕۆ و مێژووی فرۆشتن',
    mobileCartAria: 'سەبەتە و تەواوکردنی فرۆشتن',
  },
  saleDetails: {
    titlePrefix: 'فرۆشتن',
    voided: 'هەڵوەشاوە',
    completed: 'تەواوبوو',
    voidedPrefix: 'هەڵوەشاوەتەوە',
    closeAria: 'داخستنی وردەکاری فرۆشتن',
    saleNote: 'تێبینی فرۆشتن',
    colItem: 'کاڵا',
    colQty: 'بڕ',
    colListPrice: 'نرخی لیست',
    colSoldAt: 'فرۆشراوە بە',
    colLineTotal: 'کۆی گشتی',
    costPrefix: 'نرخی کڕین:',
    soldBelowCost: '· لە خوار نرخی کڕین فرۆشراوە',
    totalCostAtSale: 'کۆی نرخی کڕین:',
    saleTotal: 'کۆی گشتی فرۆشتن',
    voidConfirmTitle: 'ئەم فرۆشتنە هەڵبوەشێتەوە و بڕەکان بگەڕێنرێتەوە کۆگا؟',
    voidConfirmDesc:
      'ئەم کارە فرۆشتنی #{ref} وەک هەڵوەشاوە تۆمار دەکات و {count} دەگەڕێنێتەوە ناو کۆگا.',
    confirmVoidBtn: 'دڵنیابوونەوە لە هەڵوەشاندنەوە',
    voiding: 'هەڵدەوەشێنرێتەوە...',
    voidSaleBtn: 'هەڵوەشاندنەوەی فرۆشتن',
    printReceipt: 'چاپکردنی وەسڵ',
  },
  receipt: {
    title: 'وەسڵی چاپکردن',
    subtitle: 'گونجاو بۆ پرینتەری 80mm و ئاسایی',
    closeAria: 'داخستنی پێشبینینی وەسڵ',
    receiptNoPrefix: 'وەسڵ',
    voidedSale: 'فرۆشتنی هەڵوەشاوە',
    items: 'دانەکان',
    total: 'کۆی گشتی',
    payment: 'شێوازی پارەدان',
    defaultFooter: 'سوپاس بۆ سەردانکردنی {shopName}!',
    printReceipt: 'چاپکردنی وەسڵ',
  },
  stock: {
    title: 'کۆگا',
    movementsLogged: 'جووڵە تۆمارکراوە',
    adjustmentAria: 'ڕێکخستنی کۆگا',
    addStock: 'زیادکردنی کۆگا',
    removeStock: 'کەمکردنەوەی کۆگا',
    stockAfterUpdate: 'بڕی کۆگا دوای گۆڕانکاری:',
    productLabel: 'کاڵا',
    changeBtn: 'گۆڕین',
    changeProductAria: 'گۆڕینی کاڵای هەڵبژێردراو',
    pickerPlaceholder: 'ناوی کاڵا بنووسە یان باڕکۆد لێبدە + Enter...',
    noMatchingProducts: 'هیچ کاڵایەک لەگەڵ «{query}» ناگونجێت.',
    noActiveMatch: 'هیچ کاڵایەکی چالاک بە «{query}» نەدۆزرایەوە.',
    quantity: 'بڕ',
    newCost: 'نرخی کڕینی نوێ',
    reason: 'هۆکار',
    note: 'تێبینی',
    addNotePlaceholder: 'تێبینی پسووڵە یان بار...',
    removeNotePlaceholder: 'تێبینی ئارەزوومەندانە (نموونە: لە نمایشدا شکاوە)...',
    recordStockIn: 'تۆمارکردنی هاتنەژوورەوە',
    recordStockOut: 'تۆمارکردنی دەرچوون',
    stockHistory: 'مێژووی کۆگا',
    filterByProductAria: 'فلتەرکردنی مێژوو بەپێی کاڵا',
    filterByTypeAria: 'فلتەرکردنی مێژوو بەپێی جۆر',
    allProducts: 'هەموو کاڵاکان',
    allTypes: 'هەموو جۆرەکان',
    typeAddedPlus: 'زیادکرا (+)',
    typeRemovedMinus: 'کەمکرا (-)',
    typeSaleMinus: 'فرۆشتن (-)',
    typeVoidPlus: 'فرۆشتنی هەڵوەشاوە (+)',
    from: 'لە',
    to: 'بۆ',
    fromDateAria: 'لە بەرواری',
    toDateAria: 'بۆ بەرواری',
    loadError: 'نەتوانرا جووڵەکانی کۆگا باربکرێن:',
    loadingAria: 'بارکردنی مێژووی کۆگا',
    emptyTitle: 'هێشتا هیچ جووڵەیەکی کۆگا نییە',
    noFilterMatchesTitle: 'هیچ جووڵەیەک لەگەڵ فلتەرەکان ناگونجێت',
    emptyHint: 'هەر زیادکردن یان کەمکردنەوەیەکی کۆگا لێرە لەگەڵ بەروار و هۆکار دەردەکەوێت.',
    filterHint: 'هەوڵ بدە فلتەرەکانی کاڵا، جۆر یان بەروار بگۆڕیت.',
    colDateTime: 'بەروار و کات',
    colProduct: 'کاڵا',
    colType: 'جۆر',
    colReason: 'هۆکار',
    colChange: 'گۆڕانکاری',
    colCostPrice: 'نرخی کڕین',
    colNote: 'تێبینی',
    typeSale: 'فرۆشتن',
    typeVoid: 'فرۆشتنی هەڵوەشاوە',
    typeAdded: 'زیادکرا',
    typeRemoved: 'کەمکرا',
    costPrefix: 'کڕین',
    newStockLabel: 'کۆگای نوێ:',
  },
  reports: {
    title: 'ڕاپۆرتەکان',
    periodTypeAria: 'جۆری ماوەی ڕاپۆرت',
    weekly: 'هەفتانە',
    monthly: 'مانگانە',
    previousWeek: 'هەفتەی پێشوو',
    nextWeek: 'هەفتەی داهاتوو',
    previousMonth: 'مانگی پێشوو',
    nextMonth: 'مانگی داهاتوو',
    thisWeek: 'ئەم هەفتەیە',
    thisMonth: 'ئەم مانگە',
    weekStarts: 'سەرەتای هەفتە',
    weekStartsAria: 'هەفتە دەستپێدەکات لە',
    exportCsv: 'هەناردەکردنی CSV',
    printReport: 'چاپکردنی ڕاپۆرت',
    loadError: 'نەتوانرا زانیاری ڕاپۆرت باربکرێت:',
    loadingAria: 'بارکردنی ڕاپۆرتەکان',
    weeklyReportSuffix: 'ڕاپۆرتی هەفتانە',
    monthlyReportSuffix: 'ڕاپۆرتی مانگانە',
    periodPrefix: 'ماوە:',
    weekStartingPrefix: 'دەستپێکی هەفتە:',
    comparedAgainstPrefix: 'بەراورد بە:',
    printedPrefix: 'چاپکراوە:',
    completedSalesContext: 'فرۆشتنە تەواوبووەکان (بێ هەڵوەشاوەکان) · بەراورد بە',
    comparedAgainst: 'بەراورد بە',
    weekStartsOn: 'سەرەتای هەفتە',
    metricsAria: 'پێوەرەکانی کارکردن',
    totalSales: 'کۆی فرۆشتن',
    cashSalesCount: 'فرۆشتنی کاش',
    fibDigitalCount: 'FIB / دیجیتاڵ',
    grossProfit: 'قازانجی گشتی',
    marginSuffix: 'ڕێژەی قازانج',
    averageSaleValue: 'تێکڕای نرخی فرۆشتن',
    numberOfSales: 'ژمارەی فرۆشتنەکان',
    itemsSold: 'دانە فرۆشراوەکان',
    totalDiscountGiven: 'داشکاندن',
    vsPrev: 'بەرامبەر پێشوو:',
    vs: 'بەرامبەر',
    salesPerDay: 'فرۆشتن بۆ هەر ڕۆژێک',
    activeSellingDays: '{count} ڕۆژی چالاکی فرۆشتن لەم ماوەیەدا',
    peakDay: 'باشترین ڕۆژ:',
    profitPrefix: 'قازانج',
    noSalesInPeriod: 'هیچ فرۆشتنێک لەم ماوەیەدا نییە',
    chartAria: 'هێڵکاری فرۆشتنی ڕۆژانە بۆ ماوەی دیاریکراو',
    currentStockValue: 'بەهای کۆگای ئێستا',
    activeToysUnits: 'لە {products} کاڵای چالاک · {units} دانە لە کۆگادا',
    valueAtCost: 'بەهای کڕین',
    valueAtSellingPrice: 'بەهای فرۆشتن',
    potentialRetailMargin: 'قازانجی چاوەڕوانکراو',
    valuationNote: 'کاڵا ئەرشیفکراوەکان و بڕە سالبەکان لە حیساب لادراون.',
    top10Title: '١٠ پڕفرۆشترین کاڵا',
    shownCount: '{count} پیشاندراوە',
    noCompletedSales: 'هیچ فرۆشتنێکی تەواوبوو لەم ماوەیەدا نییە.',
    colRank: '#',
    colProduct: 'کاڵا',
    colQty: 'بڕ',
    colRevenue: 'داهات',
    lowStockTitle: 'لیستی کاڵا کەمبووەکان',
    allAboveReorder: 'هەموو کاڵا چالاکەکان لە سەرووی ئاستی ئاگادارکردنەوەن.',
    colStock: 'کۆگا',
    colReorder: 'ئاستی داواکردنەوە',
    colCostValue: 'بەهای کڕین',
    unsoldTitle: 'لە کۆگادا هەیە بەڵام نەفرۆشراوە',
    allSoldHint: 'هەموو کاڵایەکی ناو کۆگا لەم ماوەیەدا فرۆشتنی هەبووە.',
    colAtCost: 'بە نرخی کڕین',
    colAtSelling: 'بە نرخی فرۆشتن',
    notedSalesTitle: 'فرۆشتنە تێبینیدارەکان لەم ماوەیەدا',
    noNotedSales: 'هیچ فرۆشتنێکی تێبینیدار لەم ماوەیەدا تۆمار نەکراوە.',
    backupAria: 'هەناردەکردنی پاشەکەوتی فرۆشگا',
    backupTitle: 'پاشەکەوتی تەواوی فرۆشگا (CSV)',
    backupSubtitle: 'داگرتنی تەواوی کاڵاکان، مێژووی فرۆشتن و جووڵەی کۆگا بۆ هەڵگرتنی دەرەکی.',
    productsCsv: 'CSV کاڵاکان',
    salesCsv: 'CSV فرۆشتنەکان',
    movementsCsv: 'CSV جووڵەی کۆگا',
  },
  users: {
    title: 'بەکارهێنەران',
    activeLabel: 'چالاک',
    managersLabel: 'بەڕێوەبەر / خاوەن',
    inactiveLabel: 'ناچالاک',
    addUser: 'زیادکردنی بەکارهێنەر',
    searchPlaceholder: 'گەڕان بە ناو یان ئیمەیڵ...',
    searchAria: 'گەڕان بە ناو یان ئیمەیڵ',
    tabAll: 'هەموو',
    tabActive: 'چالاکەکان',
    tabInactive: 'ناچالاکەکان',
    loadError: 'نەتوانرا لیستی بەکارهێنەران باربکرێت:',
    dismissErrorAria: 'لابردنی هەڵە',
    dismissNoticeAria: 'لابردنی ئاگادارکردنەوە',
    loadingAria: 'بارکردنی بەکارهێنەران',
    emptyTitle: 'هێشتا هیچ بەکارهێنەرێک دیاری نەکراوە',
    noMatchTitle: 'هیچ بەکارهێنەرێک نەدۆزرایەوە',
    emptyHint: 'هەژمارێکی گووگڵ زیاد بکە بۆ پێدانی مۆڵەتی فرۆشگا.',
    noMatchHint: 'هەوڵ بدە گەڕانەکە بسڕیتەوە یان فلتەری دۆخ بگۆڕیت.',
    addFirstUser: 'زیادکردنی یەکەم بەکارهێنەر',
    resetFilters: 'لابردنی فلتەرەکان',
    colUser: 'بەکارهێنەر',
    colRole: 'ڕۆڵ',
    colStatus: 'دۆخ',
    colAdded: 'زیادکراوە لە',
    colActions: 'کردارەکان',
    youBadge: '· تۆ',
    active: 'چالاک',
    inactive: 'ناچالاک',
    deactivate: 'ناچالاککردن',
    reactivate: 'چالاککردنەوە',
    cannotChangeOwnRole: 'ناتوانیت ڕۆڵی خۆت بگۆڕیت.',
    revokeAccessTitle: 'ڕاگرتنی مۆڵەتی ئەم بەکارهێنەرە',
    roleForAria: 'ڕۆڵ بۆ {email}',
    mobileRoleForAria: 'ڕۆڵی مۆبایل بۆ {email}',
    addUserTitle: 'زیادکردنی بەکارهێنەر',
    closeAddModalAria: 'داخستنی پەنجەرەی زیادکردنی بەکارهێنەر',
    googleEmail: 'ناونیشانی ئیمەیڵی گووگڵ',
    emailHint: 'بە پیتی بچووک وەک کلیلی ڕێگەپێدان پاشەکەوت دەکرێت.',
    displayName: 'ناوی پیشاندان',
    displayNamePlaceholder: 'نموونە: شاکار',
    role: 'ڕۆڵ',
    adding: 'زیاد دەکرێت...',
    footerNote:
      'بەڕێوەبەر و خاوەن دەسەڵاتی تەواویان هەیە بۆ کاڵاکان، فرۆشتن، کۆگا، ڕاپۆرتەکان، باکاپ، ڕێکخستنەکان و بەکارهێنەران. کاشێر تەنها بەشی فرۆشتن و لیستی کاڵاکان (بەبێ نرخی کڕین و بەهای کۆگا) دەبینێت. کەمکردنەوەی ڕۆڵی خۆت یان ناچالاککردنی دوا بەڕێوەبەر/خاوەنی چالاک ڕێگری لێ دەکرێت.',
    deactivateTitle: 'ئەم بەکارهێنەرە ناچالاک بکرێت؟',
    changeRoleTitle: 'گۆڕینی ڕۆڵ بۆ {role}؟',
    deactivateDesc:
      '{name} ({email}) دەستبەجێ مۆڵەتی چوونەژوورەوە لەدەست دەدات و پەیامی ڕێگەنەدان دەبینێت.',
    demoteCashierDesc:
      '{name} ({email}) دەبێتە کاشێر و تەنها دەستی بە شاشەی فرۆشتن و لیستی کاڵای خوێندنەوە دەگات.',
    demoteOwnerDesc:
      '{name} ({email}) لە بەڕێوەبەرەوە دەگۆڕدرێت بۆ خاوەن لەگەڵ هێشتنەوەی هەموو دەسەڵاتەکانی بەڕێوەبردن.',
    deactivateConfirm: 'ناچالاککردنی بەکارهێنەر',
    changeRoleConfirm: 'گۆڕین بۆ {role}',
    updatedRoleNotice: '{name} گۆڕدرا بۆ {role}.',
    reactivatedNotice: '{name} چالاک کرایەوە.',
    deactivatedNotice: '{name} ناچالاک کرا.',
  },
  settings: {
    title: 'ڕێکخستنەکانی فرۆشگا و باکاپ',
    closeAria: 'داخستنی ڕێکخستنەکانی فرۆشگا',
    storeLogoLabel: 'لۆگۆی فرۆشگا (PNG)',
    storeLogoHint: 'بە قەبارەی 36×36px لە چوونەژوورەوە، سەرپەڕە، لاپەڕە و وەسڵ دەردەکەوێت',
    resetLogo: 'سڕینەوە',
    uploadLogoAria: 'بارکردنی وێنەی لۆگۆی فرۆشگا',
    processingLogo: 'ئامادە دەکرێت...',
    uploadPng: 'بارکردنی PNG',
    logoUrlPlaceholder: '/logo.png یان https://...',
    logoUrlUploadedPlaceholder: 'PNG بارکراوە (یان بەستەر دابنێ بۆ گۆڕینی)',
    logoUrlAria: 'بەستەری وێنەی لۆگۆی فرۆشگا',
    storeName: 'ناوی فرۆشگا',
    storeNamePlaceholder: 'نموونە: Little Wonders',
    storeNameHint: 'لە شاشەی چوونەژوورەوە، مێنیو، لەیبڵی باڕکۆد، وەسڵ و ڕاپۆرتەکاندا دەردەکەوێت.',
    storeSubtitle: 'ژێرنووس / دروشمی فرۆشگا',
    storeSubtitlePlaceholder: 'نموونە: سیستەمی کۆگا و فرۆشتن',
    receiptFooter: 'دەقی ژێر وەسڵ / ژمارە تەلەفۆن',
    receiptFooterPlaceholder: 'نموونە: ژ.م: 0750 123 4567 · سوپاس بۆ کڕینەکەت!',
    currency: 'دراو',
    weekStartsOn: 'سەرەتای هەفتە',
    language: 'زمانی سیستەم',
    backupTitle: 'پاشەکەوتی تەواوی فرۆشگا (CSV)',
    backupHint: 'داگرتنی هەموو تۆمارەکان بۆ هەڵگرتن یان پێداچوونەوە لە ئێکسڵ.',
    productsBtn: 'کاڵاکان',
    salesBtn: 'فرۆشتنەکان',
    movementsBtn: 'جووڵەی کۆگا',
    saveSettings: 'پاشەکەوتکردنی ڕێکخستنەکان',
    errorNameRequired: 'ناوی فرۆشگا پێویستە.',
    errorLogoInvalid: 'بەستەری لۆگۆ دەبێت بە https:// یان http:// یان /logo.png دەست پێ بکات یان فایل بێت.',
    errorImageType: 'تکایە فایلی وێنەی PNG یان وێنەی تر هەڵبژێرە بۆ لۆگۆ.',
    errorLogoProcess: 'نەتوانرا وێنەی لۆگۆ ئامادە بکرێت.',
    errorSaveFailed: 'نەتوانرا ڕێکخستنەکان پاشەکەوت بکرێن.',
  },
  validation: {
    productNameRequired: 'ناوی کاڵا پێویستە.',
    productNameMax: 'ناوی کاڵا دەبێت ١٦٠ پیت یان کەمتر بێت.',
    barcodeMax: 'باڕکۆد دەبێت ٦٤ پیت یان کەمتر بێت.',
    barcodeDuplicate: 'باڕکۆدی "{barcode}" پێشتر بۆ "{name}" بەکارهاتووە.',
    categoryMax: 'پۆل دەبێت ٨٠ پیت یان کەمتر بێت.',
    sellingPriceInvalid: 'نرخی فرۆشتنی دروست بنووسە (٠ یان زیاتر).',
    sellingPriceTooLarge: 'نرخی فرۆشتن زۆر گەورەیە.',
    costPriceInvalid: 'نرخی کڕینی دروست بنووسە (٠ یان زیاتر).',
    costPriceTooLarge: 'نرخی کڕین زۆر گەورەیە.',
    stockQtyInvalid: 'ژمارەیەکی تەواو بنووسە (٠ یان زیاتر).',
    stockQtyTooLarge: 'بڕی کۆگا زۆر گەورەیە.',
    reorderLevelInvalid: 'ئاستی ئاگادارکردنەوە دەبێت ژمارەی تەواو بێت (٠ یان زیاتر).',
    reorderLevelTooLarge: 'ئاستی ئاگادارکردنەوە زۆر گەورەیە.',
    brandMax: 'براند دەبێت ٨٠ پیت یان کەمتر بێت.',
    ageRangeMax: 'تەمەن دەبێت ٤٠ پیت یان کەمتر بێت.',
    supplierMax: 'دابینکەر دەبێت ١٠٠ پیت یان کەمتر بێت.',
    variantMax: 'جۆر/قەبارە دەبێت ٦٠ پیت یان کەمتر بێت.',
    notesMax: 'تێبینی دەبێت ١٠٠٠ پیت یان کەمتر بێت.',
    photosMax: 'زۆرترین ڕێژە ٨ وێنەیە بۆ هەر کاڵایەک.',
    stockProductRequired: 'کاڵایەک هەڵبژێرە بە گەڕان یان لێدانی باڕکۆد.',
    stockQtyInvalidWhole: 'ژمارەیەکی تەواوی ١ یان زیاتر بنووسە.',
    stockRemoveExceeds: 'ناتوانرێت {requested} کەم بکرێتەوە؛ تەنها {available} لە کۆگادا هەیە.',
    stockReasonInvalid: 'هۆکارێکی دروست هەڵبژێرە.',
    stockCostInvalid: 'نرخی کڕینی دروست بنووسە (٠ یان زیاتر).',
    stockCostTooLarge: 'نرخی کڕین زۆر گەورەیە.',
    stockNoteMax: 'تێبینی دەبێت ٥٠٠ پیت یان کەمتر بێت.',
    emailRequired: 'ئیمەیڵی گووگڵ پێویستە.',
    emailInvalid: 'ئیمەیڵێکی دروست بنووسە (بۆ نموونە: name@gmail.com).',
    emailDuplicate: 'بەکارهێنەرێک بەم ئیمەیڵە پێشتر هەیە.',
    userNameRequired: 'ناو پێویستە.',
    userNameMax: 'ناو دەبێت ٨٠ پیت یان کەمتر بێت.',
    userRoleInvalid: 'بەڕێوەبەر، خاوەن، یان کاشێر هەڵبژێرە.',
    cannotDemoteSelfCashier: 'ناتوانیت ڕۆڵی خۆت بگۆڕیت بۆ کاشێر.',
    cannotRemoveOwnAdmin: 'ناتوانیت دەسەڵاتی بەڕێوەبەری خۆت لاببەیت.',
    askAnotherAdmin: 'داوا لە بەڕێوەبەرێکی تر بکە ڕۆڵەکەت بگۆڕێت.',
    lastActiveManagerRole: 'پێویستە لانیکەم یەک بەڕێوەبەر یان خاوەنی چالاک بمێنێتەوە.',
    lastActiveAdminRole: 'پێویستە لانیکەم یەک بەڕێوەبەری چالاک بمێنێتەوە.',
    cannotDeactivateSelf: 'ناتوانیت هەژماری خۆت ناچالاک بکەیت.',
    lastActiveManagerDeactivate: 'ناتوانرێت دوا بەڕێوەبەر یان خاوەنی چالاک ناچالاک بکرێت.',
    onlyManagersSettings: 'تەنها بەڕێوەبەر یان خاوەن دەتوانن ڕێکخستنەکانی فرۆشگا بگۆڕن.',
    onlyManagersAddUsers: 'تەنها بەڕێوەبەر یان خاوەن دەتوانن بەکارهێنەر زیاد بکەن.',
    onlyManagersUpdateUsers: 'تەنها بەڕێوەبەر یان خاوەن دەتوانن مۆڵەتی بەکارهێنەر بگۆڕن.',
  },
};

export function getTranslations(lang: AppLanguage): TranslationDictionary {
  return lang === 'ku' ? KU_DICTIONARY : EN_DICTIONARY;
}

export function interpolate(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`
  );
}

export function getRoleLabelLocalized(role: UserRole, lang: AppLanguage): string {
  const dict = getTranslations(lang);
  return dict.roles[role] ?? dict.roles.cashier;
}

export function getPaymentLabelLocalized(
  method: PaymentMethod | string | undefined | null,
  lang: AppLanguage
): string {
  const dict = getTranslations(lang);
  if (method === 'fib') return dict.payments.fib;
  if (method === 'card') return dict.payments.card;
  return dict.payments.cash;
}

export function getCurrencyUnitLocalized(currency: string, lang: AppLanguage): string {
  const clean = currency.trim().toUpperCase() || 'IQD';
  if (lang === 'ku' && clean === 'IQD') return 'د.ع';
  return clean;
}

export function formatCurrencyLocalized(
  amount: number,
  currency = 'IQD',
  lang: AppLanguage = 'en'
): string {
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
  const unit = getCurrencyUnitLocalized(cleanCurrency, lang);
  return `${formattedNumber} ${unit}`;
}

export function getWeekdayLabelLocalized(day: number, lang: AppLanguage): string {
  const safe = ((Math.trunc(day) % 7) + 7) % 7 as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  return getTranslations(lang).weekdays[safe];
}

export function getWeekdayOptionsLocalized(
  lang: AppLanguage
): { value: number; label: string }[] {
  const order = [6, 0, 1, 2, 3, 4, 5] as const;
  const weekdays = getTranslations(lang).weekdays;
  return order.map((day) => ({ value: day, label: weekdays[day] }));
}

export function getStockReasonLocalized(
  reason: StockMovementReason | string,
  lang: AppLanguage
): string {
  const map = getTranslations(lang).stockReasons as Record<string, string>;
  return map[reason] ?? reason;
}

export function getMovementTypeLocalized(type: StockMovementType, lang: AppLanguage): string {
  const stockDict = getTranslations(lang).stock;
  if (type === 'sale') return stockDict.typeSale;
  if (type === 'void') return stockDict.typeVoid;
  if (type === 'add') return stockDict.typeAdded;
  return stockDict.typeRemoved;
}
