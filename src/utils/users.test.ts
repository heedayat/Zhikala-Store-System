import test from 'node:test';
import assert from 'node:assert/strict';
import type { AppUser } from '../types/inventory';
import {
  canDeleteUser,
  canModifyUserRole,
  canToggleUserActive,
  countActiveAdmins,
  countActiveManagers,
  countAdmins,
  isAuthorizedUserRecord,
  isBootstrapAdminEmail,
  isManagerRole,
  normalizeEmail,
  resolveRecordedByLabel,
  validateNewUserForm,
} from './users';

const seedUsers: AppUser[] = [
  {
    email: 'gamerhidayatgamer@gmail.com',
    displayName: 'Hidayat',
    role: 'admin',
    active: true,
    createdAt: new Date('2026-11-01T10:00:00Z'),
  },
  {
    email: 'shakarawat007@gmail.com',
    displayName: 'Shakar',
    role: 'owner',
    active: true,
    createdAt: new Date('2026-11-01T10:05:00Z'),
  },
  {
    email: 'former@example.com',
    displayName: 'Former Staff',
    role: 'owner',
    active: false,
    createdAt: new Date('2026-11-02T10:00:00Z'),
  },
];

test('normalizeEmail, isBootstrapAdminEmail, and isAuthorizedUserRecord enforce active status and valid role', () => {
  assert.equal(normalizeEmail('  ShakarAwat007@Gmail.com '), 'shakarawat007@gmail.com');
  assert.equal(isBootstrapAdminEmail(' GamerHidayatGamer@Gmail.com '), true);
  assert.equal(isBootstrapAdminEmail('shakarawat007@gmail.com'), false);
  assert.equal(isAuthorizedUserRecord(seedUsers[0]), true);
  assert.equal(isAuthorizedUserRecord(seedUsers[1]), true);
  assert.equal(isAuthorizedUserRecord(seedUsers[2]), false);
  assert.equal(isAuthorizedUserRecord(null), false);
});

test('validateNewUserForm normalizes email, validates fields, and rejects duplicates', () => {
  const valid = validateNewUserForm(
    { email: '  NewOwner@Gmail.com ', displayName: '  Karim ', role: 'owner' },
    seedUsers
  );
  assert.equal(valid.valid, true);
  if (valid.valid) {
    assert.equal(valid.data.email, 'newowner@gmail.com');
    assert.equal(valid.data.displayName, 'Karim');
    assert.equal(valid.data.role, 'owner');
  }

  const dup = validateNewUserForm(
    { email: 'SHAKARAWAT007@gmail.com', displayName: 'Duplicate', role: 'owner' },
    seedUsers
  );
  assert.equal(dup.valid, false);
  if (!dup.valid) {
    assert.match(dup.errors.email ?? '', /already exists/i);
  }

  const badEmail = validateNewUserForm(
    { email: 'not-an-email', displayName: '', role: 'owner' },
    seedUsers
  );
  assert.equal(badEmail.valid, false);
  if (!badEmail.valid) {
    assert.ok(badEmail.errors.email);
    assert.ok(badEmail.errors.displayName);
  }
});

test('blocks removing own admin access or deactivating self or last active admin', () => {
  assert.equal(countActiveAdmins(seedUsers), 1);

  // Self-demotion blocked
  const selfDemote = canModifyUserRole(
    seedUsers[0],
    'owner',
    'gamerhidayatgamer@gmail.com',
    seedUsers
  );
  assert.equal(selfDemote.allowed, false);

  // Self-deactivation blocked
  const selfDeactivate = canToggleUserActive(
    seedUsers[0],
    false,
    'GAMERHIDAYATGAMER@gmail.com',
    seedUsers
  );
  assert.equal(selfDeactivate.allowed, false);

  // Promoting owner -> admin is allowed
  const promoteOwner = canModifyUserRole(
    seedUsers[1],
    'admin',
    'gamerhidayatgamer@gmail.com',
    seedUsers
  );
  assert.equal(promoteOwner.allowed, true);

  // With a second active admin, another admin CAN be demoted or deactivated
  const withTwoAdmins: AppUser[] = [
    ...seedUsers,
    {
      email: 'secondadmin@gmail.com',
      displayName: 'Second Admin',
      role: 'admin',
      active: true,
    },
  ];
  assert.equal(countActiveAdmins(withTwoAdmins), 2);
  assert.equal(
    canModifyUserRole(withTwoAdmins[3], 'owner', 'gamerhidayatgamer@gmail.com', withTwoAdmins)
      .allowed,
    true
  );
  assert.equal(
    canToggleUserActive(withTwoAdmins[3], false, 'gamerhidayatgamer@gmail.com', withTwoAdmins)
      .allowed,
    true
  );

  // Last active admin protection even if triggered on non-self record in edge state
  const onlyOtherAdmin: AppUser[] = [
    { email: 'other@gmail.com', displayName: 'Other Admin', role: 'admin', active: true },
  ];
  assert.equal(
    canToggleUserActive(onlyOtherAdmin[0], false, 'actor@gmail.com', onlyOtherAdmin).allowed,
    false
  );
  assert.equal(
    canModifyUserRole(onlyOtherAdmin[0], 'owner', 'actor@gmail.com', onlyOtherAdmin).allowed,
    false
  );
});

test('supports cashier role creation, manager role checks, and last Admin/Owner guards', () => {
  const cashierResult = validateNewUserForm(
    { email: '  Cashier1@Gmail.com ', displayName: 'Noor', role: 'cashier' },
    seedUsers
  );
  assert.equal(cashierResult.valid, true);
  if (cashierResult.valid) {
    assert.equal(cashierResult.data.role, 'cashier');
  }

  assert.equal(isManagerRole('admin'), true);
  assert.equal(isManagerRole('owner'), true);
  assert.equal(isManagerRole('cashier'), false);
  assert.equal(
    isAuthorizedUserRecord({ active: true, role: 'cashier' }),
    true
  );

  // Owner cannot self-demote to cashier
  const ownerSelfDemote = canModifyUserRole(
    seedUsers[1],
    'cashier',
    'shakarawat007@gmail.com',
    seedUsers
  );
  assert.equal(ownerSelfDemote.allowed, false);

  // Cannot deactivate or demote to cashier the last active Admin/Owner
  const singleOwnerPlusCashier: AppUser[] = [
    { email: 'owner@shop.com', displayName: 'Sole Owner', role: 'owner', active: true },
    { email: 'cashier@shop.com', displayName: 'Cashier', role: 'cashier', active: true },
  ];
  assert.equal(countActiveManagers(singleOwnerPlusCashier), 1);
  assert.equal(
    canToggleUserActive(singleOwnerPlusCashier[0], false, 'other@shop.com', singleOwnerPlusCashier)
      .allowed,
    false
  );
  assert.equal(
    canModifyUserRole(
      singleOwnerPlusCashier[0],
      'cashier',
      'other@shop.com',
      singleOwnerPlusCashier
    ).allowed,
    false
  );

  // Cashier CAN be deactivated freely
  assert.equal(
    canToggleUserActive(singleOwnerPlusCashier[1], false, 'owner@shop.com', singleOwnerPlusCashier)
      .allowed,
    true
  );
});

test('canDeleteUser enforces self-delete and last remaining Admin/Manager guardrails', () => {
  const staff: AppUser[] = [
    ...seedUsers,
    {
      email: 'cashier@littlewonders.shop',
      displayName: 'Noor',
      role: 'cashier',
      active: true,
    },
  ];

  // Cannot delete own account
  const selfDel = canDeleteUser(staff[0], 'GAMERHIDAYATGAMER@gmail.com', staff);
  assert.equal(selfDel.allowed, false);
  assert.match(selfDel.reason ?? '', /own account/i);

  // Cannot delete the last remaining Admin (even if another owner triggers it)
  assert.equal(countAdmins(staff), 1);
  const lastAdminDel = canDeleteUser(staff[0], 'shakarawat007@gmail.com', staff);
  assert.equal(lastAdminDel.allowed, false);
  assert.match(lastAdminDel.reason ?? '', /last remaining Admin/i);

  // Can delete Owner or Cashier when active Admin remains
  assert.equal(
    canDeleteUser(staff[1], 'gamerhidayatgamer@gmail.com', staff).allowed,
    true
  );
  assert.equal(
    canDeleteUser(staff[3], 'gamerhidayatgamer@gmail.com', staff).allowed,
    true
  );

  // When a second active Admin exists, deleting the second Admin is allowed
  const twoAdmins: AppUser[] = [
    ...staff,
    {
      email: 'admin2@littlewonders.shop',
      displayName: 'Second Admin',
      role: 'admin',
      active: true,
    },
  ];
  assert.equal(
    canDeleteUser(twoAdmins[4], 'gamerhidayatgamer@gmail.com', twoAdmins).allowed,
    true
  );

  // Cannot delete the sole remaining active Admin even if an inactive admin exists
  const oneActiveOneInactiveAdmin: AppUser[] = [
    { email: 'admin1@shop.com', displayName: 'Active Admin', role: 'admin', active: true },
    { email: 'admin2@shop.com', displayName: 'Inactive Admin', role: 'admin', active: false },
    { email: 'owner@shop.com', displayName: 'Owner', role: 'owner', active: true },
  ];
  assert.equal(
    canDeleteUser(oneActiveOneInactiveAdmin[0], 'owner@shop.com', oneActiveOneInactiveAdmin)
      .allowed,
    false
  );

  // Cannot delete the sole active Owner/Manager
  const soleOwner: AppUser[] = [
    { email: 'owner@shop.com', displayName: 'Sole Owner', role: 'owner', active: true },
    { email: 'cashier@shop.com', displayName: 'Cashier', role: 'cashier', active: true },
  ];
  assert.equal(
    canDeleteUser(soleOwner[0], 'actor@shop.com', soleOwner).allowed,
    false
  );
});

test('resolveRecordedByLabel preserves historical staff attribution after permanent deletion and never returns Unknown', () => {
  const activeUsers: AppUser[] = [
    {
      email: 'cashier@littlewonders.shop',
      displayName: 'Noor Live',
      role: 'cashier',
      active: true,
    },
  ];

  // Live user exists -> uses current displayName
  assert.equal(
    resolveRecordedByLabel(
      { recordedByName: 'Noor', recordedByEmail: 'cashier@littlewonders.shop' },
      activeUsers
    ),
    'Noor Live'
  );

  // User permanently deleted from directory -> falls back to saved snapshot name
  assert.equal(
    resolveRecordedByLabel(
      { recordedByName: 'Noor', recordedByEmail: 'cashier@littlewonders.shop' },
      []
    ),
    'Noor'
  );

  // User deleted and only email snapshot saved -> falls back to saved email
  assert.equal(
    resolveRecordedByLabel({ recordedByEmail: 'Noor@LittleWonders.shop' }, []),
    'noor@littlewonders.shop'
  );

  // Legacy record with no attribution -> returns null (never "Unknown")
  assert.equal(resolveRecordedByLabel({}, activeUsers), null);
});

