import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  EN_DICTIONARY,
  KU_DICTIONARY,
  formatCurrencyLocalized,
  getMovementTypeLocalized,
  getPaymentLabelLocalized,
  getRoleLabelLocalized,
  getStockReasonLocalized,
  getTranslations,
  getWeekdayOptionsLocalized,
  interpolate,
  normalizeLanguage,
} from './i18n.ts';
import { validateProductForm } from './productValidation.ts';
import { buildPeriodReport, getWeekStartDayName } from './reports.ts';
import { formatSaleDateTime, formatSaleTime } from './sales.ts';
import { formatMovementDateTime, validateStockAdjustment } from './stockMovements.ts';
import { canModifyUserRole, canToggleUserActive, validateNewUserForm } from './users.ts';

function collectStringLeaves(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      keys.push(fullKey);
    } else if (value && typeof value === 'object') {
      keys.push(...collectStringLeaves(value as Record<string, unknown>, fullKey));
    }
  }
  return keys;
}

describe('i18n dictionary completeness and retail terminology', () => {
  it('has 100% key parity and non-empty translations between EN and KU', () => {
    const enKeys = collectStringLeaves(EN_DICTIONARY as unknown as Record<string, unknown>);
    const kuKeys = collectStringLeaves(KU_DICTIONARY as unknown as Record<string, unknown>);
    assert.deepEqual(kuKeys, enKeys);

    const checkNonEmpty = (obj: Record<string, unknown>, path = '') => {
      for (const [k, v] of Object.entries(obj)) {
        const nextPath = path ? `${path}.${k}` : k;
        if (typeof v === 'string') {
          assert.ok(v.trim().length > 0, `Empty translation string at ${nextPath}`);
        } else if (v && typeof v === 'object') {
          checkNonEmpty(v as Record<string, unknown>, nextPath);
        }
      }
    };
    checkNonEmpty(EN_DICTIONARY as unknown as Record<string, unknown>, 'en');
    checkNonEmpty(KU_DICTIONARY as unknown as Record<string, unknown>, 'ku');
  });

  it('uses exact Sorani Kurdish retail terminology requested', () => {
    const ku = getTranslations('ku');
    assert.equal(ku.nav.products, 'کاڵاکان');
    assert.equal(ku.nav.sell, 'فرۆشتن');
    assert.equal(ku.nav.stock, 'کۆگا');
    assert.equal(ku.nav.reports, 'ڕاپۆرتەکان');
    assert.equal(ku.nav.users, 'بەکارهێنەران');
    assert.equal(ku.nav.signOut, 'چوونەدەرەوە');
    assert.equal(ku.nav.storeSettings, 'ڕێکخستنەکانی فرۆشگا');

    assert.equal(getRoleLabelLocalized('admin', 'ku'), 'بەڕێوەبەر');
    assert.equal(getRoleLabelLocalized('owner', 'ku'), 'خاوەن');
    assert.equal(getRoleLabelLocalized('cashier', 'ku'), 'کاشێر');

    assert.equal(ku.products.colSellingPrice, 'نرخی فرۆشتن');
    assert.equal(ku.products.colCostPrice, 'نرخی کڕین');
    assert.equal(ku.products.lowStock, 'کەمبوونەوەی کۆگا');
    assert.equal(ku.products.outOfStock, 'لە کۆگادا نەماوە');
    assert.equal(ku.products.colBarcode, 'باڕکۆد');
    assert.equal(ku.productForm.category, 'پۆل');
    assert.equal(ku.products.addProduct, 'زیادکردنی کاڵا');
    assert.equal(ku.sell.completeSale, 'تەواوکردنی فرۆشتن');
    assert.equal(ku.sell.totalLabel, 'کۆی گشتی');
    assert.equal(getPaymentLabelLocalized('cash', 'ku'), 'کاش');
    assert.equal(getPaymentLabelLocalized('fib', 'ku'), 'FIB / دیجیتاڵ');
    assert.equal(ku.receipt.printReceipt, 'چاپکردنی وەسڵ');
    assert.equal(ku.reports.grossProfit, 'قازانجی گشتی');
    assert.equal(ku.reports.totalDiscountGiven, 'داشکاندن');
  });

  it('normalizes language codes, interpolates placeholders, and formats localized currency', () => {
    assert.equal(normalizeLanguage('ku'), 'ku');
    assert.equal(normalizeLanguage('en'), 'en');
    assert.equal(normalizeLanguage('fr'), 'en');
    assert.equal(normalizeLanguage(null), 'en');

    assert.equal(interpolate('Hello {name}, {count} left', { name: 'Ari', count: 3 }), 'Hello Ari, 3 left');
    assert.equal(formatCurrencyLocalized(25000, 'IQD', 'en'), '25,000 IQD');
    assert.equal(formatCurrencyLocalized(25000, 'IQD', 'ku'), '25,000 د.ع');
    assert.equal(formatCurrencyLocalized(19.5, 'USD', 'ku'), '$19.50');
  });

  it('formats Kurdish weekdays, stock reasons, dates, and report labels cleanly', () => {
    const kuWeekdays = getWeekdayOptionsLocalized('ku');
    assert.equal(kuWeekdays.length, 7);
    assert.equal(kuWeekdays[0].value, 6);
    assert.equal(getWeekStartDayName(6, 'ku'), 'شەممە');
    assert.equal(getStockReasonLocalized('Damaged', 'ku'), 'تێکچووە / شکاوە');
    assert.equal(getMovementTypeLocalized('sale', 'ku'), 'فرۆشتن');

    const d = new Date(2026, 10, 13, 9, 5, 0);
    assert.equal(formatSaleDateTime(d, 'ku'), '2026-11-13 09:05');
    assert.equal(formatSaleTime(d, 'ku'), '09:05');
    assert.equal(formatMovementDateTime(d, 'ku'), '2026-11-13 09:05');

    const report = buildPeriodReport([], [], {
      periodType: 'weekly',
      periodOffset: 0,
      weekStartDay: 6,
      referenceDate: d,
      lang: 'ku',
    });
    assert.equal(report.dailySeries.length, 7);
    assert.ok(report.period.label.length > 0);
  });

  it('returns localized validation errors for products, stock adjustments, and users', () => {
    const prodRes = validateProductForm(
      {
        name: '',
        barcode: '',
        category: '',
        sellingPrice: '',
        costPrice: '',
        quantityInStock: '',
        reorderLevel: '',
        photos: [],
        brand: '',
        ageRange: '',
        supplier: '',
        variantLabel: '',
        notes: '',
      },
      [],
      null,
      'ku'
    );
    assert.equal(prodRes.valid, false);
    if (!prodRes.valid) {
      assert.equal(prodRes.errors.name, KU_DICTIONARY.validation.productNameRequired);
    }

    const stockRes = validateStockAdjustment(
      {
        type: 'remove',
        product: { id: 'p1', name: 'Train', quantityInStock: 2 },
        quantity: '5',
        costPrice: '',
        reason: 'Damaged',
        note: '',
      },
      'ku'
    );
    assert.equal(stockRes.valid, false);
    if (!stockRes.valid) {
      assert.ok(stockRes.errors.quantity?.includes('5'));
      assert.ok(stockRes.errors.quantity?.includes('2'));
    }

    const userRes = validateNewUserForm({ email: 'bad-email', displayName: '', role: 'cashier' }, [], 'ku');
    assert.equal(userRes.valid, false);
    if (!userRes.valid) {
      assert.equal(userRes.errors.email, KU_DICTIONARY.validation.emailInvalid);
      assert.equal(userRes.errors.displayName, KU_DICTIONARY.validation.userNameRequired);
    }

    const roleGuard = canModifyUserRole(
      { email: 'admin@shop.com', role: 'admin', active: true },
      'cashier',
      'admin@shop.com',
      [{ email: 'admin@shop.com', role: 'admin', active: true }],
      'ku'
    );
    assert.equal(roleGuard.allowed, false);
    assert.equal(roleGuard.reason, KU_DICTIONARY.validation.cannotDemoteSelfCashier);

    const activeGuard = canToggleUserActive(
      { email: 'admin@shop.com', role: 'admin', active: true },
      false,
      'admin@shop.com',
      [{ email: 'admin@shop.com', role: 'admin', active: true }],
      'ku'
    );
    assert.equal(activeGuard.allowed, false);
    assert.equal(activeGuard.reason, KU_DICTIONARY.validation.cannotDeactivateSelf);
  });
});
