import test from 'node:test';
import assert from 'node:assert/strict';
import type { AppUser } from '../types/inventory';
import {
  canModifyUserRole,
  canToggleUserActive,
  countActiveAdmins,
  isAuthorizedUserRecord,
  isBootstrapAdminEmail,
  normalizeEmail,
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
