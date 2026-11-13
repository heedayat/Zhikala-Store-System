# Security Specification & Payload-First Audit

## 1. Data Invariants
1. **Allowlisted Multi-Role RBAC (`users` collection)**: Every read and write across all collections requires a signed-in Google user with `request.auth.token.email_verified == true` whose lowercase email document exists at `/users/{email}` with `active == true` and `role in ['admin', 'owner', 'cashier']` (plus the verified bootstrapped root admin `gamerhidayatgamer@gmail.com` so initial setup can never lock out the store).
2. **Admin & Owner Management vs Cashier Restrictions**:
   - Active `admin` and `owner` users (`isManager()`) have full access to `products`, `stockMovements`, `sales`, `settings`, and `users`.
   - Active `cashier` users can ONLY read `products`, `settings`, `sales`, and their own `/users/{email}` record, create/void counter `sales`, and perform atomic POS `quantityInStock` + `'sale'/'void'` `stockMovements` updates. Cashiers CANNOT read `stockMovements`, list/write `users`, create/edit `products` catalog fields/costs, or modify `settings`.
   - Anti-Lockout: Users cannot be deleted (`allow delete: if false`). Neither Admin nor Owner can remove their own management access, escalate their own role, or deactivate themselves.
3. **Whole-Number Quantities & Non-Negative Prices**: `products.quantityInStock`, `products.reorderLevel`, `stockMovements.quantityChange`, `sales.itemCount`, and `sales.items[*].quantity` must be integers (`is int`). All prices and totals must be `>= 0`. `sales.paymentMethod` must be in `['cash', 'fib', 'card']`. `settings.currency` must be in `['IQD', 'USD']`.
4. **No Hard Deletes & Immutable Audit Trails**: `products`, `stockMovements`, `sales`, `settings`, and `users` enforce `allow delete: if false`. `stockMovements` enforces `allow update: if false`.
5. **Transactional Stock Atomicity**: Every `stockMovements` creation (`add`, `remove`, `sale`, `void`) must happen in the same Firestore transaction as the referenced `products/{productId}` update/creation so `quantityInStock` stays synchronized.
6. **Terminal State Locking on Sales**: `sales` documents can only transition once from `completed` to `voided` (`status`, `voidedAt`, `updatedAt`) with reversal `void` movements.

## 2. The "Dirty Dozen" Attack Payloads
1. **Unauthenticated Read/Write**: `request.auth == null` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoofing**: `email_verified: false` with an allowlisted email -> `PERMISSION_DENIED`.
3. **Unknown Google Account**: verified user not in `/users/{email}` -> `PERMISSION_DENIED`.
4. **Inactive User Read/Write**: verified user in `/users/{email}` with `active: false` -> `PERMISSION_DENIED`.
5. **Cashier Escalating Privilege or Reading Users/StockMovements/Settings Write**: `role: 'cashier'` reading `list /users`, reading `/stockMovements`, editing `products.costPrice`, or writing `/settings/shop` -> `PERMISSION_DENIED`.
6. **Admin/Owner Self-Demotion, Self-Escalation, or Self-Deactivation**: admin/owner changing own `role` or setting own `active: false` -> `PERMISSION_DENIED`.
7. **Shadow / Ghost Field Injection**: extra field on `users`, `products`, `sales`, `settings`, or `stockMovements` -> `PERMISSION_DENIED`.
8. **Fractional Stock Quantity Poisoning**: `quantityInStock: 2.5` or `quantityChange: 1.5` -> `PERMISSION_DENIED`.
9. **Negative Price or Invalid Payment Method Poisoning**: `sellingPrice: -100`, `totalAmount: -1`, or `paymentMethod: 'crypto'` -> `PERMISSION_DENIED`.
10. **Orphaned / Desynced StockMovement**: creating a `stockMovements` doc without atomically updating `products/{productId}` -> `PERMISSION_DENIED`.
11. **Mutating Completed Sale Items or Re-Voiding**: updating `items`, `totalAmount`, or a `voided` sale -> `PERMISSION_DENIED`.
12. **Client-Spoofed Timestamp / Hard Delete**: `createdAt != request.time` or `deleteDoc` on any collection -> `PERMISSION_DENIED`.
